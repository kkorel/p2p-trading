'use client';

import { useRef } from 'react';
import { Send, Paperclip, RotateCcw, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MessageList } from './message-list';
import { useChatEngine } from '@/hooks/use-chat-engine';

export function ChatPage() {
  const router = useRouter();
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
  } = useChatEngine();

  return (
    <div className="flex justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-[480px] flex flex-col min-h-screen bg-white">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-teal-600 text-white safe-top">
          {/* Logo */}
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-lg font-bold">O</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Oorja</h1>
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
            onClick={() => router.push('/buy')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-xs font-medium"
            title="Open App"
          >
            <LayoutGrid size={14} />
            <span>App</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <MessageList messages={messages} onButtonClick={handleButtonClick} isLoading={isLoading} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-100 bg-white px-2.5 py-2 safe-bottom">
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
  );
}
