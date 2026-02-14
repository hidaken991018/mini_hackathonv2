'use client';

import { useAuth } from "@/contexts/AuthContext";

interface ScreenHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export default function ScreenHeader({ title, rightAction }: ScreenHeaderProps) {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 glass px-4 py-3.5 shadow-sm border-b border-white/40">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tight text-slate-900">{title}</h1>
        <div className="flex items-center gap-3">
          {rightAction && <div>{rightAction}</div>}
          {user && (
            <button
              onClick={signOut}
              className="text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors"
            >
              ログアウト
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
