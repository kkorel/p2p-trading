'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search, Sun, Wind, Droplets, Sparkles } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { cn } from '@/lib/utils';

const sourceTypes = [
  { value: '', label: 'Any', icon: Sparkles },
  { value: 'SOLAR', label: 'Solar', icon: Sun },
  { value: 'WIND', label: 'Wind', icon: Wind },
  { value: 'HYDRO', label: 'Hydro', icon: Droplets },
];

type DiscoverFormInput = {
  minQuantity: string;
  startTime: string;
  endTime: string;
};

interface DiscoverFormProps {
  onDiscover: (data: {
    sourceType?: string;
    minQuantity: number;
    timeWindow: { startTime: string; endTime: string };
  }) => Promise<void>;
  isLoading: boolean;
}

export function DiscoverForm({ onDiscover, isLoading }: DiscoverFormProps) {
  const [sourceType, setSourceType] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DiscoverFormInput>({
    defaultValues: {
      minQuantity: '30',
      startTime: getDefaultStartTime(),
      endTime: getDefaultEndTime(),
    },
  });

  const onSubmit = async (data: DiscoverFormInput) => {
    const qty = parseInt(data.minQuantity, 10);
    if (isNaN(qty) || qty < 1) return;
    
    await onDiscover({
      sourceType: sourceType || undefined,
      minQuantity: qty,
      timeWindow: {
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      },
    });
  };

  return (
    <Card>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Source Type Pills */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] mb-2 block">
            Energy Source
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sourceTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = sourceType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSourceType(type.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-9 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-[120ms]',
                    isSelected
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity */}
        <Input
          label="Minimum Quantity (kWh)"
          type="number"
          min={1}
          max={1000}
          {...register('minQuantity', { required: 'Required', min: { value: 1, message: 'Min 1 kWh' } })}
          error={errors.minQuantity?.message}
        />

        {/* Time Window */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Time"
            type="datetime-local"
            {...register('startTime', { required: 'Required' })}
            error={errors.startTime?.message}
          />
          <Input
            label="End Time"
            type="datetime-local"
            {...register('endTime', { required: 'Required' })}
            error={errors.endTime?.message}
          />
        </div>

        {/* Submit */}
        <Button type="submit" fullWidth loading={isLoading}>
          <Search className="h-4 w-4" />
          Discover Offers
        </Button>
      </form>
    </Card>
  );
}

function getDefaultStartTime(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return toLocalISOString(now);
}

function getDefaultEndTime(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 5);
  return toLocalISOString(now);
}

function toLocalISOString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}
