'use client';

import { Sun, Wind, Droplets, Sparkles, Clock, Zap } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { formatCurrency, formatTime, cn } from '@/lib/utils';
import type { Offer } from '@/lib/api';

const sourceIcons: Record<string, typeof Sun> = {
  SOLAR: Sun,
  WIND: Wind,
  HYDRO: Droplets,
  MIXED: Sparkles,
};

const sourceColors: Record<string, string> = {
  SOLAR: 'bg-amber-50 text-amber-600',
  WIND: 'bg-sky-50 text-sky-600',
  HYDRO: 'bg-blue-50 text-blue-600',
  MIXED: 'bg-purple-50 text-purple-600',
};

interface OfferCardProps {
  offer: Offer;
  providerName: string;
  sourceType: string;
  availableQty: number;
  score?: number;
  isSelected?: boolean;
  onSelect: () => void;
}

export function OfferCard({
  offer,
  providerName,
  sourceType,
  availableQty,
  score,
  isSelected,
  onSelect,
}: OfferCardProps) {
  const Icon = sourceIcons[sourceType] || Sparkles;
  const colorClass = sourceColors[sourceType] || sourceColors.MIXED;

  return (
    <Card
      interactive
      onClick={onSelect}
      className={cn(
        'transition-all duration-[120ms]',
        isSelected && 'ring-2 ring-[var(--color-primary)] border-transparent'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center', colorClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              {providerName}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {availableQty} kWh available
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-base font-semibold text-[var(--color-primary)]">
            {formatCurrency(offer.price.value)}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">per kWh</p>
        </div>
      </div>

      {/* Time window */}
      <div className="flex items-center gap-1.5 mb-3 text-xs text-[var(--color-text-secondary)]">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {offer.timeWindow 
            ? `${formatTime(offer.timeWindow.startTime)} - ${formatTime(offer.timeWindow.endTime)}`
            : 'Flexible timing'
          }
        </span>
      </div>

      {/* Footer badges */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Badge variant="default">{sourceType}</Badge>
          <Badge variant="primary">
            <Zap className="h-3 w-3 mr-0.5" />
            {offer.maxQuantity} kWh
          </Badge>
        </div>

        {score !== undefined && (
          <Badge variant="success">
            {Math.round(score * 100)}% match
          </Badge>
        )}
      </div>
    </Card>
  );
}
