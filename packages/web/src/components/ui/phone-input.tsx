'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// Common countries with phone codes and flag emojis
const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', pattern: /^(\+44|44|0)?\d{10,11}$/ },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', pattern: /^(\+91|91)?\d{10}$/ },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', pattern: /^(\+1|1)?\d{10}$/ },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', pattern: /^(\+49|49|0)?\d{10,11}$/ },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', pattern: /^(\+33|33|0)?\d{9,10}$/ },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', pattern: /^(\+61|61|0)?\d{9,10}$/ },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', pattern: /^(\+1|1)?\d{10}$/ },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', pattern: /^(\+55|55)?\d{10,11}$/ },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', pattern: /^(\+81|81|0)?\d{9,10}$/ },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', pattern: /^(\+86|86)?\d{11}$/ },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪', pattern: /^(\+971|971|0)?\d{9}$/ },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', pattern: /^(\+65|65)?\d{8}$/ },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', pattern: /^(\+31|31|0)?\d{9}$/ },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', pattern: /^(\+34|34)?\d{9}$/ },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', pattern: /^(\+39|39)?\d{9,10}$/ },
] as const;

type Country = (typeof COUNTRIES)[number];

interface PhoneInputProps {
  value: string;
  onChange: (value: string, fullNumber: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = '7911 123456',
  className = '',
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to UK
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect country from phone number input
  useEffect(() => {
    const cleaned = localValue.replace(/[\s-]/g, '');
    
    if (cleaned.startsWith('+')) {
      // Find matching country by dial code
      const matched = COUNTRIES.find((c) => cleaned.startsWith(c.dialCode));
      if (matched && matched.code !== selectedCountry.code) {
        setSelectedCountry(matched);
      }
    }
  }, [localValue, selectedCountry.code]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Build full number with country code if not already present
    const cleaned = newValue.replace(/[\s-]/g, '');
    let fullNumber = cleaned;
    
    if (!cleaned.startsWith('+') && !cleaned.startsWith(selectedCountry.dialCode.slice(1))) {
      // Add country code
      fullNumber = selectedCountry.dialCode + cleaned;
    } else if (!cleaned.startsWith('+') && cleaned.startsWith(selectedCountry.dialCode.slice(1))) {
      // Has country code without +
      fullNumber = '+' + cleaned;
    }
    
    onChange(newValue, fullNumber);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    
    // Update full number with new country code
    const cleaned = localValue.replace(/[\s-]/g, '');
    const withoutCode = cleaned.replace(/^\+?\d{1,4}/, ''); // Strip existing code
    const fullNumber = country.dialCode + withoutCode;
    onChange(localValue, fullNumber);
  };

  return (
    <div className={`relative flex ${className}`}>
      {/* Country selector */}
      <div ref={dropdownRef} className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className="h-[44px] px-3 rounded-l-[12px] bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] flex items-center gap-1.5 hover:bg-[var(--color-border-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          <ChevronDown className="h-3 w-3 text-[var(--color-text-muted)]" />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-[200px] max-h-[240px] overflow-y-auto bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[12px] shadow-lg z-50">
            {COUNTRIES.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-[var(--color-surface)] transition-colors ${
                  country.code === selectedCountry.code ? 'bg-[var(--color-primary-light)]' : ''
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm text-[var(--color-text)] flex-1">{country.name}</span>
                <span className="text-xs text-[var(--color-text-muted)]">{country.dialCode}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone input */}
      <input
        type="tel"
        value={localValue}
        onChange={handleInputChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 h-[44px] px-3 rounded-r-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:opacity-50"
      />
    </div>
  );
}

/**
 * Utility to get formatted phone number with country code
 */
export function formatPhoneForAPI(phone: string, countryDialCode: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  if (cleaned.startsWith(countryDialCode.slice(1))) {
    return '+' + cleaned;
  }
  
  // Remove leading 0 if present (common in UK/DE numbers)
  const withoutLeadingZero = cleaned.startsWith('0') ? cleaned.slice(1) : cleaned;
  return countryDialCode + withoutLeadingZero;
}
