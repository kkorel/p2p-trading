'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { chatApi } from '@/lib/api';

const SESSION_KEY = 'oorja_chat_session';
const ANON_SESSION_KEY = 'oorja_anon_session'; // Temporary session for anonymous users

export interface ChatMessageData {
  role: 'agent' | 'user';
  content: string;
  buttons?: Array<{ text: string; callbackData?: string }>;
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

    // Check for existing session (both auth and anon)
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
      setMessages((prev) => [...prev, { role: 'user', content: displayText }]);
      sendMessageToAgent(callbackData, true);
    },
    [isLoading, sendMessageToAgent]
  );

  const handleReset = useCallback(async () => {
    try {
      const currentSessionId = sessionIdRef.current;
      await chatApi.reset(currentSessionId || undefined);
    } catch { /* ignore */ }
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    clearStoredSession();
    // Reset initialization flag and trigger re-init
    initializedRef.current = false;
    setResetCounter(c => c + 1);
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const isJson = file.type === 'application/json' || file.name.endsWith('.json');
      if (!isPdf && !isJson) {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: 'Please upload a PDF or JSON file.' },
        ]);
        return;
      }

      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: `Uploaded: ${file.name}` }]);

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
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: 'Failed to process the file. Please try again.' },
        ]);
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
    sendMessageToAgent,
    responseLanguage,
    setResponseLanguage,
  };
}
