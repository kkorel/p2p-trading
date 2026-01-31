'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';
import { Zap, Sun, Leaf, TrendingUp, Loader2, ArrowLeft, Phone } from 'lucide-react';

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
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your name (at least 2 characters)');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.sendOtp(phone.trim());
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      await login(phone.trim(), otp.trim(), name.trim());
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center">
      {/* Mobile canvas */}
      <div className="max-w-[480px] mx-auto w-full min-h-screen flex flex-col px-4 py-8 bg-[var(--color-bg)] shadow-[var(--shadow-sm)]">
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

          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full h-[44px] px-3 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full h-[44px] pl-10 pr-3 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="h-[44px] w-full rounded-[12px] bg-[var(--color-primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3">
              <div className="text-center mb-2">
                <p className="text-sm text-[var(--color-text-muted)]">
                  OTP sent to <span className="font-medium text-[var(--color-text)]">{phone}</span>
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5">
                  Enter OTP
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full h-[44px] px-3 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] text-center tracking-[0.3em] font-medium placeholder:text-[var(--color-text-muted)] placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="h-[44px] w-full rounded-[12px] bg-[var(--color-primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>
              <button
                type="button"
                onClick={handleBack}
                disabled={isLoading}
                className="h-[36px] w-full rounded-[12px] text-sm text-[var(--color-text-muted)] flex items-center justify-center gap-1.5 hover:text-[var(--color-text)] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change number
              </button>
            </form>
          )}

          <p className="text-xs text-[var(--color-text-muted)] text-center mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
