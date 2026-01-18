'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';
import { Zap, Sun, Leaf, TrendingUp, Loader2 } from 'lucide-react';

const features = [
  {
    icon: Sun,
    title: 'Solar & Wind Energy',
    description: 'Trade renewable energy from local producers',
  },
  {
    icon: TrendingUp,
    title: 'Competitive Pricing',
    description: 'Get the best rates through peer-to-peer trading',
  },
  {
    icon: Leaf,
    title: 'Go Green',
    description: 'Support sustainable energy in your community',
  },
];

export function LoginScreen() {
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'authenticating' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const loginRef = useRef(login);

  // Keep login ref updated
  useEffect(() => {
    loginRef.current = login;
  }, [login]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // 1. Get client ID from backend
        const config = await authApi.getConfig();
        if (!mounted) return;

        // 2. Load Google script
        await loadGoogleScript();
        if (!mounted) return;

        // 3. Initialize and render button
        if (!window.google?.accounts?.id) {
          throw new Error('Google SDK not available');
        }

        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: async (response: { credential: string }) => {
            setStatus('authenticating');
            setError(null);
            try {
              await loginRef.current(response.credential);
            } catch (err: any) {
              console.error('Login failed:', err);
              setError(err.message || 'Login failed');
              setStatus('ready');
            }
          },
          auto_select: false,
        });

        // Wait for ref to be ready
        await new Promise(resolve => setTimeout(resolve, 50));

        if (googleBtnRef.current && mounted) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: 300,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        }

        setStatus('ready');
      } catch (err: any) {
        console.error('Init failed:', err);
        if (mounted) {
          setError(err.message || 'Failed to initialize');
          setStatus('error');
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Mobile canvas */}
      <div className="max-w-[480px] mx-auto w-full flex-1 flex flex-col px-4 py-8">
        {/* Logo & Title */}
        <div className="flex flex-col items-center pt-8 pb-12">
          <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-[18px] flex items-center justify-center mb-4">
            <Zap className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-text)] mb-1">
            EnergyTrade
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            P2P renewable energy marketplace
          </p>
        </div>

        {/* Features */}
        <div className="flex-1 flex flex-col gap-4 mb-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)]"
              >
                <div className="w-10 h-10 rounded-[12px] bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text)] mb-0.5">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sign in section */}
        <div className="pb-8">
          {error && (
            <div className="mb-4 p-3 rounded-[12px] bg-[var(--color-danger-light)] text-sm text-[var(--color-danger)] text-center">
              {error}
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="flex flex-col items-center gap-3 mb-4">
            {(status === 'loading' || status === 'authenticating') && (
              <div className="h-[44px] w-[300px] rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {status === 'authenticating' ? 'Signing in...' : 'Loading...'}
                </div>
              </div>
            )}
            
            {/* Google renders button here - always in DOM but hidden when loading */}
            <div 
              ref={googleBtnRef}
              style={{ display: status === 'ready' ? 'block' : 'none' }}
            />

            {status === 'error' && (
              <button
                onClick={() => window.location.reload()}
                className="h-[44px] w-[300px] rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center gap-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-border-subtle)] transition-colors"
              >
                Retry
              </button>
            )}
          </div>

          <p className="text-xs text-[var(--color-text-muted)] text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    // Check if script is already loading
    const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Script failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google SDK'));
    document.head.appendChild(script);
  });
}
