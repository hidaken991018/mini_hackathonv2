import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    const body = await request.json();
    const { email, name, image } = body;

    // usersテーブルにユーザーを作成または更新
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        name: name || null,
        email: email || null,
        image: image || null,
      },
      create: {
        firebaseUid,
        name: name || null,
        email: email || null,
        image: image || null,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error syncing user:", error);
    return NextResponse.json({ error: "ユーザー同期に失敗しました" }, { status: 500 });
  }
}
