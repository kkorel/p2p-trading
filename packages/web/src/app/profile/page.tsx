'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, User, Mail, Shield, Wallet, Check, AlertCircle, Upload, FileText, Sparkles, KeyRound, ExternalLink, Zap, Info, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/contexts/auth-context';
import { useBalance } from '@/contexts/balance-context';
import { useP2PStats } from '@/contexts/p2p-stats-context';
import { authApi, type VCCredential } from '@/lib/api';
import { Card, Button, Input, Badge, useConfirm } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// VC Status badge variant helper
function getVCStatusBadgeVariant(status: VCCredential['status']): 'success' | 'warning' | 'default' {
  if (status === 'verified') return 'success';
  if (status === 'pending') return 'warning';
  return 'default';
}

// Verifiable Credentials Card Component
function VerifiableCredentialsCard() {
  const [credentials, setCredentials] = useState<VCCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [vcIdInput, setVcIdInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  // Fetch user's credentials on mount
  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const result = await authApi.getCredentials();
        if (result.success) {
          setCredentials(result.credentials);
        }
      } catch (err) {
        console.error('Failed to fetch credentials:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCredentials();
  }, []);

  const handleVerifyVC = async () => {
    if (!vcIdInput.trim()) {
      setVerifyError('Please enter a VC ID or paste VC JSON');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setVerifySuccess(null);

    try {
      // Check if input is JSON (starts with { or [)
      const trimmedInput = vcIdInput.trim();
      let params: { credential?: object; vcId?: string } = {};

      if (trimmedInput.startsWith('{') || trimmedInput.startsWith('[')) {
        // Try to parse as JSON
        try {
          const parsed = JSON.parse(trimmedInput);
          params = { credential: parsed };
        } catch {
          setVerifyError('Invalid JSON format');
          setIsVerifying(false);
          return;
        }
      } else {
        // Treat as VC ID
        params = { vcId: trimmedInput };
      }

      const result = await authApi.verifyVC(params);

      if (result.verified) {
        setVerifySuccess(`✓ Credential verified! Type: ${result.credentialType?.join(', ') || 'Unknown'}`);
        setVcIdInput('');
        // Refresh credentials list
        const refreshed = await authApi.getCredentials();
        if (refreshed.success) {
          setCredentials(refreshed.credentials);
        }
      } else {
        setVerifyError(result.error || 'Verification failed');
      }
    } catch (err: any) {
      setVerifyError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[var(--color-primary)]" />
          Verifiable Credentials
        </h3>
      </div>

      {/* Credentials List */}
      <div className="space-y-2 mb-4">
        {isLoading ? (
          <div className="text-sm text-[var(--color-text-muted)]">Loading credentials...</div>
        ) : credentials.length === 0 ? (
          <div className="text-sm text-[var(--color-text-muted)]">No credentials found</div>
        ) : (
          credentials.map((cred, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
              <div>
                <span className="text-sm font-medium text-[var(--color-text)]">{cred.type}</span>
                <p className="text-xs text-[var(--color-text-muted)]">{cred.description}</p>
              </div>
              <Badge variant={getVCStatusBadgeVariant(cred.status)} size="sm">
                {cred.status === 'verified' && <Check className="w-3 h-3 mr-1" />}
                {cred.status}
              </Badge>
            </div>
          ))
        )}
      </div>

      {/* Verify New Credential */}
      <div className="border-t border-[var(--color-border)] pt-3">
        <p className="text-sm font-medium text-[var(--color-text)] mb-2">Verify a Credential</p>
        <div className="flex gap-2">
          <Input
            placeholder="Enter VC ID from portal"
            value={vcIdInput}
            onChange={(e) => {
              setVcIdInput(e.target.value);
              setVerifyError(null);
              setVerifySuccess(null);
            }}
            className="flex-1"
          />
          <Button
            onClick={handleVerifyVC}
            loading={isVerifying}
            disabled={!vcIdInput.trim()}
          >
            Verify
          </Button>
        </div>

        {verifyError && (
          <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-danger)]">
            <AlertCircle className="w-4 h-4" />
            {verifyError}
          </div>
        )}

        {verifySuccess && (
          <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-success)]">
            <Check className="w-4 h-4" />
            {verifySuccess}
          </div>
        )}
      </div>
    </Card>
  );
}

