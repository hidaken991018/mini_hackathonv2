'use client';

import { useState, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import ScreenHeader from '@/components/ScreenHeader';
import ChatMessageList from '@/components/ChatMessageList';
import ChatInput from '@/components/ChatInput';
import { Message } from '@/types';

export default function ChatPage() {
  // Chat画面の状態
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');

  // ローカルストレージから初期メッセージを読み込む
  useEffect(() => {
    const storedMessage = localStorage.getItem('chatInitialMessage');
    if (storedMessage) {
      try {
        const initialMessage = JSON.parse(storedMessage);
        setMessages([initialMessage]);
        // 読み込んだら削除
        localStorage.removeItem('chatInitialMessage');
      } catch (error) {
        console.error('Failed to parse initial message:', error);
      }
    }
  }, []);

  // メッセージ送信処理
  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
    };
    setMessages([...messages, userMessage]);
    setInputText('');

    // TODO: 実際のAI APIと接続
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ScreenHeader title="AI Chat" />
      <ChatMessageList messages={messages} />
      <ChatInput
        value={inputText}
        onChange={setInputText}
        onSend={handleSendMessage}
      />
      <BottomNav />
    </div>
  );
}
