#!/bin/bash
# Apply database constraints for concurrency safety

set -e

# Load environment
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

DATABASE_URL="${DATABASE_URL:-postgresql://p2p_user:p2p_password@localhost:5432/p2p_trading}"

echo "Applying database constraints..."
echo "Database: $DATABASE_URL"

# Run the migration SQL
psql "$DATABASE_URL" -f packages/shared/prisma/migrations/add_constraints/migration.sql

echo ""
echo "✅ Database constraints applied successfully!"
echo ""
echo "Constraints added:"
echo "  - offer_blocks_status_check: Validates block status values"
echo "  - orders_status_check: Validates order status values"
echo "  - idx_offer_blocks_reserved_order: Prevents double-claiming of blocks"
echo "  - Version auto-increment triggers on offer_blocks and orders"
