'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface SliderInputProps {
  /** Type of slider - affects styling */
  type: 'quantity' | 'price';
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step: number;
  /** Default/initial value */
  defaultValue: number;
  /** Unit label (e.g., 'kWh', '₹/unit') */
  unit: string;
  /** Callback prefix for sending value (e.g., 'autobuy_qty' -> 'autobuy_qty:25') */
  callbackPrefix: string;
  /** Called when user confirms selection */
  onSelect: (callbackData: string) => void;
  /** Optional label */
  label?: string;
  /** Optional class name */
  className?: string;
}

export function SliderInput({
  type,
  min,
  max,
  step,
  defaultValue,
  unit,
  callbackPrefix,
  onSelect,
  label,
  className,
}: SliderInputProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(Number(e.target.value));
  }, []);

  const handleConfirm = useCallback(() => {
    onSelect(`${callbackPrefix}:${value}`);
  }, [callbackPrefix, value, onSelect]);

  // Calculate percentage for gradient fill
  const percentage = ((value - min) / (max - min)) * 100;

  // Format display value
  const displayValue = type === 'price'
    ? `₹${value}`
    : `${value}`;

  return (
    <div className={cn('flex flex-col gap-4 p-4 rounded-2xl bg-[var(--color-surface)]', className)}>
      {label && (
        <label className="text-sm font-medium text-[var(--color-text-muted)]">
          {label}
        </label>
      )}

      {/* Value display */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-4xl font-bold text-[var(--color-primary)]">
          {displayValue}
        </span>
        <span className="text-lg text-[var(--color-text-muted)]">
          {unit}
        </span>
      </div>

      {/* Slider */}
      <div className="relative px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          className="w-full h-2 rounded-full appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${percentage}%, var(--color-border) ${percentage}%, var(--color-border) 100%)`,
          }}
        />

        {/* Min/Max labels */}
        <div className="flex justify-between mt-2 text-sm text-[var(--color-text-muted)]">
          <span>{type === 'price' ? `₹${min}` : `${min} ${unit}`}</span>
          <span>{type === 'price' ? `₹${max}` : `${max} ${unit}`}</span>
        </div>
      </div>

      {/* Quick select buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        {getQuickSelectValues(min, max, step, type).map((v) => (
          <button
            key={v}
            onClick={() => setValue(v)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
              value === v
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-bg)] text-[var(--color-text)] hover:bg-[var(--color-border)]'
            )}
          >
            {type === 'price' ? `₹${v}` : `${v}`}
          </button>
        ))}
      </div>

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
      >
        {type === 'quantity' ? 'Confirm Quantity' : 'Confirm Price'}
      </button>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--color-primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          border: 3px solid white;
        }
        .slider-thumb::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--color-primary);
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          border: 3px solid white;
        }
      `}</style>
    </div>
  );
}

/** Generate quick select values based on range */
function getQuickSelectValues(min: number, max: number, step: number, type: 'quantity' | 'price'): number[] {
  if (type === 'price') {
    // For price, show common values
    const values = [4, 5, 6, 7, 8].filter(v => v >= min && v <= max);
    return values.length > 0 ? values : [min, Math.round((min + max) / 2), max];
  }

  // For quantity, show evenly spaced values
  const range = max - min;
  const numButtons = 5;
  const values: number[] = [];

  for (let i = 0; i < numButtons; i++) {
    const value = min + (range * i) / (numButtons - 1);
    const rounded = Math.round(value / step) * step;
    if (!values.includes(rounded)) {
      values.push(rounded);
    }
  }

  return values;
}

SliderInput.displayName = 'SliderInput';
