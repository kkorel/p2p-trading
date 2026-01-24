'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, User, Mail, Shield, Wallet, Check, AlertCircle, Upload, FileText, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/contexts/auth-context';
import { useBalance } from '@/contexts/balance-context';
import { authApi } from '@/lib/api';
import { Card, Button, Input, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

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

function getTrustTierIcon(score?: number): string {
  const s = score ?? 0.3;
  if (s >= 0.95) return '💎';
  if (s >= 0.85) return '🏆';
  if (s >= 0.7) return '⭐';
  if (s >= 0.5) return '🥉';
  if (s >= 0.3) return '🌱';
  return '🆕';
}

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { balance, setBalance } = useBalance();
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
        {/* Profile Header */}
        <Card>
          <div className="flex items-center gap-4">
            {/* Avatar with Trust Ring */}
            <div className="relative">
              {user.picture ? (
                <Image
                  src={user.picture}
                  alt={user.name || 'Avatar'}
                  width={64}
                  height={64}
                  className="rounded-full ring-2 ring-offset-2"
                  style={{
                    '--tw-ring-color': getTrustRingColor(user.trustScore),
                  } as React.CSSProperties}
                />
              ) : (
                <div
                  className="w-16 h-16 bg-[var(--color-primary-light)] rounded-full flex items-center justify-center ring-2 ring-offset-2"
                  style={{
                    '--tw-ring-color': getTrustRingColor(user.trustScore),
                  } as React.CSSProperties}
                >
                  <span className="text-2xl font-semibold text-[var(--color-primary)]">
                    {user.name?.[0] || user.email[0].toUpperCase()}
                  </span>
                </div>
              )}
              {/* Trust Score Mini Badge */}
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md"
                style={{ backgroundColor: getTrustRingColor(user.trustScore) }}
                title={`Trust: ${((user.trustScore ?? 0.3) * 100).toFixed(0)}%`}
              >
                {getTrustTierIcon(user.trustScore)}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">
                  {user.name || 'No name set'}
                </h2>
                <Badge
                  variant={getTrustBadgeVariant(user.trustScore)}
                  size="sm"
                  className="font-semibold"
                >
                  {getTrustTierName(user.trustScore)}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{user.email}</p>
            </div>
          </div>
        </Card>

        {/* Trust Score Card */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--color-primary)]" />
              Trust Score
            </h3>
            <Badge variant={getTrustBadgeVariant(user.trustScore)}>
              {getTrustTierName(user.trustScore)}
            </Badge>
          </div>

          {/* Trust Score Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--color-text-muted)]">Trust Level</span>
              <span className="font-semibold text-[var(--color-primary)]">
                {((user.trustScore ?? 0.3) * 100).toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] rounded-full transition-all duration-500"
                style={{ width: `${(user.trustScore ?? 0.3) * 100}%` }}
              />
            </div>
          </div>

          {/* Trade Limit */}
          <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
            <span className="text-sm text-[var(--color-text-muted)]">Trade Limit</span>
            <div className="text-right">
              <span className="text-lg font-bold text-[var(--color-primary)]">
                {user.allowedTradeLimit ?? 10}%
              </span>
              {user.productionCapacity && (
                <span className="text-xs text-[var(--color-text-muted)] block">
                  = {((user.productionCapacity * (user.allowedTradeLimit ?? 10)) / 100).toFixed(1)} kWh/month
                </span>
              )}
            </div>
          </div>

          {/* Trust Tier Info */}
          <div className="mt-3 p-3 bg-[var(--color-bg-subtle)] rounded-lg">
            <p className="text-xs text-[var(--color-text-muted)]">
              {getTrustTierDescription(user.trustScore)}
            </p>
          </div>
        </Card>

        {/* Production Capacity Card */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[var(--color-text)] flex items-center gap-2">
              ⚡ Production Capacity
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

          {user.meterDataAnalyzed ? (
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
              {/* Reset button for re-uploading */}
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    await authApi.resetMeter();
                    // Refresh user data
                    const { user: updatedUser } = await authApi.getMe();
                    updateUser(updatedUser);
                    setAnalysisResult(null);
                    setAnalysisError(null);
                  } catch (err: any) {
                    setAnalysisError(err.message || 'Failed to reset');
                  }
                }}
              >
                Upload Different Document
              </Button>
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
                    <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                      isAnalyzing 
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

        {/* Account Status */}
        <Card>
          <h3 className="text-base font-semibold text-[var(--color-text)] mb-3">
            Account Status
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text)]">Profile Complete</span>
              </div>
              <Badge variant={user.profileComplete ? 'success' : 'warning'}>
                {user.profileComplete ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-[var(--color-text-muted)]" />
                <span className="text-sm text-[var(--color-text)]">Seller Profile</span>
              </div>
              <Badge variant={user.providerId ? 'success' : 'default'}>
                {user.providerId ? 'Active' : 'Not set up'}
              </Badge>
            </div>
          </div>
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