// Trust score helper functions
function getTrustTierName(score?: number): string {
  const s = score ?? 0.3;
  if (s >= 0.95) return 'Platinum';
  if (s >= 0.85) return 'Gold';
  if (s >= 0.7) return 'Silver';
  if (s >= 0.5) return 'Bronze';
  if (s >= 0.3) return 'Starter';
  return 'New';
}

function getTrustBadgeVariant(score?: number): 'success' | 'warning' | 'default' {
  const s = score ?? 0.3;
  if (s >= 0.7) return 'success';
  if (s >= 0.5) return 'warning';
  return 'default';
}

function getTrustTierDescription(score?: number): string {
  const s = score ?? 0.3;
  if (s >= 0.95) return 'Platinum tier: Full trading privileges. Trade up to 100% of your surplus energy.';
  if (s >= 0.85) return 'Gold tier: Excellent reputation! Trade up to 80% of your surplus energy.';
  if (s >= 0.7) return 'Silver tier: Good track record. Trade up to 60% of your surplus energy.';
  if (s >= 0.5) return 'Bronze tier: Building trust. Trade up to 40% of your surplus energy.';
  if (s >= 0.3) return 'Starter tier: Welcome! Complete more trades to increase your limit.';
  return 'New user: Complete your first successful trade to start building trust.';
}

function getTrustRingColor(score?: number): string {
  const s = score ?? 0.3;
  if (s >= 0.95) return '#7c3aed'; // Purple for Platinum
  if (s >= 0.85) return '#f59e0b'; // Amber for Gold
  if (s >= 0.7) return '#6b7280';  // Gray for Silver
  if (s >= 0.5) return '#d97706';  // Orange for Bronze
  if (s >= 0.3) return '#3b82f6';  // Blue for Starter
  return '#9ca3af'; // Light gray for New
}

