'use client';

type Tab = 'input' | 'chat' | 'notifications';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg">
      <div className="flex justify-around items-center h-16">
        <button
          onClick={() => onTabChange('input')}
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
        </button>

        <button
          onClick={() => onTabChange('chat')}
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
        </button>

        <button
          onClick={() => onTabChange('notifications')}
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
        </button>
      </div>
    </nav>
  );
}
