'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { chatApi } from '@/lib/api';

const SESSION_KEY = 'oorja_chat_session';
const ANON_SESSION_KEY = 'oorja_anon_session'; // Temporary session for anonymous users

export interface OfferData {
  id: string;
  sellerId: string;
  sellerName: string;
  trustScore: number;
  energyType: 'SOLAR' | 'WIND' | 'HYDRO' | 'MIXED';
  quantityKWh: number;
  pricePerKwh: number;
  discomRate: number;
  startTime: string;
  endTime: string;
}

export interface ChatMessageData {
  role: 'agent' | 'user';
  content: string;
  buttons?: Array<{ text: string; callbackData?: string }>;
  offers?: OfferData[];
}

/** Get stored session - prioritize authenticated session, then anonymous. */
function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  const hasAuth = !!localStorage.getItem('authToken');
  if (hasAuth) {
    // Authenticated - use permanent session
    return localStorage.getItem(SESSION_KEY);
  }
  // Anonymous - use temporary session
  return localStorage.getItem(ANON_SESSION_KEY);
}

/** Store session ID - always store immediately to prevent duplicates. */
function storeSessionId(id: string, isAuthenticated: boolean) {
  if (typeof window === 'undefined') return;
  if (isAuthenticated) {
    localStorage.setItem(SESSION_KEY, id);
    localStorage.removeItem(ANON_SESSION_KEY); // Clean up anon session
  } else {
    localStorage.setItem(ANON_SESSION_KEY, id);
  }
}

function clearStoredSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ANON_SESSION_KEY);
  }
}

function handleAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('authToken', token);
  window.dispatchEvent(new CustomEvent('auth:login'));
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useChatEngine() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState<string>('en-IN');
  const [resetCounter, setResetCounter] = useState(0); // Triggers re-init after reset
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use refs for initialization state (survives React StrictMode double-mount)
  const initializedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const isAuthenticatedRef = useRef(false);

  // Load history or trigger greeting on mount (or after reset)
  useEffect(() => {
    // Use ref to prevent double-initialization in React StrictMode
    if (initializedRef.current) return;
    initializedRef.current = true;

    const hasAuth = typeof window !== 'undefined' && !!localStorage.getItem('authToken');
    setIsAuthenticated(hasAuth);
    isAuthenticatedRef.current = hasAuth;

    // Anonymous users: clear stale session on load so reload starts fresh
    if (!hasAuth) {
      clearStoredSession();
    }

    // Check for existing session (authenticated only — anon cleared above)
    const storedSession = getStoredSessionId();
    if (storedSession) {
      setSessionId(storedSession);
      sessionIdRef.current = storedSession;
    }

    (async () => {
      try {
        // Try to restore history for any existing session (authenticated or anonymous)
        if (storedSession) {
          const history = await chatApi.getHistory(storedSession);
          if (history.messages && history.messages.length > 0) {
            setMessages(
              history.messages.map((m: any) => ({
                role: m.role,
                content: m.content,
                buttons: m.buttons,
              }))
            );
            return; // History loaded, don't trigger greeting
          }
        }
        // No session or no history — trigger greeting
        await sendMessageToAgentInternal('hi', true);
      } catch {
        await sendMessageToAgentInternal('hi', true);
      }
    })();
  }, [resetCounter]);

  // Internal send function that uses refs to avoid stale closure issues
  const sendMessageToAgentInternal = async (text: string, hideUserMessage = false) => {
    setIsLoading(true);

    if (!hideUserMessage) {
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
    }

    try {
      // Use ref for current sessionId to avoid stale closure
      const currentSessionId = sessionIdRef.current;
      const res = await chatApi.send(text, currentSessionId || undefined);

      if (res.sessionId) {
        // Update both state and ref immediately
        setSessionId(res.sessionId);
        sessionIdRef.current = res.sessionId;

        // Always store sessionId immediately to prevent duplicate sessions
        const willBeAuthenticated = !!res.authToken || isAuthenticatedRef.current;
        storeSessionId(res.sessionId, willBeAuthenticated);
      }

      if (res.authToken) {
        handleAuthToken(res.authToken);
        setIsAuthenticated(true);
        isAuthenticatedRef.current = true;
        // Re-store with auth flag
        if (res.sessionId) {
          storeSessionId(res.sessionId, true);
        }
      }

      if (res.messages && res.messages.length > 0) {
        setMessages((prev) => [
          ...prev,
          ...res.messages.map((m: any) => ({
            role: 'agent' as const,
            content: m.content,
            buttons: m.buttons,
          })),
        ]);
      }

      // Sync voice preference from server
      if (res.voiceOutputEnabled !== undefined) {
        window.dispatchEvent(new CustomEvent('voice:preference', {
          detail: { enabled: res.voiceOutputEnabled }
        }));
      }
    } catch (err: any) {
      console.error('[Chat] sendMessageToAgent error:', err);
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Stable callback wrapper for external use
  const sendMessageToAgent = useCallback(
    (text: string, hideUserMessage = false) => sendMessageToAgentInternal(text, hideUserMessage),
    []
  );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    sendMessageToAgent(trimmed);
  }, [input, isLoading, sendMessageToAgent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleButtonClick = useCallback(
    (callbackData: string, displayText: string) => {
      if (isLoading) return;

      // Special handling: trigger file upload directly
      if (callbackData === 'action:trigger_file_upload') {
        fileInputRef.current?.click();
        return;
      }

      setMessages((prev) => [...prev, { role: 'user', content: displayText }]);
      sendMessageToAgent(callbackData, true);
    },
    [isLoading, sendMessageToAgent]
  );

  const handleReset = useCallback(async () => {
    // Preserve language preference across reset
    const savedLanguage = responseLanguage;
    if (typeof window !== 'undefined') {
      localStorage.setItem('oorja_language', savedLanguage);
    }

    try {
      const currentSessionId = sessionIdRef.current;
      await chatApi.reset(currentSessionId || undefined);
    } catch { /* ignore */ }
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    clearStoredSession();

    // Restore language preference
    setResponseLanguage(savedLanguage);

    // Reset initialization flag and trigger re-init
    initializedRef.current = false;
    setResetCounter(c => c + 1);
  }, [responseLanguage]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isJson = file.type === 'application/json' || file.name.endsWith('.json');
      if (!isPdf && !isJson) {
        const isHindi = responseLanguage === 'hi-IN';
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: isHindi ? 'Sirf PDF ya JSON file upload karo.' : 'Please upload a PDF or JSON file.' },
        ]);
        return;
      }

      setIsLoading(true);
      const isHindi = responseLanguage === 'hi-IN';
      setMessages((prev) => [...prev, { role: 'user', content: isHindi ? `Upload हो गया: ${file.name}` : `Uploaded: ${file.name}` }]);

      try {
        const base64 = await fileToBase64(file);
        const currentSessionId = sessionIdRef.current;
        const res = await chatApi.upload(base64, currentSessionId || undefined, file.name);

        if (res.sessionId) {
          setSessionId(res.sessionId);
          sessionIdRef.current = res.sessionId;
          const willBeAuthenticated = !!res.authToken || isAuthenticatedRef.current;
          storeSessionId(res.sessionId, willBeAuthenticated);
        }

        if (res.authToken) {
          handleAuthToken(res.authToken);
          setIsAuthenticated(true);
          isAuthenticatedRef.current = true;
          if (res.sessionId) {
            storeSessionId(res.sessionId, true);
          }
        }

        if (res.messages && res.messages.length > 0) {
          setMessages((prev) => [
            ...prev,
            ...res.messages.map((m: any) => ({
              role: 'agent' as const,
              content: m.content,
              buttons: m.buttons,
            })),
          ]);
        }
      } catch {
        const isHindiErr = responseLanguage === 'hi-IN';
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: isHindiErr ? 'File process nahi ho payi. Dobara try karo.' : 'Failed to process the file. Please try again.' },
        ]);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    []
  );

  // Handle voice result directly (avoids double processing)
  const handleVoiceResult = useCallback(
    (result: {
      transcript: string;
      language?: string;
      sessionId?: string;
      messages?: Array<{ role: string; content: string; buttons?: Array<{ text: string; callbackData?: string }> }>;
      authToken?: string;
      responseLanguage?: string;
      voiceOutputEnabled?: boolean;
      autoVoice?: boolean; // Auto-play TTS when input was voice
    }) => {
      // Validate transcript
      if (!result.transcript || !result.transcript.trim()) {
        console.warn('[Chat] Empty transcript received from voice input');
        return;
      }

      // Add user's voice transcript as a message
      setMessages((prev) => [...prev, { role: 'user', content: result.transcript }]);

      // Update session ID if provided
      if (result.sessionId) {
        setSessionId(result.sessionId);
        sessionIdRef.current = result.sessionId;
        const willBeAuthenticated = !!result.authToken || isAuthenticatedRef.current;
        storeSessionId(result.sessionId, willBeAuthenticated);
      }

      // Handle auth token
      if (result.authToken) {
        handleAuthToken(result.authToken);
        setIsAuthenticated(true);
        isAuthenticatedRef.current = true;
        if (result.sessionId) {
          storeSessionId(result.sessionId, true);
        }
      }

      // Add agent messages
      const agentMessages = result.messages;
      if (agentMessages && agentMessages.length > 0) {
        setMessages((prev) => [
          ...prev,
          ...agentMessages.map((m) => ({
            role: 'agent' as const,
            content: m.content,
            buttons: m.buttons,
          })),
        ]);
      }

      // Update response language
      if (result.responseLanguage) {
        setResponseLanguage(result.responseLanguage);
      }

      // Sync voice preference from server
      if (result.voiceOutputEnabled !== undefined) {
        window.dispatchEvent(new CustomEvent('voice:preference', {
          detail: { enabled: result.voiceOutputEnabled }
        }));
      }

      // Auto-play voice response when input was voice
      if (result.autoVoice && agentMessages && agentMessages.length > 0) {
        // Dispatch event to trigger TTS playback of the agent's response
        const textToSpeak = agentMessages.map(m => m.content).join('\n');
        window.dispatchEvent(new CustomEvent('voice:autoplay', {
          detail: { text: textToSpeak, language: result.responseLanguage }
        }));
      }
    },
    []
  );

  return {
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
    sendMessageToAgent,
    responseLanguage,
    setResponseLanguage,
  };
}
