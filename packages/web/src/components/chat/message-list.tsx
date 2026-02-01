'use client';

import { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import type { ChatMessageData } from '@/hooks/use-chat-engine';

export type { ChatMessageData };

interface MessageListProps {
  messages: ChatMessageData[];
  onButtonClick?: (callbackData: string, displayText: string) => void;
  isLoading?: boolean;
}

export function MessageList({ messages, onButtonClick, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col gap-2 p-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
        >
          {/* Avatar */}
          <div
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              msg.role === 'agent' ? 'bg-teal-100 text-teal-600' : 'bg-blue-100 text-blue-600'
            }`}
          >
            {msg.role === 'agent' ? <Bot size={16} /> : <User size={16} />}
          </div>

          {/* Bubble */}
          <div className="max-w-[80%] flex flex-col gap-1.5">
            <div
              className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'agent'
                  ? 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                  : 'bg-teal-600 text-white rounded-2xl rounded-br-md'
              }`}
            >
              {msg.content}
            </div>

            {/* Inline buttons */}
            {msg.role === 'agent' && msg.buttons && msg.buttons.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-1">
                {msg.buttons.map((btn, j) => (
                  <button
                    key={j}
                    onClick={() => onButtonClick?.(btn.callbackData || btn.text, btn.text)}
                    className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full hover:bg-teal-100 transition-colors"
                  >
                    {btn.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {isLoading && (
        <div className="flex items-end gap-2">
          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-teal-100 text-teal-600">
            <Bot size={16} />
          </div>
          <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
