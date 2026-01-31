'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authApi, type VCCheck } from '@/lib/api';
import {
  Zap,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  ShieldCheck,
  BatteryCharging,
  Sun,
  Hash,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';

type OnboardingStep = 'upload' | 'analyzing' | 'success' | 'error';

interface VerificationResult {
  verified: boolean;
  checks: VCCheck[];
  extractionMethod: 'json' | 'llm' | 'direct';
}

interface GenerationProfile {
  fullName?: string;
  capacityKW?: number;
  sourceType?: string;
  meterNumber?: string;
  consumerNumber?: string;
}

export function OnboardingScreen() {
  const { updateUser } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [profile, setProfile] = useState<GenerationProfile | null>(null);
  const [resultUser, setResultUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isJson = file.type === 'application/json' || file.name.endsWith('.json');

    if (!isPdf && !isJson) {
      setError('Please select a PDF or JSON file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB.');
      return;
    }

    setFileName(file.name);
    setError(null);
    setStep('analyzing');

    try {
      let result;
      if (isJson) {
        const text = await file.text();
        const credential = JSON.parse(text);
        result = await authApi.verifyVcJson(credential);
      } else {
        const base64 = await fileToBase64(file);
        result = await authApi.verifyVcPdf(base64);
      }

      setVerification(result.verification);
      setProfile(result.generationProfile);
      setResultUser(result.user);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to verify credential. Please try again.');
      setStep('error');
    }
  };

  const handleContinue = () => {
    if (resultUser) {
      updateUser(resultUser);
    }
  };

  const handleRetry = () => {
    setStep('upload');
    setError(null);
    setFileName(null);
    setVerification(null);
    setProfile(null);
    setResultUser(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center">
      <div className="max-w-[480px] mx-auto w-full min-h-screen flex flex-col px-4 py-8 bg-[var(--color-bg)] shadow-[var(--shadow-sm)]">
        {/* Header */}
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className="w-14 h-14 bg-[var(--color-primary-light)] rounded-[16px] flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)] mb-1">
            Verify Your Credential
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] text-center max-w-[320px]">
            Upload your Generation Profile credential (PDF or JSON) to start trading energy.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {step === 'upload' && (
            <UploadStep
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              onDropZoneClick={handleDropZoneClick}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              error={error}
            />
          )}

          {step === 'analyzing' && <AnalyzingStep fileName={fileName} />}

          {step === 'success' && (
            <SuccessStep
              verification={verification}
              profile={profile}
              onContinue={handleContinue}
            />
          )}

          {step === 'error' && (
            <ErrorStep error={error} onRetry={handleRetry} />
          )}
        </div>

        {/* Footer */}
        <div className="pb-6 pt-4">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Your credential sets your production capacity and trade limit.
          </p>
        </div>
      </div>
    </div>
  );
}

function UploadStep({
  fileInputRef,
  onFileSelect,
  onDropZoneClick,
  onDragOver,
  onDrop,
  error,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDropZoneClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Info card */}
      <div className="p-4 rounded-[14px] bg-[var(--color-primary-light)] border border-[var(--color-primary)]/20">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">
              What is this?
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              A Verifiable Credential (VC) from your energy authority proves your generation capacity.
              This sets how much energy you can trade on the platform.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[12px] bg-[var(--color-danger-light)] text-sm text-[var(--color-danger)] text-center">
          {error}
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={onDropZoneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="border-2 border-dashed border-[var(--color-border)] rounded-[14px] p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-[14px] bg-[var(--color-surface)] flex items-center justify-center">
          <Upload className="h-6 w-6 text-[var(--color-text-muted)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[var(--color-text)]">
            Tap to upload PDF or JSON
          </p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            or drag and drop (max 5MB)
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,application/json,.json,.pdf"
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}

function AnalyzingStep({ fileName }: { fileName: string | null }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
      <div className="w-16 h-16 rounded-[18px] bg-[var(--color-primary-light)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[var(--color-primary)] animate-spin" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
          Verifying Credential
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Extracting and verifying your generation profile...
        </p>
        {fileName && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
            <FileText className="h-3.5 w-3.5" />
            {fileName}
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessStep({
  verification,
  profile,
  onContinue,
}: {
  verification: VerificationResult | null;
  profile: GenerationProfile | null;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Status badge */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)]">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Credential Verified</span>
        </div>
      </div>

      {/* Profile details card */}
      {profile && (
        <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-medium text-[var(--color-text)]">
              Generation Profile
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {profile.fullName && (
              <ProfileRow icon={UserIcon} label="Name" value={profile.fullName} />
            )}
            {profile.capacityKW != null && (
              <ProfileRow
                icon={BatteryCharging}
                label="Capacity"
                value={`${profile.capacityKW} kW`}
                highlight
              />
            )}
            {profile.sourceType && (
              <ProfileRow icon={Sun} label="Source" value={profile.sourceType} />
            )}
            {profile.meterNumber && (
              <ProfileRow icon={Hash} label="Meter" value={profile.meterNumber} />
            )}
            {profile.consumerNumber && (
              <ProfileRow icon={Hash} label="Consumer No." value={profile.consumerNumber} />
            )}
          </div>
        </div>
      )}

      {/* Verification checks */}
      {verification && verification.checks.length > 0 && (
        <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-medium text-[var(--color-text)]">
              Verification Checks
            </h3>
          </div>
          <div className="px-4 py-2 max-h-[160px] overflow-y-auto">
            {verification.checks.map((check, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5">
                {check.status === 'passed' ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)] flex-shrink-0" />
                ) : check.status === 'failed' ? (
                  <XCircle className="h-3.5 w-3.5 text-[var(--color-danger)] flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-warning)] flex-shrink-0" />
                )}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {check.message || check.check}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={onContinue}
        className="h-[48px] w-full rounded-[12px] bg-[var(--color-primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-2"
      >
        Continue to EnergyTrade
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ErrorStep({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
      <div className="w-16 h-16 rounded-[18px] bg-[var(--color-danger-light)] flex items-center justify-center">
        <XCircle className="h-8 w-8 text-[var(--color-danger)]" />
      </div>
      <div className="text-center max-w-[320px]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
          Verification Failed
        </h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          {error || 'Could not verify your credential. Please try again with a different file.'}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="h-[44px] px-6 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] flex items-center justify-center gap-2 hover:bg-[var(--color-primary-light)] transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className={`h-4 w-4 flex-shrink-0 ${highlight ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
      <span className="text-xs text-[var(--color-text-muted)] w-24">{label}</span>
      <span className={`text-sm flex-1 text-right ${highlight ? 'font-semibold text-[var(--color-primary)]' : 'font-medium text-[var(--color-text)]'}`}>
        {value}
      </span>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove "data:application/pdf;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
