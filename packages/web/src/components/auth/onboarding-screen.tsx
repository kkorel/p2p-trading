'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  authApi,
  type VCCheck,
  type DEGCredentialType,
  type VerifyCredentialResponse,
} from '@/lib/api';
import {
  Zap,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  ShieldCheck,
  Hash,
  User as UserIcon,
  RefreshCw,
  Sun,
  Battery,
  BarChart2,
  Award,
  MapPin,
  Check,
  SkipForward,
  AlertTriangle,
  Info,
} from 'lucide-react';

// --- Credential type metadata ---

type OptionalCredentialType = Exclude<DEGCredentialType, 'UtilityCustomerCredential'>;

const OPTIONAL_CREDENTIALS: {
  type: OptionalCredentialType;
  label: string;
  description: string;
  icon: any;
}[] = [
  {
    type: 'ConsumptionProfileCredential',
    label: 'Consumption Profile',
    description: 'Electricity consumption, sanctioned load, and tariff details',
    icon: BarChart2,
  },
  {
    type: 'GenerationProfileCredential',
    label: 'Generation Profile',
    description: 'Solar/wind generation capacity and commissioning info',
    icon: Sun,
  },
  {
    type: 'StorageProfileCredential',
    label: 'Storage Profile',
    description: 'Battery storage capacity and power rating',
    icon: Battery,
  },
  {
    type: 'UtilityProgramEnrollmentCredential',
    label: 'Program Enrollment',
    description: 'Net metering or utility program enrollment',
    icon: Award,
  },
];

const CREDENTIAL_LABELS: Record<DEGCredentialType, string> = {
  UtilityCustomerCredential: 'Utility Customer',
  ConsumptionProfileCredential: 'Consumption Profile',
  GenerationProfileCredential: 'Generation Profile',
  StorageProfileCredential: 'Storage Profile',
  UtilityProgramEnrollmentCredential: 'Program Enrollment',
};

const CREDENTIAL_HELP_TEXT: Record<DEGCredentialType, string> = {
  UtilityCustomerCredential:
    'A digital certificate from your electricity utility that proves you are a registered customer. This is required to participate in energy trading and ensures all traders are legitimate grid-connected users.',
  ConsumptionProfileCredential:
    'Details about your electricity consumption patterns, sanctioned load, and tariff category. This helps match you with suitable energy offers.',
  GenerationProfileCredential:
    'Information about your solar, wind, or other renewable energy generation capacity. This credential allows you to sell excess energy on the platform.',
  StorageProfileCredential:
    'Battery storage capacity and specifications. Useful if you have home battery systems for energy storage and trading.',
  UtilityProgramEnrollmentCredential:
    'Proof of enrollment in net metering or other utility programs. This may unlock additional trading features.',
};

// --- Interfaces ---

interface VerifiedCredential {
  type: DEGCredentialType;
  claims: Record<string, any>;
  checks: VCCheck[];
}

type WizardPhase = 'welcome' | 'utility' | 'select' | 'optional' | 'complete';
type UploadState = 'idle' | 'verifying' | 'success' | 'error';

// --- Main Component ---