// Tier-based gradient backgrounds for immersive header
function getTierGradientStyle(score?: number): React.CSSProperties {
  const s = score ?? 0.3;
  if (s >= 0.95) return { background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)' }; // Platinum purple
  if (s >= 0.85) return { background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)' }; // Gold amber
  if (s >= 0.7) return { background: 'linear-gradient(135deg, #4b5563 0%, #6b7280 50%, #9ca3af 100%)' };  // Silver gray
  if (s >= 0.5) return { background: 'linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #fb923c 100%)' };  // Bronze orange
  if (s >= 0.3) return { background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)' };  // Starter blue
  return { background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 50%, #d1d5db 100%)' }; // New gray
}

// P2P Value Insight Component - Shows financial benefits of P2P trading
function P2PValueInsight() {
  const [showDetails, setShowDetails] = useState(false);
  const { totalSold, avgSellPrice, totalBought, avgBuyPrice, totalValue, isLoading } = useP2PStats();

  // Reference DISCOM rates
  const DISCOM_BUY_RATE = 8;    // Rs per kWh (what DISCOM charges consumers)
  const DISCOM_SELLBACK_RATE = 2; // Rs per kWh (what DISCOM pays for surplus)

  // Calculate breakdown
  const sellerGain = totalSold * (avgSellPrice - DISCOM_SELLBACK_RATE);
  const buyerSavings = totalBought * (DISCOM_BUY_RATE - avgBuyPrice);

  // Don't show if loading
  if (isLoading) return null;

  // Show even with zero value - helps users understand the feature
  const hasActivity = totalSold > 0 || totalBought > 0;

  return (
    <Card>
      {/* Headline Value */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
          <h3 className="text-base font-semibold text-[var(--color-text)]">
            P2P Trading Value
          </h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1.5 rounded-full hover:bg-[var(--color-bg-subtle)] transition-colors"
          aria-label="Show calculation details"
        >
          <Info className="w-4 h-4 text-[var(--color-text-muted)]" />
        </button>
      </div>

      {/* Primary Value Display */}
      <div className="text-center py-3">
        <p className={`text-3xl font-bold ${hasActivity ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
          +{formatCurrency(totalValue)}
        </p>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {hasActivity ? 'Extra value from P2P trading' : 'Start trading to see your savings!'}
        </p>
      </div>

      {/* Breakdown (always visible) */}
      {hasActivity ? (
        <div className="flex justify-between text-sm border-t border-[var(--color-border)] pt-3 mt-2">
          {sellerGain > 0 && (
            <div>
              <p className="text-[var(--color-text-muted)]">Earned selling</p>
              <p className="font-medium text-[var(--color-text)]">+{formatCurrency(sellerGain)}</p>
            </div>
          )}
          {buyerSavings > 0 && (
            <div className="text-right">
              <p className="text-[var(--color-text-muted)]">Saved buying</p>
              <p className="font-medium text-[var(--color-text)]">+{formatCurrency(buyerSavings)}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-xs text-[var(--color-text-muted)] border-t border-[var(--color-border)] pt-3 mt-2">
          <p>Complete your first trade to start earning value!</p>
        </div>
      )}

      {/* Progressive Disclosure - DISCOM Rate Comparison */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-3">
          <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">
            How this is calculated
          </p>

          {/* Rate Comparison Table */}
          <div className="bg-[var(--color-bg-subtle)] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">DISCOM buy rate (reference)</span>
              <span className="font-medium text-[var(--color-text)]">{formatCurrency(DISCOM_BUY_RATE)}/kWh</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">DISCOM sell-back rate (reference)</span>
              <span className="font-medium text-[var(--color-text)]">{formatCurrency(DISCOM_SELLBACK_RATE)}/kWh</span>
            </div>
            <div className="border-t border-[var(--color-border)] pt-2 mt-2">
              {totalSold > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Your avg P2P sell ({totalSold} kWh)</span>
                  <span className="font-medium text-[var(--color-success)]">{formatCurrency(avgSellPrice)}/kWh</span>
                </div>
              )}
              {totalBought > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--color-text-muted)]">Your avg P2P buy ({totalBought} kWh)</span>
                  <span className="font-medium text-[var(--color-success)]">{formatCurrency(avgBuyPrice)}/kWh</span>
                </div>
              )}
            </div>
          </div>

          {/* Explanation */}
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Value is calculated as the difference between P2P trading prices and standard DISCOM rates.
            When selling, you earn more than DISCOM&apos;s {formatCurrency(DISCOM_SELLBACK_RATE)}/kWh buy-back rate.
            When buying, you pay less than DISCOM&apos;s {formatCurrency(DISCOM_BUY_RATE)}/kWh consumer rate.
          </p>

          <p className="text-[10px] text-[var(--color-text-muted)] italic">
            Reference rates are representative values for comparison purposes.
          </p>
        </div>
      )}
    </Card>
  );
}


export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { balance, setBalance } = useBalance();
  const { confirm } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [balanceInput, setBalanceInput] = useState(balance.toString());

  // Production capacity state
  const [capacityInput, setCapacityInput] = useState('');
  const [isSavingCapacity, setIsSavingCapacity] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  const [capacitySuccess, setCapacitySuccess] = useState(false);

  // Meter PDF analyzer state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    extractedCapacity: number | null;
    quality: string;
    matchesDeclaration: boolean;
    insights: string;
    trustBonus: string | null;
  } | null>(null);
  const [forceShowUpload, setForceShowUpload] = useState(false);

  // Initialize capacity input when user loads
  useEffect(() => {
    if (user?.productionCapacity) {
      setCapacityInput(user.productionCapacity.toString());
    }
  }, [user?.productionCapacity]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  });

  const handleSaveProfile = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const result = await authApi.updateProfile(data);
      updateUser(result.user);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBalance = async () => {
    const parsed = parseFloat(balanceInput);
    if (!isNaN(parsed) && parsed >= 0) {
      try {
        await setBalance(parsed);
        setIsEditingBalance(false);
      } catch (error) {
        console.error('Failed to update balance:', error);
      }
    }
  };

  if (!user) return null;

  return (
    <AppShell title="Profile">
      <div className="flex flex-col gap-4">
        {/* Profile Header - Tier Gradient Background */}
        <div
          className="rounded-xl p-4 shadow-sm"
          style={getTierGradientStyle(user.trustScore)}
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {user.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name || 'Avatar'}
                  width={56}
                  height={56}
                  className="rounded-full ring-2 ring-white/40"
                />
              ) : (
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/40">
                  <span className="text-xl font-semibold text-white">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Profile Info + Trust */}
            <div className="flex-1 min-w-0">
              {/* Name and Email */}
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-white truncate">
                  {user.name || 'No name set'}
                </h2>
                <span className="px-2 py-0.5 bg-white/15 rounded text-xs font-medium text-white/90">
                  {getTrustTierName(user.trustScore)}
                </span>
              </div>
              <p className="text-sm text-white/70 truncate mb-3">{user.email}</p>

              {/* Trust Level Bar - Integrated */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/60">Trust Level</span>
                  <span className="text-white font-medium">
                    Trade Limit: {user.allowedTradeLimit ?? 10}%
                    {user.productionCapacity != null && user.productionCapacity > 0 && (
                      <span className="text-white/60 ml-1">
                        ({((user.productionCapacity * (user.allowedTradeLimit ?? 10)) / 100).toFixed(0)} kWh)
                      </span>
                    )}
                  </span>
                </div>
                {/* Clean progress bar */}
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-300"
                    style={{ width: `${(user.trustScore ?? 0.3) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* P2P Value Insight Card */}
        <P2PValueInsight />

        {/* Verifiable Credentials Card */}
        <VerifiableCredentialsCard />

        {/* Production Capacity Card */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--color-primary)]" />
              Production Capacity
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1">
                How much electricity do you produce monthly?
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  min={0}
                  step={10}
                  value={capacityInput}
                  onChange={(e) => {
                    setCapacityInput(e.target.value);
                    setCapacityError(null);
                    setCapacitySuccess(false);
                  }}
                  error={capacityError || undefined}
                />
                <span className="text-sm font-medium text-[var(--color-text-muted)]">kWh/month</span>
              </div>
            </div>

            {/* Error Message */}
            {capacityError && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-danger-light)]">
                <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
                <span className="text-sm text-[var(--color-danger)]">{capacityError}</span>
              </div>
            )}

            {/* Success Message */}
            {capacitySuccess && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-success-light)]">
                <Check className="w-4 h-4 text-[var(--color-success)]" />
                <span className="text-sm text-[var(--color-success)]">Production capacity updated!</span>
              </div>
            )}

            {/* Apply Button */}
            <Button
              fullWidth
              loading={isSavingCapacity}
              onClick={async () => {
                const value = parseFloat(capacityInput);

                // Validate
                if (isNaN(value) || capacityInput.trim() === '') {
                  setCapacityError('Please enter a valid number');
                  return;
                }

                if (value < 0) {
                  setCapacityError('Capacity cannot be negative');
                  return;
                }

                if (value > 100000) {
                  setCapacityError('Value seems too high. Please enter a realistic capacity.');
                  return;
                }

                // Check if value changed
                if (value === user.productionCapacity) {
                  setCapacitySuccess(true);
                  setTimeout(() => setCapacitySuccess(false), 2000);
                  return;
                }

                setIsSavingCapacity(true);
                setCapacityError(null);
                setCapacitySuccess(false);

                try {
                  const result = await authApi.updateProfile({ productionCapacity: value });
                  updateUser(result.user);
                  setCapacitySuccess(true);
                  setTimeout(() => setCapacitySuccess(false), 3000);
                } catch (error: any) {
                  setCapacityError(error.message || 'Failed to update production capacity');
                } finally {
                  setIsSavingCapacity(false);
                }
              }}
            >
              Apply
            </Button>

            {user.productionCapacity ? (
              <div className="p-3 bg-[var(--color-primary-light)] rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text)]">Your trade limit:</span>
                  <span className="text-lg font-bold text-[var(--color-primary)]">
                    {((user.productionCapacity * (user.allowedTradeLimit ?? 10)) / 100).toFixed(1)} kWh
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {user.allowedTradeLimit ?? 10}% of {user.productionCapacity} kWh = you can trade up to this much per month
                </p>
              </div>
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">
                Set your production capacity to see your trade limit
              </p>
            )}

            {user.meterVerifiedCapacity && (
              <div className="p-2 rounded-lg bg-[var(--color-success-light)] border border-[var(--color-success)]">
                <div className="flex items-center gap-2 text-sm text-[var(--color-success)]">
                  <Check className="w-4 h-4" />
                  <span>Meter verified: {user.meterVerifiedCapacity} kWh/month</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Meter PDF Analyzer Card */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-primary)]" />
              Verify with Meter Reading
              <Badge variant="success" size="sm">+10% Trust</Badge>
            </h3>
          </div>

          {user.meterDataAnalyzed && !forceShowUpload ? (
            // Already analyzed
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[var(--color-success-light)] border border-[var(--color-success)]">
                <div className="flex items-center gap-2 text-[var(--color-success)] mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Meter Data Verified!</span>
                </div>
                {user.meterVerifiedCapacity && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Verified capacity: <strong>{user.meterVerifiedCapacity} kWh/month</strong>
                  </p>
                )}
                {!user.meterVerifiedCapacity && (
                  <p className="text-sm text-[var(--color-warning)]">
                    Capacity could not be extracted. Try uploading again with a clearer document.
                  </p>
                )}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Your trust score has been boosted based on your meter verification.
              </p>
              {/* Reset option with warning */}
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-muted)] mb-2">
                  Want to update your meter reading? Uploading a new document will <strong>temporarily remove the +10% trust bonus</strong> until the new document is verified.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: 'Reset Meter Verification?',
                      message: 'Uploading a new document will reset your meter verification and remove the +10% trust bonus until re-verified.',
                      confirmText: 'Reset & Upload New',
                      cancelText: 'Cancel',
                      variant: 'warning',
                    });
                    if (!confirmed) return;

                    try {
                      await authApi.resetMeter();
                      // Refresh user data
                      const { user: updatedUser } = await authApi.getMe();
                      updateUser(updatedUser);
                      setAnalysisResult(null);
                      setAnalysisError(null);
                      setForceShowUpload(true);
                    } catch (err: any) {
                      setAnalysisError(err.message || 'Failed to reset');
                    }
                  }}
                >
                  Upload Different Document
                </Button>
              </div>
            </div>
          ) : (
            // Upload form
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                Upload your electricity meter reading PDF to <strong>automatically set your production capacity</strong> and get a <strong>+10% trust score bonus</strong>.
              </p>

              {/* Error Message */}
              {analysisError && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-danger-light)]">
                  <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
                  <span className="text-sm text-[var(--color-danger)]">{analysisError}</span>
                </div>
              )}

              {/* Success Result */}
              {analysisResult && (
                <div className="p-3 rounded-lg bg-[var(--color-success-light)] border border-[var(--color-success)]">
                  <div className="flex items-center gap-2 text-[var(--color-success)] mb-2">
                    <Sparkles className="w-5 h-5" />
                    <span className="font-medium">Analysis Complete!</span>
                    {analysisResult.trustBonus && (
                      <Badge variant="success">{analysisResult.trustBonus}</Badge>
                    )}
                  </div>
                  {analysisResult.extractedCapacity && (
                    <p className="text-sm text-[var(--color-text)]">
                      Extracted capacity: <strong>{analysisResult.extractedCapacity} kWh/month</strong>
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {analysisResult.insights}
                  </p>
                </div>
              )}

              {/* Upload Button */}
              {!analysisResult && (
                <>
                  <div className="flex items-center justify-center w-full">
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isAnalyzing
                      ? 'bg-[var(--color-bg-subtle)] border-[var(--color-border)] cursor-wait'
                      : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)] hover:border-[var(--color-primary)]'
                      }`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isAnalyzing ? (
                          <>
                            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mb-2" />
                            <p className="text-sm text-[var(--color-text-muted)]">Analyzing with AI...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2 text-[var(--color-text-muted)]" />
                            <p className="text-sm text-[var(--color-text-muted)]">
                              <span className="font-semibold text-[var(--color-primary)]">Click to upload</span> meter reading PDF
                            </p>
                            <p className="text-xs text-[var(--color-text-muted)]">PDF (Max 5MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        disabled={isAnalyzing}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          // Validate file
                          if (!file.type.includes('pdf')) {
                            setAnalysisError('Please upload a PDF file');
                            return;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            setAnalysisError('File size must be less than 5MB');
                            return;
                          }

                          setIsAnalyzing(true);
                          setAnalysisError(null);

                          try {
                            // Read file as base64
                            const reader = new FileReader();
                            reader.onload = async () => {
                              try {
                                const base64 = (reader.result as string).split(',')[1];

                                // Call API - will auto-extract capacity from PDF
                                const result = await authApi.analyzeMeter(base64);

                                if (result.success) {
                                  setAnalysisResult({
                                    extractedCapacity: result.analysis.extractedCapacity,
                                    quality: result.analysis.quality,
                                    matchesDeclaration: result.analysis.matchesDeclaration,
                                    insights: result.analysis.insights,
                                    trustBonus: result.trustBonus,
                                  });
                                  // Update user context (includes new productionCapacity!)
                                  updateUser(result.user);
                                  // Also update local capacity input
                                  if (result.analysis.extractedCapacity) {
                                    setCapacityInput(result.analysis.extractedCapacity.toString());
                                  }
                                }
                              } catch (err: any) {
                                setAnalysisError(err.message || 'Analysis failed. Please try again.');
                              } finally {
                                setIsAnalyzing(false);
                              }
                            };
                            reader.onerror = () => {
                              setAnalysisError('Failed to read file');
                              setIsAnalyzing(false);
                            };
                            reader.readAsDataURL(file);
                          } catch (err: any) {
                            setAnalysisError(err.message || 'Failed to process file');
                            setIsAnalyzing(false);
                          }

                          // Reset input
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <div className="p-3 bg-[var(--color-bg-subtle)] rounded-lg">
                    <p className="text-xs text-[var(--color-text-muted)]">
                      <strong>How it works:</strong> Upload your electricity bill or meter reading PDF.
                      Our AI will extract your production capacity and <strong>automatically set it</strong> for you.
                      You get +10% trust bonus!
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Balance Card */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[var(--color-primary)]" />
              Wallet Balance
            </h3>
            {!isEditingBalance && (
              <Button variant="ghost" size="sm" onClick={() => {
                setBalanceInput(balance.toString());
                setIsEditingBalance(true);
              }}>
                Edit
              </Button>
            )}
          </div>

          {isEditingBalance ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-[var(--color-text)]">₹</span>
                <Input
                  type="number"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="Enter balance"
                  min={0}
                  step={100}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsEditingBalance(false)}
                >
                  Cancel
                </Button>
                <Button fullWidth onClick={handleSaveBalance}>
                  Save
                </Button>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                This is a demo balance for testing payment flows
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[var(--color-text-muted)]">Available Balance</span>
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                {formatCurrency(balance)}
              </span>
            </div>
          )}
        </Card>

        {/* Edit Profile */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-text)]">
              Profile Information
            </h3>
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit(handleSaveProfile)} className="flex flex-col gap-4">
              <Input
                label="Display Name"
                {...register('name')}
                error={errors.name?.message}
                leftIcon={<User className="h-4 w-4" />}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" fullWidth loading={isSaving}>
                  Save
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 py-2">
                <User className="h-4 w-4 text-[var(--color-text-muted)]" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-text-muted)]">Name</p>
                  <p className="text-sm text-[var(--color-text)]">
                    {user.name || 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 py-2 border-t border-[var(--color-border)]">
                <Mail className="h-4 w-4 text-[var(--color-text-muted)]" />
                <div className="flex-1">
                  <p className="text-xs text-[var(--color-text-muted)]">Email</p>
                  <p className="text-sm text-[var(--color-text)]">{user.email}</p>
                </div>
                <Badge variant="success" size="sm">Verified</Badge>
              </div>
            </div>
          )}
        </Card>


        {/* Logout */}
        <Button
          variant="danger"
          fullWidth
          onClick={logout}
          className="mt-4"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </AppShell>
  );
}
