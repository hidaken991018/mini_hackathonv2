import { adminAuth } from "./firebase-admin";
import { prisma } from "./prisma";
import { NextRequest, NextResponse } from "next/server";

export async function requireAuth(request: NextRequest) {
  try {
    // Authorization ヘッダーからトークン取得
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        error: NextResponse.json(
          { success: false, error: "認証が必要です" },
          { status: 401 }
        ),
        userId: null,
        firebaseUid: null,
      };
    }

    const token = authHeader.split("Bearer ")[1];

    // Firebase Admin SDKでトークン検証
    const decodedToken = await adminAuth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // usersテーブルからユーザー取得
    const user = await prisma.user.findUnique({
      where: { firebaseUid },
    });

    if (!user) {
      return {
        error: NextResponse.json(
          { success: false, error: "ユーザーが見つかりません" },
          { status: 404 }
        ),
        userId: null,
        firebaseUid: null,
      };
    }

    return { error: null, userId: user.id, firebaseUid };
  } catch (error) {
    console.error("Auth error:", error);
    return {
      error: NextResponse.json(
        { success: false, error: "認証に失敗しました" },
        { status: 401 }
      ),
      userId: null,
      firebaseUid: null,
    };
  }
}
