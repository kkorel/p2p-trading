'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Paperclip, Bot } from 'lucide-react';
import { MessageList, ChatMessageData } from './message-list';
import { chatApi } from '@/lib/api';

interface ChatOverlayProps {
  onClose: () => void;
}

export function ChatOverlay({ onClose }: ChatOverlayProps) {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history or trigger greeting on mount
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);

    (async () => {
      try {
        const history = await chatApi.getHistory();
        if (history.messages && history.messages.length > 0) {
          setMessages(
            history.messages.map((m: any) => ({
              role: m.role,
              content: m.content,
              buttons: m.buttons,
            }))
          );
        } else {
          // No history — trigger greeting
          await sendMessageToAgent('hi', true);
        }
      } catch {
        // If history fails, trigger greeting
        await sendMessageToAgent('hi', true);
      }
    })();
  }, [initialized]);

  const sendMessageToAgent = useCallback(
    async (text: string, hideUserMessage = false) => {
      setIsLoading(true);

      // Optimistic UI: show user message immediately
      if (!hideUserMessage) {
        setMessages((prev) => [...prev, { role: 'user', content: text }]);
      }

      try {
        const res = await chatApi.send(text, sessionId || undefined);
        if (res.sessionId) setSessionId(res.sessionId);

        // Append agent responses
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
      // Show the button label in chat, send callbackData to backend
      setMessages((prev) => [...prev, { role: 'user', content: displayText }]);
      sendMessageToAgent(callbackData, true);
    },
    [isLoading, sendMessageToAgent]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: 'Please upload a PDF document.' },
        ]);
        return;
      }

      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: `Uploaded: ${file.name}` }]);

      try {
        const base64 = await fileToBase64(file);
        const res = await chatApi.upload(base64, sessionId || undefined, file.name);
        if (res.sessionId) setSessionId(res.sessionId);

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
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [sessionId]
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Card container — centered in 480px, anchored to bottom above nav */}
      <div className="relative w-full max-w-[480px] flex flex-col justify-end pb-24 px-3 pointer-events-none">
        <div
          className="pointer-events-auto flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200/60"
          style={{ maxHeight: 'min(65vh, 520px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-teal-600 text-white rounded-t-2xl">
            <div className="w-8 h-8 rounded-full bg-teal-500/80 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold leading-tight">Oorja</h2>
              <p className="text-[11px] text-teal-200">Energy trading assistant</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-teal-500/80 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            <MessageList messages={messages} onButtonClick={handleButtonClick} isLoading={isLoading} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-100 bg-white px-2.5 py-2">
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
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 py-2 px-3.5 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-teal-200 transition-all"
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
