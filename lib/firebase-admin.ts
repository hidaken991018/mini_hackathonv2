import admin from "firebase-admin";

// Firebase Admin SDKの初期化（複数回初期化を防ぐ）
// ビルド時（FIREBASE_PRIVATE_KEY未設定）はスキップ
if (!admin.apps.length && process.env.FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = admin.apps.length ? admin.auth() : (null as unknown as admin.auth.Auth);
