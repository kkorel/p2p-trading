-- Add Database Constraints for Concurrency Safety
-- This migration adds constraints to prevent race conditions at the database level

-- 1. Add check constraint for valid block status values
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'offer_blocks_status_check'
  ) THEN
    ALTER TABLE offer_blocks 
    ADD CONSTRAINT offer_blocks_status_check 
    CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD'));
  END IF;
END $$;

-- 2. Add check constraint for valid order status values  
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('DRAFT', 'PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'));
  END IF;
END $$;

-- 3. Create partial unique index to prevent double-claiming of blocks
-- A block can only be assigned to one order when in RESERVED or SOLD status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_offer_blocks_reserved_order'
  ) THEN
    CREATE UNIQUE INDEX idx_offer_blocks_reserved_order 
    ON offer_blocks (id) 
    WHERE status IN ('RESERVED', 'SOLD') AND order_id IS NOT NULL;
  END IF;
END $$;

-- 4. Create index for faster block status queries
CREATE INDEX IF NOT EXISTS idx_offer_blocks_offer_status 
ON offer_blocks (offer_id, status);

-- 5. Create index for faster order lookups by transaction
CREATE INDEX IF NOT EXISTS idx_orders_transaction_status 
ON orders (transaction_id, status);

-- 6. Add version column default trigger (if not already handled by Prisma)
-- This ensures version is always incremented on update
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply version trigger to offer_blocks
DROP TRIGGER IF EXISTS offer_blocks_version_trigger ON offer_blocks;
CREATE TRIGGER offer_blocks_version_trigger
BEFORE UPDATE ON offer_blocks
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION increment_version();

-- Apply version trigger to orders
DROP TRIGGER IF EXISTS orders_version_trigger ON orders;
CREATE TRIGGER orders_version_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION increment_version();

-- 7. Add comment for documentation
COMMENT ON TABLE offer_blocks IS 'Offer blocks with concurrency-safe claiming. Uses row-level locking and version tracking.';
COMMENT ON COLUMN offer_blocks.version IS 'Optimistic locking version, auto-incremented on each update';
COMMENT ON COLUMN offer_blocks.status IS 'Block status: AVAILABLE (can be claimed), RESERVED (claimed but not confirmed), SOLD (confirmed)';

COMMENT ON TABLE orders IS 'Orders with unique transaction constraint and version tracking.';
COMMENT ON COLUMN orders.version IS 'Optimistic locking version, auto-incremented on each update';
COMMENT ON COLUMN orders.status IS 'Order status: DRAFT, PENDING, ACTIVE, COMPLETED, CANCELLED';
