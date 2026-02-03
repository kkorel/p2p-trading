'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Send, Paperclip, RotateCcw, LayoutGrid, TrendingUp, Wallet, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MessageList } from './message-list';
import { VoiceButton } from './voice-button';
import { useChatEngine } from '@/hooks/use-chat-engine';
import { useAuth } from '@/contexts/auth-context';
import { useBalance } from '@/contexts/balance-context';
import { useP2PStats } from '@/contexts/p2p-stats-context';
import { useVoiceSettings } from '@/hooks/use-voice-settings';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { formatCurrency } from '@/lib/utils';

export function ChatPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, refreshUser } = useAuth();
  const { balance, refreshBalance } = useBalance();
  const { totalValue, isLoading: statsLoading, refresh: refreshStats } = useP2PStats();
  const { isAutoPlayActive, setAutoPlay, speaker, pace, isLoaded: settingsLoaded } = useVoiceSettings();
  const { play: playTTS, stop: stopTTS, isPlaying } = useAudioPlayer({
    defaultSpeaker: speaker,
    defaultPace: pace,
  });
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    sessionId,
    fileInputRef,
    handleSend,
    handleKeyDown,
    handleButtonClick,
    handleReset,
    handleFileUpload,
    handleVoiceResult,
    responseLanguage,
    setResponseLanguage,
  } = useChatEngine();

  // Track for auto-play
  const prevMsgCount = useRef(messages.length);
  const lastAutoPlayedIdx = useRef(-1);
  const isInitialized = useRef(false);
  
  // Queue for playing multiple messages sequentially
  const playQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Toast notification for voice toggle
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to skip auto-play effect when toggle just played a message
  const skipAutoPlayOnceRef = useRef(false);
  
  // Initialize: mark existing messages as "already played" to prevent auto-play on load
  useEffect(() => {
    if (!isInitialized.current && settingsLoaded) {
      lastAutoPlayedIdx.current = messages.length - 1;
      isInitialized.current = true;
    }
  }, [settingsLoaded, messages.length]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTTS();
      playQueueRef.current = [];
      isPlayingQueueRef.current = false;
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
    };
  }, [stopTTS]);
  
  // Enhanced toggle handler with feedback
  const handleVoiceToggle = useCallback(() => {
    const turningOn = !isAutoPlayActive;
    
    // Stop any current playback first
    stopTTS();
    playQueueRef.current = [];
    isPlayingQueueRef.current = false;
    if (queueTimeoutRef.current) {
      clearTimeout(queueTimeoutRef.current);
      queueTimeoutRef.current = null;
    }
    
    // Use setAutoPlay with explicit value (not toggle) to avoid localStorage sync issues
    setAutoPlay(turningOn);
    
    // Show toast feedback
    const message = turningOn ? '🔊 Voice ON' : '🔇 Voice OFF';
    setVoiceToast(message);
    
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Hide toast after 2 seconds
    toastTimeoutRef.current = setTimeout(() => {
      setVoiceToast(null);
    }, 2000);
    
    // If turning ON and there are agent messages, play the most recent one
    if (turningOn && messages.length > 0) {
      const lastAgentMsg = [...messages].reverse().find(m => m.role === 'agent');
      if (lastAgentMsg && lastAgentMsg.content.length > 0) {
        // Mark messages as played so auto-play effect doesn't duplicate
        lastAutoPlayedIdx.current = messages.length - 1;
        skipAutoPlayOnceRef.current = true;
        
        // Play the latest message
        queueTimeoutRef.current = setTimeout(() => {
          playTTS(lastAgentMsg.content, responseLanguage, speaker, pace).catch(() => {});
        }, 300);
      }
    }
  }, [isAutoPlayActive, setAutoPlay, messages, responseLanguage, speaker, pace, playTTS, stopTTS]);
  
  // Refresh balance + stats when new agent messages arrive (e.g. after auth, offer creation)
  useEffect(() => {
    if (messages.length > prevMsgCount.current && user) {
      refreshBalance();
      refreshStats();
    }
    prevMsgCount.current = messages.length;
  }, [messages.length, user, refreshBalance, refreshStats]);

  // Listen for voice preference sync from server (legacy - kept for backward compatibility)
  useEffect(() => {
    const handleVoicePref = (e: CustomEvent<{ enabled: boolean }>) => {
      if (e.detail?.enabled !== undefined) {
        setAutoPlay(e.detail.enabled);
      }
    };
    window.addEventListener('voice:preference', handleVoicePref as EventListener);
    return () => window.removeEventListener('voice:preference', handleVoicePref as EventListener);
  }, [setAutoPlay]);

  // Play queued messages sequentially
  const playNextInQueue = useCallback(async () => {
    if (playQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      return;
    }
    isPlayingQueueRef.current = true;
    const text = playQueueRef.current.shift()!;
    
    try {
      await playTTS(text, responseLanguage, speaker, pace);
      // Small delay between messages, then play next
      queueTimeoutRef.current = setTimeout(playNextInQueue, 300);
    } catch (err) {
      // Only log if it's not a cancellation or interruption
      const isExpectedError = err instanceof Error && (
        err.message.includes('Cancelled') || 
        err.message.includes('Stopped by')
      );
      if (!isExpectedError) {
        console.error('[AutoPlay] Failed to play:', err);
      }
      // Continue to next message even on error (unless stopped)
      if (!isExpectedError || err instanceof Error && err.message.includes('Cancelled')) {
        queueTimeoutRef.current = setTimeout(playNextInQueue, 100);
      } else {
        // Stopped by another player - don't continue auto-queue
        isPlayingQueueRef.current = false;
      }
    }
  }, [playTTS, responseLanguage, speaker, pace]);

  // Auto-play TTS for new agent messages
  useEffect(() => {
    // Skip if settings not loaded or not initialized
    if (!settingsLoaded || !isInitialized.current) return;
    
    // Skip if auto-play not active
    if (!isAutoPlayActive) return;
    
    // Skip once if toggle handler just played a message
    if (skipAutoPlayOnceRef.current) {
      skipAutoPlayOnceRef.current = false;
      return;
    }
    
    // Find all new agent messages since last played
    const newAgentMessages: string[] = [];
    for (let i = lastAutoPlayedIdx.current + 1; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'agent' && msg.content.length > 0) {
        newAgentMessages.push(msg.content);
      }
    }
    
    if (newAgentMessages.length === 0) return;
    
    // Update last played index
    lastAutoPlayedIdx.current = messages.length - 1;
    
    // Add to queue and start playing if not already
    playQueueRef.current.push(...newAgentMessages);
    if (!isPlayingQueueRef.current) {
      // Clear any pending timeout and start fresh
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
      // Small delay to let UI update first
      queueTimeoutRef.current = setTimeout(playNextInQueue, 300);
    }
  }, [messages, isAutoPlayActive, settingsLoaded, playNextInQueue]);

  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-[480px] flex flex-col min-h-screen bg-white">
        {/* Header — sticky */}
        <div className="sticky top-0 z-30 flex items-center gap-2 px-3.5 py-2.5 bg-teal-600 text-white safe-top">
          {/* Logo */}
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold">O</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Oorja</h1>
            <p className="text-[11px] text-teal-200">Energy trading assistant</p>
          </div>

          {/* Balance info — shown only when logged in */}
          {user && (
            <>
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-xs font-medium shrink-0"
                title="P2P Earnings"
              >
                <TrendingUp size={12} />
                <span>{formatCurrency(totalValue)}</span>
              </div>
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-xs font-medium shrink-0"
                title="Wallet Balance"
              >
                <Wallet size={12} />
                <span>{formatCurrency(balance)}</span>
              </div>
            </>
          )}

          {/* Voice Toggle - Large, accessible button with clear text labels */}
          {settingsLoaded && (
            <button
              onClick={handleVoiceToggle}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 shrink-0 font-semibold text-base ${
                isAutoPlayActive 
                  ? 'bg-white text-teal-600 shadow-lg' 
                  : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
              }`}
              title={isAutoPlayActive ? 'Voice is ON - tap to turn off' : 'Voice is OFF - tap to turn on'}
              aria-label={isAutoPlayActive ? 'Turn off voice responses' : 'Turn on voice responses'}
            >
              {isAutoPlayActive ? (
                <>
                  <div className="relative">
                    <Volume2 size={22} className="relative z-10" />
                    {/* Animated sound waves */}
                    <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-teal-500 rounded-full animate-ping" />
                  </div>
                  <span className="whitespace-nowrap">Voice On</span>
                </>
              ) : (
                <>
                  <VolumeX size={22} />
                  <span className="whitespace-nowrap">Voice Off</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={handleReset}
            className="p-1.5 rounded-full hover:bg-teal-500/80 transition-colors shrink-0"
            title="New chat"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={async () => {
              await refreshUser();
              router.push('/buy');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-xs font-medium shrink-0"
            title="Open App"
          >
            <LayoutGrid size={14} />
            <span>App</span>
          </button>
        </div>

        {/* Voice Toggle Toast Notification - Large and clear */}
        {voiceToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className={`flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-base font-semibold ${
              voiceToast.includes('ON') 
                ? 'bg-teal-600 text-white' 
                : 'bg-gray-800 text-white'
            }`}>
              {voiceToast.includes('ON') ? (
                <Volume2 size={22} />
              ) : (
                <VolumeX size={22} />
              )}
              <span>{voiceToast.includes('ON') ? 'Voice is ON' : 'Voice is OFF'}</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <MessageList 
            messages={messages} 
            onButtonClick={handleButtonClick} 
            isLoading={isLoading}
            responseLanguage={responseLanguage}
          />
        </div>

        {/* Input area */}
        <div className="relative border-t border-gray-100 bg-white px-2.5 py-2 safe-bottom">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-full text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              title="Upload file"
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.json,application/pdf,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or speak..."
              className="flex-1 py-2 px-3.5 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-teal-200 transition-all"
              disabled={isLoading}
            />
            {/* Voice input button */}
            <VoiceButton
              sessionId={sessionId || undefined}
              onVoiceResult={(result) => {
                // Update response language for TTS
                if (result.responseLanguage) {
                  setResponseLanguage(result.responseLanguage);
                } else if (result.language) {
                  setResponseLanguage(result.language);
                }
                // Handle the full voice result (includes agent messages - no double processing)
                handleVoiceResult(result);
              }}
              onRecordingStart={() => {
                // Stop any playing TTS when user starts recording
                stopTTS();
                playQueueRef.current = [];
                isPlayingQueueRef.current = false;
                if (queueTimeoutRef.current) {
                  clearTimeout(queueTimeoutRef.current);
                  queueTimeoutRef.current = null;
                }
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-full bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
