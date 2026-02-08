'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = 'input' | 'inventory' | 'recipes' | 'chat' | 'notifications';

export default function BottomNav() {
  const pathname = usePathname();

  const getActiveTab = (): Tab => {
    if (pathname === '/inventory') return 'inventory';
    if (pathname === '/recipes') return 'recipes';
    if (pathname === '/chat') return 'chat';
    if (pathname === '/notifications') return 'notifications';
    return 'input';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg">
      <div className="flex justify-around items-center h-16">
        <Link
          href="/input"
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
            activeTab === 'input' ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="text-xs">Input</span>
        </Link>

        <Link
          href="/inventory"
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
            activeTab === 'inventory' ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <span className="text-xs">在庫</span>
        </Link>

        <Link
          href="/recipes"
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
            activeTab === 'recipes' ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <span className="text-xs">レシピ</span>
        </Link>

        <Link
          href="/chat"
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
            activeTab === 'chat' ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-xs">AI Chat</span>
        </Link>

        <Link
          href="/notifications"
          className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
            activeTab === 'notifications' ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="text-xs">Notifications</span>
        </Link>
      </div>
    </nav>
  );
}
