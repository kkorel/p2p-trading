'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mic, Loader2, X, AlertCircle, Square, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceInput } from '@/hooks/use-voice-input';

/**
 * Props for the VoiceButton component
 */
export interface VoiceButtonProps {
  /** Callback when transcription is ready */
  onTranscript: (text: string) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Session ID for chat context */
  sessionId?: string;
}

/**
 * Premium voice input button with full-width recording bar for accessibility.
 * 
 * Features:
 * - Full-width recording bar (easy to see and use)
 * - Large STOP button with text (universally understood)
 * - Real-time audio level visualization
 * - Clear cancel option
 * - Designed for all users including non-tech-savvy users
 */
export function VoiceButton({ 
  onTranscript, 
  disabled = false,
  className,
}: VoiceButtonProps) {
  const [showError, setShowError] = useState(false);

  const {
    isRecording,
    isProcessing,
    error,
    duration,
    audioLevel,
    isSupported,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
  } = useVoiceInput({
    maxDuration: 30,
    minDuration: 0.5,
    onTranscript: (text: string) => {
      onTranscript(text);
    },
    onError: () => {
      setShowError(true);
    },
  });

  // Auto-hide error after 5 seconds
  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => {
        setShowError(false);
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showError, clearError]);

  const handleStartRecording = useCallback(async () => {
    if (disabled || isProcessing) return;

    if (showError) {
      setShowError(false);
      clearError();
      return;
    }

    if (!isRecording) {
      await startRecording();
    }
  }, [disabled, showError, isRecording, isProcessing, startRecording, clearError]);

  const handleStopRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleCancel = useCallback(() => {
    cancelRecording();
  }, [cancelRecording]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // When recording, render full-width recording bar
  if (isRecording) {
    return (
      <div className="absolute inset-x-0 bottom-0 z-50 animate-fade-in">
        <div className="bg-[var(--color-danger-light)] border-t-2 border-[var(--color-danger)] px-3 py-3">
          <div className="flex items-center gap-3">
            {/* Cancel button */}
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/80 hover:bg-white text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Cancel recording"
            >
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">Cancel</span>
            </button>

            {/* Recording indicator */}
            <div className="flex items-center gap-2 flex-1">
              {/* Pulsing red dot */}
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-[var(--color-danger)] animate-pulse" />
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-[var(--color-danger)] animate-ping opacity-50" />
              </div>

              {/* Duration */}
              <span className="font-mono text-base font-semibold text-[var(--color-danger)]">
                {formatDuration(duration)}
              </span>

              {/* Audio level bars */}
              <div className="flex items-end gap-0.5 h-5 ml-2">
                {[0.15, 0.3, 0.5, 0.7, 0.9, 1.0, 0.85, 0.6, 0.35, 0.2].map((threshold, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-[var(--color-danger)] transition-all duration-75"
                    style={{
                      height: `${Math.max(4, (audioLevel >= threshold * 0.4 ? audioLevel : 0.1) * 20)}px`,
                      opacity: audioLevel >= threshold * 0.25 ? 0.9 : 0.3,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Large STOP button */}
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-danger)] hover:bg-[#dc2626] text-white font-semibold text-base shadow-lg hover:shadow-xl active:scale-95 transition-all"
              aria-label="Stop recording and send"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>STOP</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // When processing, show processing indicator
  if (isProcessing) {
    return (
      <div className={cn('relative', className)}>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 animate-fade-in">
          <div className="flex items-center gap-2 bg-white rounded-full shadow-lg px-4 py-2 border border-[var(--color-border)]">
            <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
            <span className="text-sm text-[var(--color-text-secondary)]">Processing...</span>
          </div>
        </div>
        <button
          disabled
          className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-primary-light)] text-[var(--color-primary)] cursor-wait"
          type="button"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </button>
      </div>
    );
  }

  // Default: mic button
  return (
    <div className={cn('relative', className)}>
      {/* Error tooltip */}
      {showError && error && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 animate-fade-in">
          <div className="bg-[var(--color-danger)] text-white text-xs rounded-lg px-3 py-2 shadow-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p>{error.message}</p>
            </div>
            {error.retryable && (
              <p className="mt-1 text-white/80 text-[10px]">Tap mic to try again</p>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--color-danger)]" />
          </div>
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={handleStartRecording}
        disabled={disabled || !isSupported}
        className={cn(
          // Base styles
          'relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
          
          // Normal state
          !showError && [
            'bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
            'hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]',
            'active:scale-95',
          ],
          
          // Error state
          showError && [
            'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
            'hover:bg-[var(--color-danger)] hover:text-white',
          ],
          
          disabled && 'opacity-40 cursor-not-allowed',
        )}
        aria-label={showError ? 'Try again' : 'Start voice recording'}
        title={showError ? 'Tap to try again' : 'Tap to speak'}
        type="button"
      >
        {showError ? (
          <AlertCircle className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}

/**
 * Compact voice button variant for tight spaces
 */
export function VoiceButtonCompact({ 
  onTranscript, 
  disabled = false,
  className,
}: VoiceButtonProps) {
  const {
    isRecording,
    isProcessing,
    error,
    isSupported,
    startRecording,
    stopRecording,
    clearError,
  } = useVoiceInput({
    maxDuration: 30,
    minDuration: 0.5,
    onTranscript,
  });

  const handleClick = useCallback(async () => {
    if (disabled) return;

    if (error) {
      clearError();
    }

    if (isRecording) {
      stopRecording();
    } else if (!isProcessing) {
      await startRecording();
    }
  }, [disabled, error, isRecording, isProcessing, startRecording, stopRecording, clearError]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isProcessing || !isSupported}
      className={cn(
        'p-1.5 rounded-full transition-all duration-150',
        !isRecording && !isProcessing && 'text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
        isRecording && 'text-white bg-[var(--color-danger)] animate-pulse',
        isProcessing && 'text-[var(--color-primary)] bg-[var(--color-primary-light)]',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
      aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
      type="button"
    >
      {isProcessing ? (
        <Loader2 className="w-[18px] h-[18px] animate-spin" />
      ) : isRecording ? (
        <MicOff className="w-[18px] h-[18px]" />
      ) : (
        <Mic className="w-[18px] h-[18px]" />
      )}
    </button>
  );
}
