'use client';

import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#fff4d8] via-[#f7ebff] to-[#e5f7ff]">
      {/* Background Orbs */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-24 -left-24 h-72 w-72 rounded-full bg-[#ffb3c7] opacity-40 blur-3xl motion-safe:animate-[floaty_10s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed top-16 -right-24 h-80 w-80 rounded-full bg-[#b2f2d4] opacity-35 blur-3xl motion-safe:animate-[floaty_12s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#ffd89a] opacity-30 blur-3xl motion-safe:animate-[floaty_14s_ease-in-out_infinite]"
      />

      <div className="main-container relative z-10 glass shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen relative overflow-hidden">
          <div className="flex-1 overflow-y-auto pb-28 md:pb-0">
            {children}
          </div>
        </main>
      </div>
      {/* BottomNav は main-container の外に配置。glass(backdrop-filter) の影響で fixed がビューポート基準にならない問題を回避 */}
      <BottomNav />
    </div>
  );
}


