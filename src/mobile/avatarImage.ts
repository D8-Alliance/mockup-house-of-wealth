/** The server keeps a profile picture as an image of at most 90,000 characters (server/src/users/update-my-profile.dto.ts). */
const MAX_CHARS = 85_000;

/**
 * A profile picture from a phone photo: the centre square, 256 px, as a JPEG data URL (usually 15 to 25 KB),
 * lowering the quality until it fits what the server accepts.
 */
export async function avatarFromPhoto(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare the picture.');
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  for (const quality of [0.85, 0.75, 0.6, 0.45]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error('The picture is too detailed to save. Try another photo.');
}
