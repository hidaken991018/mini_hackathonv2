'use client';

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function SignInPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // すでにログイン済みの場合は /notifications にリダイレクト
    if (user && !loading) {
      router.push("/notifications");
    }
  }, [user, loading, router]);

  useEffect(() => {
    setErrorMessage(null);
  }, [mode]);

  const getAuthErrorMessage = (error: unknown) => {
    const code = (error as { code?: string }).code;
    switch (code) {
      case "auth/invalid-email":
        return "メールアドレスの形式を確認してください。";
      case "auth/user-not-found":
        return "ユーザーが見つかりませんでした。";
      case "auth/wrong-password":
        return "パスワードが正しくありません。";
      case "auth/email-already-in-use":
        return "このメールアドレスは既に使用されています。";
      case "auth/weak-password":
        return "パスワードは6文字以上で入力してください。";
      case "auth/too-many-requests":
        return "試行回数が多すぎます。しばらく待って再度お試しください。";
      default:
        return mode === "signup" ? "アカウント作成に失敗しました。" : "ログインに失敗しました。";
    }
  };

  const handleEmailAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setErrorMessage("メールアドレスを入力してください。");
      return;
    }

    if (!password) {
      setErrorMessage("パスワードを入力してください。");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      if (mode === "signup") {
        await signUpWithEmail(trimmedEmail, password, trimmedName || undefined);
      } else {
        await signInWithEmail(trimmedEmail, password);
      }
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

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

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              または
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex rounded-full bg-white/80 p-1 text-[11px] font-semibold text-slate-500 shadow-inner">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 rounded-full px-3 py-1 transition ${
                    mode === "signin"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "hover:text-slate-700"
                  }`}
                >
                  ログイン
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 rounded-full px-3 py-1 transition ${
                    mode === "signup"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "hover:text-slate-700"
                  }`}
                >
                  新規登録
                </button>
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3">
                {mode === "signup" && (
                  <label className="block text-xs font-semibold text-slate-600">
                    表示名（任意）
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      className="mt-2 w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    />
                  </label>
                )}

                <label className="block text-xs font-semibold text-slate-600">
                  メールアドレス
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    className="mt-2 w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-600">
                  パスワード
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    minLength={6}
                    className="mt-2 w-full rounded-xl border border-white/70 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  />
                </label>

                {errorMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? mode === "signup"
                      ? "アカウント作成中..."
                      : "ログイン中..."
                    : mode === "signup"
                      ? "メールで新規登録"
                      : "メールでログイン"}
                </button>
              </form>
            </div>

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
