'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { X, Send, Paperclip, Bot, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { MessageList } from './message-list';
import { VoiceButton } from './voice-button';
import { useChatEngine } from '@/hooks/use-chat-engine';
import { useVoiceSettings } from '@/hooks/use-voice-settings';
import { useAudioPlayer } from '@/hooks/use-audio-player';

interface ChatOverlayProps {
  onClose: () => void;
}

export function ChatOverlay({ onClose }: ChatOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAutoPlayActive, setAutoPlay, speaker, pace, isLoaded: settingsLoaded } = useVoiceSettings();
  const { play: playTTS, stop: stopTTS } = useAudioPlayer({
    defaultSpeaker: speaker,
    defaultPace: pace,
  });
  
  const {
    messages,
    input,
    setInput,
    isLoading,
    fileInputRef,
    handleSend,
    handleKeyDown,
    handleButtonClick,
    handleReset,
    handleFileUpload,
    sendMessageToAgent,
    responseLanguage,
    setResponseLanguage,
  } = useChatEngine();

  // Track for auto-play
  const lastAutoPlayedIdx = useRef(-1);
  const isInitialized = useRef(false);
  const playQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef(false);
  const queueTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Toast for voice toggle
  const [voiceToast, setVoiceToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Flag to skip auto-play effect when toggle just played a message
  const skipAutoPlayOnceRef = useRef(false);
  
  // Initialize: mark existing messages as "already played"
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
  
  // Enhanced toggle handler
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
    setVoiceToast(turningOn ? '🔊 Voice ON' : '🔇 Voice OFF');
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setVoiceToast(null), 2000);
    
    // If turning ON, play the most recent agent message
    if (turningOn && messages.length > 0) {
      const lastAgentMsg = [...messages].reverse().find(m => m.role === 'agent');
      if (lastAgentMsg && lastAgentMsg.content.length > 0) {
        // Mark messages as played so auto-play effect doesn't duplicate
        lastAutoPlayedIdx.current = messages.length - 1;
        skipAutoPlayOnceRef.current = true;
        
        queueTimeoutRef.current = setTimeout(() => {
          playTTS(lastAgentMsg.content, responseLanguage, speaker, pace).catch(() => {});
        }, 300);
      }
    }
  }, [isAutoPlayActive, setAutoPlay, messages, responseLanguage, speaker, pace, playTTS, stopTTS]);

  // Listen for voice preference sync from server (legacy)
  useEffect(() => {
    const handleVoicePref = (e: CustomEvent<{ enabled: boolean }>) => {
      if (e.detail?.enabled !== undefined) {
        setAutoPlay(e.detail.enabled);
      }
    };
    window.addEventListener('voice:preference', handleVoicePref as EventListener);
    return () => window.removeEventListener('voice:preference', handleVoicePref as EventListener);
  }, [setAutoPlay]);

  // Play queued messages
  const playNextInQueue = useCallback(async () => {
    if (playQueueRef.current.length === 0) {
      isPlayingQueueRef.current = false;
      return;
    }
    isPlayingQueueRef.current = true;
    const text = playQueueRef.current.shift()!;
    
    try {
      await playTTS(text, responseLanguage, speaker, pace);
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
      // Continue to next message even on error (unless stopped by another player)
      if (!isExpectedError || err instanceof Error && err.message.includes('Cancelled')) {
        queueTimeoutRef.current = setTimeout(playNextInQueue, 100);
      } else {
        isPlayingQueueRef.current = false;
      }
    }
  }, [playTTS, responseLanguage, speaker, pace]);

  // Auto-play TTS for new agent messages
  useEffect(() => {
    if (!settingsLoaded || !isInitialized.current) return;
    if (!isAutoPlayActive) return;
    
    // Skip once if toggle handler just played a message
    if (skipAutoPlayOnceRef.current) {
      skipAutoPlayOnceRef.current = false;
      return;
    }
    
    const newAgentMessages: string[] = [];
    for (let i = lastAutoPlayedIdx.current + 1; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === 'agent' && msg.content.length > 0) {
        newAgentMessages.push(msg.content);
      }
    }
    
    if (newAgentMessages.length === 0) return;
    
    lastAutoPlayedIdx.current = messages.length - 1;
    
    playQueueRef.current.push(...newAgentMessages);
    if (!isPlayingQueueRef.current) {
      if (queueTimeoutRef.current) {
        clearTimeout(queueTimeoutRef.current);
      }
      queueTimeoutRef.current = setTimeout(playNextInQueue, 300);
    }
  }, [messages, isAutoPlayActive, settingsLoaded, playNextInQueue]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Card — fills from below top bar to above bottom nav */}
      <div className="relative w-full max-w-[480px] flex flex-col pt-2 pb-[72px] pointer-events-none">
        <div className="pointer-events-auto flex-1 flex flex-col bg-white shadow-2xl overflow-hidden rounded-b-2xl">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 bg-teal-600 text-white">
            <div className="w-8 h-8 rounded-full bg-teal-500/80 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold leading-tight">Oorja</h2>
              <p className="text-[11px] text-teal-200">Energy trading assistant</p>
            </div>
            {/* Voice Toggle - Large, accessible button with clear text labels */}
            {settingsLoaded && (
              <button
                onClick={handleVoiceToggle}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 font-semibold text-sm ${
                  isAutoPlayActive 
                    ? 'bg-white text-teal-600 shadow-lg' 
                    : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                }`}
                title={isAutoPlayActive ? 'Voice is ON - tap to turn off' : 'Voice is OFF - tap to turn on'}
                aria-label={isAutoPlayActive ? 'Turn off voice' : 'Turn on voice'}
              >
                {isAutoPlayActive ? (
                  <>
                    <div className="relative">
                      <Volume2 size={18} />
                      <span className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping" />
                    </div>
                    <span className="whitespace-nowrap">Voice On</span>
                  </>
                ) : (
                  <>
                    <VolumeX size={18} />
                    <span className="whitespace-nowrap">Voice Off</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleReset}
              className="p-1.5 rounded-full hover:bg-teal-500/80 transition-colors"
              title="New chat"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-teal-500/80 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Voice Toast - Large and clear */}
          {voiceToast && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-semibold ${
                voiceToast.includes('ON') 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-gray-800 text-white'
              }`}>
                {voiceToast.includes('ON') ? (
                  <Volume2 size={18} />
                ) : (
                  <VolumeX size={18} />
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
          <div className="relative border-t border-gray-100 bg-white px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                title="Upload PDF"
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
                onTranscript={(text, language) => {
                  // Update response language for TTS
                  if (language) {
                    setResponseLanguage(language);
                  }
                  // Send the transcribed text as a message
                  sendMessageToAgent(text);
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
    </div>
  );
}
