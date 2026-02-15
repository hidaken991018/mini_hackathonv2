import { v4 as uuidv4 } from 'uuid';

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL;

/**
 * 画像を保存し、パス部分のみ返却する。
 * GCS_BUCKET_NAME が設定されていれば GCS、なければローカルに保存。
 * @returns パス文字列 (例: "images/dishes/abc.png")
 */
export async function saveBase64Image(
  base64Data: string,
  subDir: string = 'generated'
): Promise<string> {
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');
  const fileName = `${uuidv4()}.png`;
  const objectPath = `images/${subDir}/${fileName}`;

  if (GCS_BUCKET_NAME) {
    await uploadToGCS(buffer, objectPath);
  } else {
    await saveToLocal(buffer, subDir, fileName);
  }

  return objectPath;
}

/**
 * DB格納のパスからフルURLを構築する。
 * IMAGE_BASE_URL が設定されていれば GCS URL、なければローカルの相対パス。
 * 旧データ ("/images/...") も新データ ("images/...") も両方対応。
 */
export function toFullImageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  // 先頭の / を正規化して除去
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  if (IMAGE_BASE_URL) {
    return `${IMAGE_BASE_URL}/${normalized}`;
  }
  // ローカル: public/ からの相対パス
  return `/${normalized}`;
}

async function uploadToGCS(buffer: Buffer, objectPath: string): Promise<void> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  const file = storage.bucket(GCS_BUCKET_NAME!).file(objectPath);

  await file.save(buffer, {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    },
    resumable: false,
  });
}

async function saveToLocal(buffer: Buffer, subDir: string, fileName: string): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const relativeDir = path.join('images', subDir);
  const targetDir = path.join(process.cwd(), 'public', relativeDir);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  await fs.promises.writeFile(path.join(targetDir, fileName), buffer);
}
