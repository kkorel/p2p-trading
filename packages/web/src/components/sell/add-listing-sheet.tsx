'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Sun, Wind, Droplets, Check } from 'lucide-react';
import { BottomSheet, Button, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

const sourceTypes = [
  { value: 'SOLAR', label: 'Solar', icon: Sun, color: 'bg-amber-50 text-amber-600' },
  { value: 'WIND', label: 'Wind', icon: Wind, color: 'bg-sky-50 text-sky-600' },
  { value: 'HYDRO', label: 'Hydro', icon: Droplets, color: 'bg-blue-50 text-blue-600' },
];

type ListingFormInput = {
  available_qty: string;
  meter_id?: string;
};

interface AddListingSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { source_type: string; available_qty: number; meter_id?: string }) => Promise<void>;
}

export function AddListingSheet({ open, onClose, onSubmit }: AddListingSheetProps) {
  const [sourceType, setSourceType] = useState('SOLAR');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ListingFormInput>({
    defaultValues: {
      available_qty: '100',
    },
  });

  const handleFormSubmit = async (data: ListingFormInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onSubmit({
        source_type: sourceType,
        available_qty: parseInt(data.available_qty, 10),
        meter_id: data.meter_id || undefined,
      });
      reset();
      onClose();
    } catch (err: any) {
      console.error('Failed to add listing:', err);
      setError(err.message || 'Failed to create listing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add Energy Listing">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-[12px] bg-[var(--color-danger-light)] text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {/* Source Type */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] mb-2 block">
            Energy Source
          </label>
          <div className="grid grid-cols-3 gap-2">
            {sourceTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = sourceType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSourceType(type.value)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-3 rounded-[12px] border transition-all duration-[120ms]',
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-[10px] flex items-center justify-center', type.color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'
                  )}>
                    {type.label}
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-[var(--color-primary)] absolute top-2 right-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity */}
        <Input
          label="Available Quantity (kWh)"
          type="number"
          min={1}
          max={10000}
          {...register('available_qty', { required: 'Required', min: { value: 1, message: 'Min 1 kWh' } })}
          error={errors.available_qty?.message}
          hint="Total energy you want to make available for sale"
        />

        {/* Meter ID */}
        <Input
          label="Meter ID (Optional)"
          placeholder="e.g., MTR-2024-001"
          {...register('meter_id')}
          hint="Your smart meter identifier"
        />

        {/* Submit */}
        <Button type="submit" fullWidth loading={isLoading}>
          Create Listing
        </Button>
      </form>
    </BottomSheet>
  );
}
