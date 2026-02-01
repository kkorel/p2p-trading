'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { chatApi } from '@/lib/api';

const SESSION_KEY = 'oorja_chat_session';

export interface ChatMessageData {
  role: 'agent' | 'user';
  content: string;
  buttons?: Array<{ text: string; callbackData?: string }>;
}

function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SESSION_KEY);
}

function storeSessionId(id: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, id);
  }
}

function clearStoredSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
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
  const [sessionId, setSessionId] = useState<string | null>(getStoredSessionId);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history or trigger greeting on mount
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    (async () => {
      try {
        const stored = getStoredSessionId();
        const history = await chatApi.getHistory(stored || undefined);
        if (history.messages && history.messages.length > 0) {
          setMessages(
            history.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
              buttons: m.buttons,
            }))
          );
        } else {
          await sendMessageToAgent('hi', true);
        }
      } catch {
        await sendMessageToAgent('hi', true);
      }
    })();
  }, [initialized]);

  const sendMessageToAgent = useCallback(
    async (text: string, hideUserMessage = false) => {
      setIsLoading(true);

      if (!hideUserMessage) {
        setMessages((prev) => [...prev, { role: 'user', content: text }]);
      }

      try {
        const res = await chatApi.send(text, sessionId || undefined);
        if (res.sessionId) {
          setSessionId(res.sessionId);
          storeSessionId(res.sessionId);
        }

        if (res.authToken) {
          handleAuthToken(res.authToken);
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
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: 'Sorry, something went wrong. Please try again.' },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]
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
      await chatApi.reset(sessionId || undefined);
    } catch { /* ignore */ }
    setMessages([]);
    setSessionId(null);
    clearStoredSession();
    setInitialized(false);
  }, [sessionId]);

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
        const res = await chatApi.upload(base64, sessionId || undefined, file.name);
        if (res.sessionId) {
          setSessionId(res.sessionId);
          storeSessionId(res.sessionId);
        }

        if (res.authToken) {
          handleAuthToken(res.authToken);
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
    [sessionId]
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
  };
}
