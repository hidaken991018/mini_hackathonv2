'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = 'inventory' | 'notifications';

export default function BottomNav() {
  const pathname = usePathname();

  const getActiveTab = (): Tab => {
    if (pathname === '/inventory') return 'inventory';
    if (pathname === '/notifications') return 'notifications';
    return 'notifications';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg">
      <div className="flex justify-around items-center h-16">
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
      </div>
    </nav>
  );
}
