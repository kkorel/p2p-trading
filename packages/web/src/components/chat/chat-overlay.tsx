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
    (text: string) => {
      if (isLoading) return;
      sendMessageToAgent(text);
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
    <div className="fixed inset-0 z-50 flex justify-center bg-black/20">
      <div className="w-full max-w-[480px] flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-teal-600 text-white shadow-md">
          <div className="w-9 h-9 rounded-full bg-teal-500 flex items-center justify-center">
            <Bot size={20} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold leading-tight">Oorja</h2>
            <p className="text-xs text-teal-100">Your energy trading helper</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-teal-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white">
          <MessageList messages={messages} onButtonClick={handleButtonClick} isLoading={isLoading} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white px-3 py-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-2">
            {/* File upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full text-gray-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              title="Upload PDF"
            >
              <Paperclip size={20} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Text input */}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 py-2.5 px-4 bg-gray-100 rounded-full text-sm outline-none focus:ring-2 focus:ring-teal-300 transition-all"
              disabled={isLoading}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-full bg-teal-600 text-white disabled:opacity-40 hover:bg-teal-700 transition-colors"
            >
              <Send size={18} />
            </button>
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
