'use client';

import { Message } from '@/types';
import { useEffect, useRef } from 'react';

interface ChatMessageListProps {
  messages: Message[];
}

export default function ChatMessageList({ messages }: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 px-4 py-4 space-y-4 bg-gray-50">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm ${
              message.role === 'user'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-900 border border-gray-100'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
