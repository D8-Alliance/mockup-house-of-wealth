/**
 * Downloads the open-source face models used by the KYC liveness prototype into server/models/.
 * Run once per machine (they are not committed to Git):
 *   npm run models:download
 *
 *  - YuNet (OpenCV Zoo, MIT): face detection + 5 landmarks, used for the face zone and head pose.
 *  - SFace (OpenCV Zoo, Apache-2.0): 128-d face embedding, used for face match.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MODELS = [
  { file: 'face_detection_yunet_2023mar.onnx', url: 'https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx' },
  { file: 'face_recognition_sface_2021dec.onnx', url: 'https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx' },
];

async function main() {
  const dir = path.resolve(__dirname, '..', 'models');
  mkdirSync(dir, { recursive: true });
  for (const model of MODELS) {
    const target = path.join(dir, model.file);
    if (existsSync(target)) {
      console.log(`exists  ${model.file}`);
      continue;
    }
    const response = await fetch(model.url);
    if (!response.ok) throw new Error(`${model.file}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    // Git LFS returns a small text pointer instead of the model when the media URL is not followed.
    if (bytes.length < 50_000) throw new Error(`${model.file}: download looks wrong (${bytes.length} bytes)`);
    writeFileSync(target, bytes);
    console.log(`saved   ${model.file} (${(bytes.length / 1_048_576).toFixed(1)} MB, sha256 ${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}...)`);
  }
}

main().catch((error: Error) => {
  console.error(`Model download failed: ${error.message}`);
  process.exit(1);
});