export function OnboardingScreen() {
  const { updateUser } = useAuth();
  const [phase, setPhase] = useState<WizardPhase>('welcome');
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<VerifyCredentialResponse | null>(null);
  const [verifiedCredentials, setVerifiedCredentials] = useState<VerifiedCredential[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<OptionalCredentialType[]>([]);
  const [currentOptionalIndex, setCurrentOptionalIndex] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [typeMismatch, setTypeMismatch] = useState<{
    expected: DEGCredentialType;
    actual: DEGCredentialType;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentCredentialType: DEGCredentialType =
    phase === 'utility'
      ? 'UtilityCustomerCredential'
      : phase === 'optional'
      ? selectedTypes[currentOptionalIndex]
      : 'UtilityCustomerCredential';

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
    setUploadState('verifying');

    try {
      let params: { credential?: object; pdfBase64?: string } = {};
      if (isJson) {
        const text = await file.text();
        params.credential = JSON.parse(text);
      } else {
        params.pdfBase64 = await fileToBase64(file);
      }

      const result = await authApi.verifyCredential(params);
      setCurrentResult(result);
      
      // Check for credential type mismatch
      if (result.credentialType !== currentCredentialType) {
        setTypeMismatch({
          expected: currentCredentialType,
          actual: result.credentialType,
        });
      } else {
        setTypeMismatch(null);
      }
      
      setUploadState('success');
    } catch (err: any) {
      setError(err.message || 'Failed to verify credential. Please try again.');
      setUploadState('error');
    }
  };

  const handleAcceptCredential = () => {
    if (!currentResult) return;

    setVerifiedCredentials((prev) => [
      ...prev.filter((c) => c.type !== currentResult.credentialType),
      {
        type: currentResult.credentialType,
        claims: currentResult.extractedClaims,
        checks: currentResult.verification.checks,
      },
    ]);

    if (phase === 'utility') {
      setPhase('select');
    } else if (phase === 'optional') {
      moveToNextOptional();
    }

    resetUploadState();
  };

  const moveToNextOptional = () => {
    const nextIndex = currentOptionalIndex + 1;
    if (nextIndex < selectedTypes.length) {
      setCurrentOptionalIndex(nextIndex);
    } else {
      setPhase('complete');
    }
  };

  const handleSkipOptional = () => {
    moveToNextOptional();
    resetUploadState();
  };

  const resetUploadState = () => {
    setUploadState('idle');
    setError(null);
    setFileName(null);
    setCurrentResult(null);
    setTypeMismatch(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetry = () => {
    setUploadState('idle');
    setError(null);
    setFileName(null);
    setCurrentResult(null);
    setTypeMismatch(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectionContinue = () => {
    if (selectedTypes.length === 0) {
      setPhase('complete');
    } else {
      setCurrentOptionalIndex(0);
      setPhase('optional');
    }
  };

  const toggleSelection = (type: OptionalCredentialType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const result = await authApi.completeOnboarding();
      updateUser(result.user);
    } catch (err: any) {
      setError(err.message || 'Failed to complete onboarding.');
      setCompleting(false);
    }
  };

  const phaseIndex =
    phase === 'welcome' ? 0 : phase === 'utility' ? 1 : phase === 'select' ? 2 : phase === 'optional' ? 3 : 4;

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center">
      <div className="max-w-[480px] mx-auto w-full min-h-screen flex flex-col px-4 py-8 bg-[var(--color-bg)] shadow-[var(--shadow-sm)]">
        {/* Header */}
        <div className="flex flex-col items-center pt-6 pb-4">
          <div className="w-14 h-14 bg-[var(--color-primary-light)] rounded-[16px] flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)] mb-1">
            {phase === 'welcome' ? 'Welcome to EnergyTrade' : 'Verify Your Credentials'}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] text-center max-w-[320px]">
            {phase === 'welcome' 
              ? "Let's get you set up to trade renewable energy"
              : 'Upload your energy credentials to start trading on the platform.'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-center gap-1.5 pb-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i <= phaseIndex
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-border)]'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {phase === 'welcome' && (
            <WelcomePhase onContinue={() => setPhase('utility')} />
          )}

          {phase === 'utility' && (
            <CredentialUploadPhase
              title="Utility Customer Credential"
              subtitle="This is your base identity credential from your electricity utility. Required for all users."
              mandatory
              credentialType="UtilityCustomerCredential"
              uploadState={uploadState}
              fileName={fileName}
              error={error}
              result={currentResult}
              typeMismatch={typeMismatch}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              onAccept={handleAcceptCredential}
              onRetry={handleRetry}
            />
          )}

          {phase === 'select' && (
            <SelectionPhase
              selectedTypes={selectedTypes}
              onToggle={toggleSelection}
              onContinue={handleSelectionContinue}
            />
          )}

          {phase === 'optional' && (
            <CredentialUploadPhase
              title={CREDENTIAL_LABELS[currentCredentialType]}
              subtitle={
                OPTIONAL_CREDENTIALS.find((c) => c.type === currentCredentialType)
                  ?.description || ''
              }
              mandatory={false}
              progress={`${currentOptionalIndex + 1} of ${selectedTypes.length}`}
              credentialType={currentCredentialType}
              uploadState={uploadState}
              fileName={fileName}
              error={error}
              result={currentResult}
              typeMismatch={typeMismatch}
              fileInputRef={fileInputRef}
              onFileSelect={handleFileSelect}
              onAccept={handleAcceptCredential}
              onRetry={handleRetry}
              onSkip={handleSkipOptional}
            />
          )}

          {phase === 'complete' && (
            <CompletePhase
              verifiedCredentials={verifiedCredentials}
              selectedTypes={selectedTypes}
              completing={completing}
              error={error}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Footer */}
        <div className="pb-6 pt-4">
          <p className="text-xs text-[var(--color-text-muted)] text-center">
            Your credentials determine your trading capabilities and limits.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Phase Components ---

function WelcomePhase({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Introduction cards */}
      <div className="flex-1 flex flex-col gap-4 px-1">
        {/* What are VCs */}
        <div className="p-4 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">
                What are Verifiable Credentials?
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Digital certificates that prove your identity and energy profile. They're issued by your electricity utility or approved authorities.
              </p>
            </div>
          </div>
        </div>

        {/* Why we need them */}
        <div className="p-4 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--color-success-light)] flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">
                Why do we need them?
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                To ensure all traders are legitimate grid-connected users. This protects both buyers and sellers in the energy marketplace.
              </p>
            </div>
          </div>
        </div>

        {/* What you'll need */}
        <div className="p-4 rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--color-warning-light)] flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--color-text)] mb-1">
                What you'll need
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                Your <strong>Utility Customer Credential</strong> (required) — a PDF or JSON file from your electricity provider. Optional credentials unlock more trading features.
              </p>
            </div>
          </div>
        </div>

        {/* Privacy note */}
        <div className="p-3 rounded-[12px] bg-[var(--color-info-light)] border border-[var(--color-info)]/20">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-[var(--color-info)] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="font-medium text-[var(--color-text)]">Your data is secure.</span> We only extract relevant information and store it encrypted. Your credentials never leave your control.
            </p>
          </div>
        </div>
      </div>

      {/* Continue button */}
      <div className="pt-6 pb-2">
        <button
          onClick={onContinue}
          className="h-[44px] w-full rounded-[12px] bg-[var(--color-primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CredentialUploadPhase({
  title,
  subtitle,
  mandatory,
  progress,
  credentialType,
  uploadState,
  fileName,
  error,
  result,
  typeMismatch,
  fileInputRef,
  onFileSelect,
  onAccept,
  onRetry,
  onSkip,
}: {
  title: string;
  subtitle: string;
  mandatory: boolean;
  progress?: string;
  credentialType: DEGCredentialType;
  uploadState: UploadState;
  fileName: string | null;
  error: string | null;
  result: VerifyCredentialResponse | null;
  typeMismatch: { expected: DEGCredentialType; actual: DEGCredentialType } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAccept: () => void;
  onRetry: () => void;
  onSkip?: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const helpText = CREDENTIAL_HELP_TEXT[credentialType];
  
  const handleDropZoneClick = () => fileInputRef.current?.click();
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
    <div className="flex flex-col gap-4">
      {/* Title bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
          {progress && (
            <span className="text-xs text-[var(--color-text-muted)]">
              Credential {progress}
            </span>
          )}
        </div>
        {mandatory && (
          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            Required
          </span>
        )}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed -mt-2">
        {subtitle}
      </p>

      {/* Collapsible help section */}
      {helpText && (
        <div className="-mt-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
          >
            <Info className="h-3.5 w-3.5" />
            {showHelp ? 'Hide details' : 'What is this?'}
          </button>
          {showHelp && (
            <div className="mt-2 p-3 rounded-[10px] bg-[var(--color-primary-light)]/50 border border-[var(--color-primary)]/20">
              <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                {helpText}
              </p>
            </div>
          )}
        </div>
      )}

      {uploadState === 'idle' && (
        <>
          {error && (
            <div className="p-3 rounded-[12px] bg-[var(--color-danger-light)] text-sm text-[var(--color-danger)] text-center">
              {error}
            </div>
          )}

          <div
            onClick={handleDropZoneClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
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

          {!mandatory && onSkip && (
            <button
              onClick={onSkip}
              className="h-[40px] w-full rounded-[12px] text-sm text-[var(--color-text-muted)] flex items-center justify-center gap-1 hover:text-[var(--color-text)] transition-colors"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Skip this credential
            </button>
          )}
        </>
      )}

      {uploadState === 'verifying' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-14 h-14 rounded-[16px] bg-[var(--color-primary-light)] flex items-center justify-center">
            <Loader2 className="h-7 w-7 text-[var(--color-primary)] animate-spin" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Verifying credential...
          </p>
          {fileName && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--color-surface)] text-xs text-[var(--color-text-muted)]">
              <FileText className="h-3.5 w-3.5" />
              {fileName}
            </div>
          )}
        </div>
      )}

      {uploadState === 'success' && result && (
        <CredentialResultCard
          result={result}
          typeMismatch={typeMismatch}
          mandatory={mandatory}
          onAccept={onAccept}
          onRetry={onRetry}
        />
      )}

      {uploadState === 'error' && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-14 h-14 rounded-[16px] bg-[var(--color-danger-light)] flex items-center justify-center">
            <XCircle className="h-7 w-7 text-[var(--color-danger)]" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] text-center max-w-[280px]">
            {error || 'Could not verify credential. Please try again.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onRetry}
              className="h-[40px] px-5 rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] flex items-center justify-center gap-2 hover:bg-[var(--color-primary-light)] transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            {!mandatory && onSkip && (
              <button
                onClick={onSkip}
                className="h-[40px] px-5 rounded-[12px] text-sm text-[var(--color-text-muted)] flex items-center justify-center gap-1 hover:text-[var(--color-text)] transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CredentialResultCard({
  result,
  typeMismatch,
  mandatory,
  onAccept,
  onRetry,
}: {
  result: VerifyCredentialResponse;
  typeMismatch: { expected: DEGCredentialType; actual: DEGCredentialType } | null;
  mandatory: boolean;
  onAccept: () => void;
  onRetry: () => void;
}) {
  const claimEntries = getDisplayClaims(result.credentialType, result.extractedClaims || {});

  return (
    <div className="flex flex-col gap-3">
      {/* Type mismatch warning */}
      {typeMismatch && (
        <div className="p-3 rounded-[12px] bg-[var(--color-warning-light)] border border-[var(--color-warning)]/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-warning)]">
                Credential Type Mismatch
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                You uploaded a <span className="font-medium">{CREDENTIAL_LABELS[typeMismatch.actual]}</span> but 
                we need a <span className="font-medium">{CREDENTIAL_LABELS[typeMismatch.expected]}</span>.
                {mandatory 
                  ? ' Please upload the correct credential type.'
                  : ' You can continue anyway or upload the correct file.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verified badge */}
      <div className="flex items-center justify-center">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          typeMismatch 
            ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
            : 'bg-[var(--color-success-light)] text-[var(--color-success)]'
        }`}>
          {typeMismatch ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {typeMismatch ? 'Wrong Credential Type' : 'Credential Verified'}
          </span>
        </div>
      </div>

      {/* Extracted claims */}
      {claimEntries.length > 0 && (
        <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-medium text-[var(--color-text)]">
              {CREDENTIAL_LABELS[result.credentialType]}
            </h3>
          </div>
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {claimEntries.map(({ icon: Icon, label, value, highlight }) => (
              <ProfileRow
                key={label}
                icon={Icon}
                label={label}
                value={value}
                highlight={highlight}
              />
            ))}
          </div>
        </div>
      )}

      {/* Verification checks */}
      {result.verification.checks.length > 0 && (
        <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="text-sm font-medium text-[var(--color-text)]">
              Verification Checks
            </h3>
          </div>
          <div className="px-4 py-2 max-h-[140px] overflow-y-auto">
            {result.verification.checks.map((check, i) => (
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

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {/* Only show Continue if no mismatch OR if not mandatory */}
        {(!typeMismatch || !mandatory) && (
          <button
            onClick={onAccept}
            className={`h-[48px] flex-1 rounded-[12px] text-sm font-medium flex items-center justify-center gap-2 transition-opacity ${
              typeMismatch
                ? 'bg-[var(--color-warning)] text-white hover:opacity-90'
                : 'bg-[var(--color-primary)] text-white hover:opacity-90'
            }`}
          >
            {typeMismatch ? 'Continue Anyway' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onRetry}
          className={`h-[48px] rounded-[12px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-primary-light)] transition-colors ${
            typeMismatch && mandatory ? 'flex-1 gap-2' : 'w-[48px]'
          }`}
          title="Upload different file"
        >
          <RefreshCw className="h-4 w-4 text-[var(--color-text-muted)]" />
          {typeMismatch && mandatory && (
            <span className="text-sm font-medium text-[var(--color-text)]">Upload Correct File</span>
          )}
        </button>
      </div>
    </div>
  );
}

function SelectionPhase({
  selectedTypes,
  onToggle,
  onContinue,
}: {
  selectedTypes: OptionalCredentialType[];
  onToggle: (type: OptionalCredentialType) => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--color-text)]">
          Additional Credentials
        </h2>
        <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
          Select which additional credentials you have. These are optional but
          unlock more trading capabilities.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {OPTIONAL_CREDENTIALS.map(({ type, label, description, icon: Icon }) => {
          const selected = selectedTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => onToggle(type)}
              className={`p-4 rounded-[14px] border-2 text-left flex items-start gap-3 transition-colors ${
                selected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/50'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <Icon
                className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  selected
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)]'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    selected
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-text)]'
                  }`}
                >
                  {label}
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {description}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  selected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                    : 'border-[var(--color-border)]'
                }`}
              >
                {selected && <Check className="h-3 w-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        className="h-[48px] w-full rounded-[12px] bg-[var(--color-primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-2"
      >
        {selectedTypes.length > 0 ? (
          <>
            Continue with {selectedTypes.length} credential
            {selectedTypes.length > 1 ? 's' : ''}
            <ArrowRight className="h-4 w-4" />
          </>
        ) : (
          <>
            Skip & Finish Setup
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}

function CompletePhase({
  verifiedCredentials,
  selectedTypes,
  completing,
  error,
  onComplete,
}: {
  verifiedCredentials: VerifiedCredential[];
  selectedTypes: OptionalCredentialType[];
  completing: boolean;
  error: string | null;
  onComplete: () => void;
}) {
  const verifiedTypes = verifiedCredentials.map((c) => c.type);
  const skippedTypes = selectedTypes.filter((t) => !verifiedTypes.includes(t));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)]">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">Setup Complete</span>
        </div>
      </div>

      <div className="rounded-[14px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <h3 className="text-sm font-medium text-[var(--color-text)]">
            Your Credentials
          </h3>
        </div>
        <div className="divide-y divide-[var(--color-border-subtle)]">
          {/* Always show utility customer first */}
          <CredentialSummaryRow
            type="UtilityCustomerCredential"
            status="verified"
          />
          {/* Verified optional credentials */}
          {verifiedCredentials
            .filter((c) => c.type !== 'UtilityCustomerCredential')
            .map((c) => (
              <CredentialSummaryRow
                key={c.type}
                type={c.type}
                status="verified"
              />
            ))}
          {/* Skipped ones */}
          {skippedTypes.map((type) => (
            <CredentialSummaryRow key={type} type={type} status="skipped" />
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-[12px] bg-[var(--color-danger-light)] text-sm text-[var(--color-danger)] text-center">
          {error}
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={completing}
        className="h-[48px] w-full rounded-[12px] bg-[var(--color-primary)] text-white text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mt-2 disabled:opacity-50"
      >
        {completing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Finishing setup...
          </>
        ) : (
          <>
            Start Trading
            <Zap className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}

// --- Helper Components ---

function CredentialSummaryRow({
  type,
  status,
}: {
  type: DEGCredentialType;
  status: 'verified' | 'skipped';
}) {
  const meta =
    type === 'UtilityCustomerCredential'
      ? { icon: UserIcon, label: 'Utility Customer' }
      : OPTIONAL_CREDENTIALS.find((c) => c.type === type) || {
          icon: FileText,
          label: type,
        };

  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className="h-4 w-4 text-[var(--color-text-muted)] flex-shrink-0" />
      <span className="text-sm font-medium text-[var(--color-text)] flex-1">
        {meta.label}
      </span>
      {status === 'verified' ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-success)]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Verified
        </span>
      ) : (
        <span className="text-xs text-[var(--color-text-muted)]">Skipped</span>
      )}
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
      <Icon
        className={`h-4 w-4 flex-shrink-0 ${
          highlight
            ? 'text-[var(--color-primary)]'
            : 'text-[var(--color-text-muted)]'
        }`}
      />
      <span className="text-xs text-[var(--color-text-muted)] w-24">{label}</span>
      <span
        className={`text-sm flex-1 text-right ${
          highlight
            ? 'font-semibold text-[var(--color-primary)]'
            : 'font-medium text-[var(--color-text)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// --- Utility Functions ---

function getDisplayClaims(
  type: DEGCredentialType,
  claims: Record<string, any>
): { icon: any; label: string; value: string; highlight?: boolean }[] {
  const rows: { icon: any; label: string; value: string; highlight?: boolean }[] =
    [];

  switch (type) {
    case 'UtilityCustomerCredential':
      if (claims.fullName)
        rows.push({ icon: UserIcon, label: 'Name', value: claims.fullName });
      if (claims.consumerNumber)
        rows.push({
          icon: Hash,
          label: 'Consumer No.',
          value: claims.consumerNumber,
        });
      if (claims.meterNumber)
        rows.push({ icon: Hash, label: 'Meter No.', value: claims.meterNumber });
      if (claims.installationAddress)
        rows.push({
          icon: MapPin,
          label: 'Address',
          value: claims.installationAddress,
        });
      break;
    case 'ConsumptionProfileCredential':
      if (claims.premisesType)
        rows.push({
          icon: BarChart2,
          label: 'Premises',
          value: claims.premisesType,
        });
      if (claims.connectionType)
        rows.push({
          icon: Zap,
          label: 'Connection',
          value: claims.connectionType,
        });
      if (claims.sanctionedLoadKW != null)
        rows.push({
          icon: Zap,
          label: 'Sanctioned Load',
          value: `${claims.sanctionedLoadKW} kW`,
          highlight: true,
        });
      if (claims.tariffCategoryCode)
        rows.push({
          icon: Hash,
          label: 'Tariff Code',
          value: claims.tariffCategoryCode,
        });
      break;
    case 'GenerationProfileCredential':
      if (claims.generationType)
        rows.push({ icon: Sun, label: 'Source', value: claims.generationType });
      if (claims.capacityKW != null) {
        rows.push({
          icon: Zap,
          label: 'Capacity',
          value: `${claims.capacityKW} kW`,
          highlight: true,
        });
        rows.push({
          icon: Zap,
          label: 'Est. Monthly',
          value: `${Math.round(claims.capacityKW * 4.5 * 30)} kWh/mo`,
        });
      }
      if (claims.commissioningDate)
        rows.push({
          icon: Hash,
          label: 'Commissioned',
          value: claims.commissioningDate,
        });
      break;
    case 'StorageProfileCredential':
      if (claims.storageType)
        rows.push({ icon: Battery, label: 'Type', value: claims.storageType });
      if (claims.storageCapacityKWh != null)
        rows.push({
          icon: Battery,
          label: 'Capacity',
          value: `${claims.storageCapacityKWh} kWh`,
          highlight: true,
        });
      if (claims.powerRatingKW != null)
        rows.push({
          icon: Zap,
          label: 'Power Rating',
          value: `${claims.powerRatingKW} kW`,
        });
      break;
    case 'UtilityProgramEnrollmentCredential':
      if (claims.programName)
        rows.push({
          icon: Award,
          label: 'Program',
          value: claims.programName,
          highlight: true,
        });
      if (claims.programCode)
        rows.push({ icon: Hash, label: 'Code', value: claims.programCode });
      if (claims.enrollmentDate)
        rows.push({
          icon: Hash,
          label: 'Enrolled',
          value: claims.enrollmentDate,
        });
      break;
  }

  return rows;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
