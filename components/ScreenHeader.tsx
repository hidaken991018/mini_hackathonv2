'use client';

import { useAuth } from "@/contexts/AuthContext";

interface ScreenHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export default function ScreenHeader({ title, rightAction }: ScreenHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <div className="flex items-center gap-3">
          {rightAction && <div>{rightAction}</div>}
          {user && (
            <button
              onClick={signOut}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              ログアウト
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
