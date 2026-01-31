'use client';

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignInPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // すでにログイン済みの場合は /input にリダイレクト
    if (user && !loading) {
      router.push("/input");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#fff4d8] via-[#f7ebff] to-[#e5f7ff]">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#ffb3c7] opacity-50 blur-3xl motion-safe:animate-[floaty_10s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-16 -right-24 h-80 w-80 rounded-full bg-[#b2f2d4] opacity-45 blur-3xl motion-safe:animate-[floaty_12s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#ffd89a] opacity-35 blur-3xl motion-safe:animate-[floaty_14s_ease-in-out_infinite]"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/70 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="text-center mb-8 motion-safe:animate-[fade-up_0.7s_ease-out_both]">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-xs font-bold text-rose-600 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              たのしく続く食材管理
            </div>
            <h1
              className="text-4xl font-black tracking-tight text-slate-900"
              style={{ fontFamily: "var(--font-display)" }}
            >
              syufy
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              食材管理とレシピ提案アプリ
            </p>
          </div>

          <div className="space-y-4 motion-safe:animate-[fade-up_0.7s_ease-out_0.1s_both]">
            <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                🥕 期限通知
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                🍳 AIレシピ
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">
                🧾 レシート読取
              </span>
            </div>

            <button
              onClick={signInWithGoogle}
              className="group relative w-full rounded-2xl border border-white/70 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-[0_14px_35px_rgba(15,23,42,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(15,23,42,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
            >
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#ffb5c7] via-[#ffd089] to-[#b2e6ff] opacity-0 transition group-hover:opacity-30" />
              <span className="relative flex items-center justify-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </span>
                Googleでログイン
              </span>
            </button>

            <div className="rounded-2xl bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm">
              さっそく冷蔵庫を登録して、今日のおすすめレシピを見つけましょう。
            </div>
          </div>

          <p className="mt-6 text-[11px] text-center text-slate-500 motion-safe:animate-[fade-up_0.7s_ease-out_0.2s_both]">
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  );
}
