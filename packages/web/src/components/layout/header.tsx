'use client';

import { useAuth } from '@/contexts/auth-context';
import { Zap } from 'lucide-react';
import Image from 'next/image';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-bg)]/95 backdrop-blur-sm border-b border-[var(--color-border)]">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-[var(--color-primary-light)] rounded-[10px]">
            <Zap className="h-4 w-4 text-[var(--color-primary)]" />
          </div>
          <span className="text-base font-semibold text-[var(--color-text)]">
            {title || 'EnergyTrade'}
          </span>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            {user.picture ? (
              <Image
                src={user.picture}
                alt={user.name || 'Avatar'}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-[var(--color-primary)]">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
