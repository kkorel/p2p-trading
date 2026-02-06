'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';
import {
  Zap,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Sun,
  Battery,
  Gauge,
  ArrowRight,
} from 'lucide-react';

type CredentialType = 'UTILITY_CUSTOMER' | 'GENERATION_PROFILE' | 'STORAGE_PROFILE' | 'CONSUMPTION_PROFILE';

interface UploadedVC {
  type: CredentialType;
  verified: boolean;
  claims?: any;
}

export default function CredentialsOnboarding() {
  const router = useRouter();
  const { login } = useAuth();

  // Pending auth state from login flow
  const [userId, setUserId] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [otp, setOtp] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);

  // Credential state
  const [uploadedVCs, setUploadedVCs] = useState<UploadedVC[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isCompletingSignup, setIsCompletingSignup] = useState(false);

  // Role selection
  const [selectedRole, setSelectedRole] = useState<'seller' | 'buyer' | 'both' | null>(null);

  // Check status
  const hasUtilityVC = uploadedVCs.some(vc => vc.type === 'UTILITY_CUSTOMER' && vc.verified);
  const hasGenerationVC = uploadedVCs.some(vc => vc.type === 'GENERATION_PROFILE' && vc.verified);
  const hasStorageVC = uploadedVCs.some(vc => vc.type === 'STORAGE_PROFILE' && vc.verified);
  const hasConsumptionVC = uploadedVCs.some(vc => vc.type === 'CONSUMPTION_PROFILE' && vc.verified);
  const hasSellerVC = hasGenerationVC || hasStorageVC;
  const hasBuyerVC = hasConsumptionVC;

  // Can complete based on role
  const canComplete =
    hasUtilityVC &&
    ((selectedRole === 'seller' && hasSellerVC) ||
      (selectedRole === 'buyer' && hasBuyerVC) ||
      (selectedRole === 'both' && hasSellerVC && hasBuyerVC));

  // Load pending auth data from session storage
  useEffect(() => {
    const storedUserId = sessionStorage.getItem('pendingUserId');
    const storedPhone = sessionStorage.getItem('pendingPhone');
    const storedOtp = sessionStorage.getItem('pendingOtp');
    const storedName = sessionStorage.getItem('pendingName');

    if (!storedUserId || !storedPhone || !storedOtp) {
      // No pending auth, redirect to login
      router.push('/');
      return;
    }

    setUserId(storedUserId);
    setPhone(storedPhone);
    setOtp(storedOtp);
    setPendingName(storedName);
  }, [router]);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File, expectedType?: CredentialType) => {
      if (!userId) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload to pre-auth endpoint
        const result = await authApi.verifyCredentialPreauth(userId, base64);

        if (result.success && result.verification.verified) {
          setUploadedVCs(prev => [
            ...prev.filter(vc => vc.type !== result.credentialType),
            {
              type: result.credentialType as CredentialType,
              verified: true,
              claims: result.extractedClaims,
            },
          ]);
        } else {
          setUploadError(
            `Credential verification failed. Please ensure you have a valid ${expectedType || 'credential'} PDF.`
          );
        }
      } catch (err: any) {
        setUploadError(err.message || 'Failed to upload credential');
      } finally {
        setIsUploading(false);
      }
    },
    [userId]
  );

  // Complete signup
  const handleCompleteSignup = async () => {
    if (!phone || !otp || !canComplete) return;

    setIsCompletingSignup(true);
    try {
      await login(phone, otp, pendingName || undefined);

      // Clear session storage
      sessionStorage.removeItem('pendingUserId');
      sessionStorage.removeItem('pendingPhone');
      sessionStorage.removeItem('pendingOtp');
      sessionStorage.removeItem('pendingName');
      sessionStorage.removeItem('requiredVCs');

      // Redirect to home
      router.push('/');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to complete signup. Please try again.');
      setIsCompletingSignup(false);
    }
  };

  // File input ref for triggering upload
  const createFileInput = (onUpload: (file: File) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onUpload(file);
    };
    input.click();
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center">
      <div className="max-w-[480px] mx-auto w-full min-h-screen flex flex-col px-4 py-8 bg-[var(--color-bg)] shadow-[var(--shadow-sm)]">
        {/* Header */}
        <div className="flex flex-col items-center pt-4 pb-8">
          <div className="w-14 h-14 bg-[var(--color-primary-light)] rounded-[16px] flex items-center justify-center mb-3">
            <Zap className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)] mb-1">Verify Your Credentials</h1>
          <p className="text-sm text-[var(--color-text-muted)] text-center">
            Upload your verifiable credentials to complete signup
          </p>
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="mb-4 p-3 rounded-[12px] bg-[var(--color-danger-light)] flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-[var(--color-danger)] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-danger)]">{uploadError}</p>
          </div>
        )}

        {/* Step 1: Utility VC */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                hasUtilityVC
                  ? 'bg-[var(--color-success)] text-white'
                  : 'bg-[var(--color-primary)] text-white'
              }`}
            >
              {hasUtilityVC ? <CheckCircle2 className="w-4 h-4" /> : '1'}
            </div>
            <h2 className="text-base font-medium text-[var(--color-text)]">Utility Customer Credential</h2>
          </div>

          {hasUtilityVC ? (
            <div className="p-4 rounded-[14px] bg-[var(--color-success-light)] border border-[var(--color-success)]/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--color-success)]" />
                <span className="text-sm font-medium text-[var(--color-success)]">
                  Utility credential verified
                </span>
              </div>
              {uploadedVCs.find(vc => vc.type === 'UTILITY_CUSTOMER')?.claims?.consumerNumber && (
                <p className="text-xs text-[var(--color-text-muted)] mt-1 ml-7">
                  Consumer #: {uploadedVCs.find(vc => vc.type === 'UTILITY_CUSTOMER')?.claims?.consumerNumber}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => createFileInput((file) => handleFileUpload(file, 'UTILITY_CUSTOMER'))}
              disabled={isUploading}
              className="w-full p-4 rounded-[14px] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors flex flex-col items-center gap-2"
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
              ) : (
                <>
                  <FileText className="w-8 h-8 text-[var(--color-text-muted)]" />
                  <span className="text-sm text-[var(--color-text-muted)]">
                    Upload Utility Customer VC (PDF)
                  </span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Step 2: Role Selection */}
        {hasUtilityVC && !selectedRole && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs font-medium text-white">
                2
              </div>
              <h2 className="text-base font-medium text-[var(--color-text)]">What do you want to do?</h2>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setSelectedRole('seller')}
                className="p-4 rounded-[14px] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-[12px] bg-[var(--color-warning-light)] flex items-center justify-center">
                  <Sun className="w-5 h-5 text-[var(--color-warning)]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--color-text)]">Sell Energy</p>
                  <p className="text-xs text-[var(--color-text-muted)]">I have solar/storage and want to sell</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole('buyer')}
                className="p-4 rounded-[14px] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-[12px] bg-[var(--color-primary-light)] flex items-center justify-center">
                  <Gauge className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--color-text)]">Buy Energy</p>
                  <p className="text-xs text-[var(--color-text-muted)]">I want to buy renewable energy</p>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole('both')}
                className="p-4 rounded-[14px] border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-[12px] bg-[var(--color-success-light)] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[var(--color-success)]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--color-text)]">Buy & Sell</p>
                  <p className="text-xs text-[var(--color-text-muted)]">I want to do both</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Role-specific VCs */}
        {hasUtilityVC && selectedRole && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  canComplete
                    ? 'bg-[var(--color-success)] text-white'
                    : 'bg-[var(--color-primary)] text-white'
                }`}
              >
                {canComplete ? <CheckCircle2 className="w-4 h-4" /> : '3'}
              </div>
              <h2 className="text-base font-medium text-[var(--color-text)]">
                {selectedRole === 'seller' && 'Seller Credentials'}
                {selectedRole === 'buyer' && 'Buyer Credentials'}
                {selectedRole === 'both' && 'Trading Credentials'}
              </h2>
            </div>

            {/* Seller VCs */}
            {(selectedRole === 'seller' || selectedRole === 'both') && (
              <div className="mb-4">
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                  For Selling (one required)
                </p>

                {/* Generation VC */}
                {hasGenerationVC ? (
                  <div className="p-3 rounded-[12px] bg-[var(--color-success-light)] border border-[var(--color-success)]/30 mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-sm text-[var(--color-success)]">Generation Profile verified</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => createFileInput((file) => handleFileUpload(file, 'GENERATION_PROFILE'))}
                    disabled={isUploading}
                    className="w-full p-3 mb-2 rounded-[12px] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors flex items-center gap-3"
                  >
                    <Sun className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-sm text-[var(--color-text-muted)]">Upload Generation Profile VC</span>
                  </button>
                )}

                {/* Storage VC */}
                {hasStorageVC ? (
                  <div className="p-3 rounded-[12px] bg-[var(--color-success-light)] border border-[var(--color-success)]/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-sm text-[var(--color-success)]">Storage Profile verified</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => createFileInput((file) => handleFileUpload(file, 'STORAGE_PROFILE'))}
                    disabled={isUploading}
                    className="w-full p-3 rounded-[12px] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors flex items-center gap-3"
                  >
                    <Battery className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-sm text-[var(--color-text-muted)]">Upload Storage Profile VC</span>
                  </button>
                )}
              </div>
            )}

            {/* Buyer VC */}
            {(selectedRole === 'buyer' || selectedRole === 'both') && (
              <div>
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                  For Buying (required)
                </p>

                {hasConsumptionVC ? (
                  <div className="p-3 rounded-[12px] bg-[var(--color-success-light)] border border-[var(--color-success)]/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-sm text-[var(--color-success)]">Consumption Profile verified</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => createFileInput((file) => handleFileUpload(file, 'CONSUMPTION_PROFILE'))}
                    disabled={isUploading}
                    className="w-full p-3 rounded-[12px] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors flex items-center gap-3"
                  >
                    <Gauge className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="text-sm text-[var(--color-text-muted)]">Upload Consumption Profile VC</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Complete Signup Button */}
        <div className="mt-auto pb-8">
          <button
            onClick={handleCompleteSignup}
            disabled={!canComplete || isCompletingSignup}
            className="h-[44px] w-full rounded-[12px] bg-[var(--color-primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isCompletingSignup ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Completing signup...
              </>
            ) : (
              <>
                Complete Signup
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {!canComplete && hasUtilityVC && selectedRole && (
            <p className="text-xs text-[var(--color-text-muted)] text-center mt-3">
              Upload the required credentials above to continue
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
