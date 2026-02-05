import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Saves a base64 encoded image to the public directory.
 * @param base64Data The base64 encoded image data (with or without prefix).
 * @param subDir The subdirectory within 'public/images' to save to. Defaults to 'generated'.
 * @returns The public URL path of the saved image (e.g., '/images/generated/abc.png').
 */
export async function saveBase64Image(
  base64Data: string,
  subDir: string = 'generated'
): Promise<string> {
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');

  // Define properties
  const fileName = `${uuidv4()}.png`;
  const relativeDir = path.join('images', subDir);
  const publicDir = path.join(process.cwd(), 'public');
  const targetDir = path.join(publicDir, relativeDir);
  const filePath = path.join(targetDir, fileName);

  // Ensure directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write file
  await fs.promises.writeFile(filePath, buffer);

  // Return relative URL for frontend use (replace backslashes for Windows)
  const urlPath = path.join('/', relativeDir, fileName).split(path.sep).join('/');
  return urlPath;
}
