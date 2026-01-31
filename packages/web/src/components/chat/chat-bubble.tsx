'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ChatOverlay } from './chat-overlay';

export function ChatBubble() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for authenticated users who have completed onboarding
  if (!isAuthenticated || !user?.profileComplete) return null;

  if (isOpen) {
    return <ChatOverlay onClose={() => setIsOpen(false)} />;
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed right-4 bottom-28 z-40 w-14 h-14 rounded-full bg-teal-600 text-white shadow-lg flex items-center justify-center hover:bg-teal-700 hover:scale-105 active:scale-95 transition-all"
      aria-label="Chat with Oorja"
    >
      <MessageCircle size={26} />
    </button>
  );
}
