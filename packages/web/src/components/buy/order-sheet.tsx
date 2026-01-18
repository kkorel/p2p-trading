'use client';

import { useState } from 'react';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { BottomSheet, Button, Input, Badge } from '@/components/ui';
import { formatCurrency, formatTime, cn } from '@/lib/utils';
import type { Offer, Order } from '@/lib/api';

type OrderStep = 'quantity' | 'processing' | 'success' | 'error';

interface OrderSheetProps {
  open: boolean;
  onClose: () => void;
  offer: Offer | null;
  providerName: string;
  onConfirm: (quantity: number) => Promise<Order | null>;
}

export function OrderSheet({
  open,
  onClose,
  offer,
  providerName,
  onConfirm,
}: OrderSheetProps) {
  const [step, setStep] = useState<OrderStep>('quantity');
  const [quantity, setQuantity] = useState(offer?.maxQuantity || 10);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPrice = offer ? offer.price.value * quantity : 0;

  const handleConfirm = async () => {
    if (!offer) return;
    
    setStep('processing');
    setError(null);

    try {
      const result = await onConfirm(quantity);
      if (result) {
        setOrder(result);
        setStep('success');
      } else {
        throw new Error('Order failed');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStep('error');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep('quantity');
      setError(null);
      setOrder(null);
    }, 200);
  };

  if (!offer) return null;

  return (
    <BottomSheet open={open} onClose={handleClose} title={step === 'quantity' ? 'Order Summary' : undefined}>
      {step === 'quantity' && (
        <div className="flex flex-col gap-4">
          {/* Provider info */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Provider</span>
            <span className="text-sm font-medium text-[var(--color-text)]">{providerName}</span>
          </div>

          {/* Time */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Delivery Time</span>
            <span className="text-sm font-medium text-[var(--color-text)]">
              {formatTime(offer.timeWindow.start)} - {formatTime(offer.timeWindow.end)}
            </span>
          </div>

          {/* Unit Price */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Price per kWh</span>
            <span className="text-sm font-medium text-[var(--color-text)]">
              {formatCurrency(offer.price.value)}
            </span>
          </div>

          {/* Quantity selector */}
          <div className="py-2">
            <label className="text-sm font-medium text-[var(--color-text)] mb-2 block">
              Quantity (kWh)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 5))}
                className="w-11 h-11 rounded-[12px] border border-[var(--color-border)] flex items-center justify-center text-lg font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
              >
                −
              </button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(offer.maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
                className="text-center font-medium"
                min={1}
                max={offer.maxQuantity}
              />
              <button
                type="button"
                onClick={() => setQuantity(Math.min(offer.maxQuantity, quantity + 5))}
                className="w-11 h-11 rounded-[12px] border border-[var(--color-border)] flex items-center justify-center text-lg font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Max available: {offer.maxQuantity} kWh
            </p>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-4 bg-[var(--color-surface)] rounded-[14px] px-4 -mx-4">
            <span className="text-base font-medium text-[var(--color-text)]">Total</span>
            <span className="text-xl font-semibold text-[var(--color-primary)]">
              {formatCurrency(totalPrice)}
            </span>
          </div>

          {/* Confirm button */}
          <Button fullWidth size="lg" onClick={handleConfirm}>
            Confirm Purchase
          </Button>
        </div>
      )}

      {step === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 text-[var(--color-primary)] animate-spin mb-4" />
          <p className="text-base font-medium text-[var(--color-text)]">Processing Order</p>
          <p className="text-sm text-[var(--color-text-muted)]">This may take a moment...</p>
        </div>
      )}

      {step === 'success' && order && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-[var(--color-success-light)] rounded-full flex items-center justify-center mb-4">
            <Check className="h-8 w-8 text-[var(--color-success)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--color-text)] mb-1">Order Confirmed!</p>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Your energy purchase is now active
          </p>

          <div className="w-full bg-[var(--color-surface)] rounded-[14px] p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">Order ID</span>
              <span className="text-sm font-mono text-[var(--color-text)]">
                {order.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">Quantity</span>
              <span className="text-sm font-medium text-[var(--color-text)]">{quantity} kWh</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-text-muted)]">Total</span>
              <span className="text-sm font-semibold text-[var(--color-success)]">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </div>

          <Button fullWidth variant="secondary" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-[var(--color-danger-light)] rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-[var(--color-danger)]" />
          </div>
          <p className="text-lg font-semibold text-[var(--color-text)] mb-1">Order Failed</p>
          <p className="text-sm text-[var(--color-text-muted)] text-center mb-6 max-w-[280px]">
            {error || 'Something went wrong. Please try again.'}
          </p>

          <div className="flex gap-3 w-full">
            <Button fullWidth variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button fullWidth onClick={() => setStep('quantity')}>
              Try Again
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
