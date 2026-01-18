'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BottomSheet, Button, Input, Select } from '@/components/ui';
import type { CatalogItem } from '@/lib/api';

type OfferFormInput = {
  item_id: string;
  price_per_kwh: string;
  max_qty: string;
  startTime: string;
  endTime: string;
};

interface AddOfferSheetProps {
  open: boolean;
  onClose: () => void;
  items: CatalogItem[];
  onSubmit: (data: {
    item_id: string;
    price_per_kwh: number;
    max_qty: number;
    time_window: { startTime: string; endTime: string };
  }) => Promise<void>;
}

export function AddOfferSheet({ open, onClose, items, onSubmit }: AddOfferSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferFormInput>({
    defaultValues: {
      item_id: '',
      price_per_kwh: '0.12',
      max_qty: '30',
      startTime: getDefaultStartTime(),
      endTime: getDefaultEndTime(),
    },
  });

  const handleFormSubmit = async (data: OfferFormInput) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await onSubmit({
        item_id: data.item_id,
        price_per_kwh: parseFloat(data.price_per_kwh),
        max_qty: parseInt(data.max_qty, 10),
        time_window: {
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(data.endTime).toISOString(),
        },
      });
      reset();
      onClose();
    } catch (err: any) {
      console.error('Failed to add offer:', err);
      setError(err.message || 'Failed to create offer');
    } finally {
      setIsLoading(false);
    }
  };

  const itemOptions = items.map((item) => ({
    value: item.id,
    label: `${item.source_type} - ${item.available_qty} kWh`,
  }));

  return (
    <BottomSheet open={open} onClose={onClose} title="Create Offer">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
        {error && (
          <div className="p-3 rounded-[12px] bg-[var(--color-danger-light)] text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {/* Item Selection */}
        <Select
          label="Energy Listing"
          options={itemOptions}
          placeholder="Select a listing"
          {...register('item_id', { required: 'Select a listing' })}
          error={errors.item_id?.message}
        />

        {/* Price */}
        <Input
          label="Price per kWh ($)"
          type="number"
          step="0.01"
          min={0.01}
          max={100}
          leftIcon={<span className="text-sm">$</span>}
          {...register('price_per_kwh', { required: 'Required', min: { value: 0.01, message: 'Min $0.01' } })}
          error={errors.price_per_kwh?.message}
        />

        {/* Quantity */}
        <Input
          label="Maximum Quantity (kWh)"
          type="number"
          min={1}
          max={10000}
          {...register('max_qty', { required: 'Required', min: { value: 1, message: 'Min 1 kWh' } })}
          error={errors.max_qty?.message}
          hint="Max energy for this offer"
        />

        {/* Time Window */}
        <div className="flex flex-col gap-3">
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
          Create Offer
        </Button>
      </form>
    </BottomSheet>
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
