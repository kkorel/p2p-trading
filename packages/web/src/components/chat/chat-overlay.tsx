'use client';

import { useRef } from 'react';
import { X, Send, Paperclip, Bot, RotateCcw } from 'lucide-react';
import { MessageList } from './message-list';
import { VoiceButton } from './voice-button';
import { useChatEngine } from '@/hooks/use-chat-engine';

interface ChatOverlayProps {
  onClose: () => void;
}

export function ChatOverlay({ onClose }: ChatOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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
  } = useChatEngine();

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

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-gray-50/50">
            <MessageList messages={messages} onButtonClick={handleButtonClick} isLoading={isLoading} />
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
                onTranscript={(text) => {
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
