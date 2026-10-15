import { existsSync } from 'node:fs';
import path from 'node:path';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

/**
 * Server-side face analysis for the KYC liveness prototype, using open-source
 * OpenCV Zoo models run with onnxruntime (downloaded by `npm run models:download`):
 *  - YuNet: face boxes + 5 landmarks (eyes, nose, mouth corners);
 *  - SFace: 128-d face embedding for face matching.
 * Everything runs on this server, so a tampered browser cannot fake the result.
 * It has no anti-spoofing model: it cannot tell a live face from a good screen
 * replay or a real-time deepfake. That needs a certified eKYC vendor.
 */

export interface RgbImage {
  /** Packed RGB, 3 bytes per pixel, row-major. */
  data: Buffer;
  width: number;
  height: number;
}

export type Point = [number, number];

export interface DetectedFace {
  box: { x: number; y: number; width: number; height: number };
  score: number;
  /** [right eye, left eye, nose tip, right mouth corner, left mouth corner]; "right" = the person's right (image left). */
  landmarks: Point[];
}

const MODEL_DIR = path.resolve(__dirname, '..', '..', '..', 'models');
const DETECTOR_FILE = path.join(MODEL_DIR, 'face_detection_yunet_2023mar.onnx');
const RECOGNIZER_FILE = path.join(MODEL_DIR, 'face_recognition_sface_2021dec.onnx');
const DETECTOR_SIZE = 640;
const SCORE_THRESHOLD = 0.6;
const NMS_IOU = 0.3;
// ArcFace/SFace 112x112 alignment template, same landmark order as YuNet.
const ALIGN_TEMPLATE: Point[] = [[38.2946, 51.6963], [73.5318, 51.5014], [56.0252, 71.7366], [41.5493, 92.3655], [70.7299, 92.2041]];

/** Decodes JPEG/PNG to packed RGB, applying EXIF rotation (phone cameras). */
export async function decodeImage(content: Buffer): Promise<RgbImage> {
  const { data, info } = await sharp(content).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na * nb) || 1);
}

/**
 * Head pose from the 5 landmarks, as ratios that do not depend on face size.
 * yaw: nose offset from the eye midpoint in eye-distance units; about 0 facing
 *   the camera, positive when the nose is towards the image's right.
 * pitch: where the nose sits between the eye line (0) and the mouth line (1);
 *   it drops when the person looks up and rises when they look down.
 */
export function headPose(landmarks: Point[]): { yaw: number; pitch: number } {
  const [rightEye, leftEye, nose, rightMouth, leftMouth] = landmarks;
  const eyeMid: Point = [(rightEye[0] + leftEye[0]) / 2, (rightEye[1] + leftEye[1]) / 2];
  const mouthMid: Point = [(rightMouth[0] + leftMouth[0]) / 2, (rightMouth[1] + leftMouth[1]) / 2];
  const eyeDistance = Math.hypot(leftEye[0] - rightEye[0], leftEye[1] - rightEye[1]) || 1;
  const eyeToMouth = (mouthMid[1] - eyeMid[1]) || 1;
  return { yaw: (nose[0] - eyeMid[0]) / eyeDistance, pitch: (nose[1] - eyeMid[1]) / eyeToMouth };
}

/** Mean luminance (0-255) inside a box, for "too dark / too bright" feedback. */
export function meanBrightness(image: RgbImage, box: DetectedFace['box']): number {
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(image.width, Math.ceil(box.x + box.width));
  const y1 = Math.min(image.height, Math.ceil(box.y + box.height));
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * image.width + x) * 3;
      sum += 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
      count += 1;
    }
  }
  return count ? sum / count : 0;
}

function iou(a: DetectedFace['box'], b: DetectedFace['box']): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return intersection / (a.width * a.height + b.width * b.height - intersection || 1);
}

/** Least-squares similarity transform (rotation, uniform scale, translation) mapping src onto dst. */
function similarityTransform(src: Point[], dst: Point[]) {
  const n = src.length;
  const sm = src.reduce((acc, p) => [acc[0] + p[0] / n, acc[1] + p[1] / n], [0, 0]);
  const dm = dst.reduce((acc, p) => [acc[0] + p[0] / n, acc[1] + p[1] / n], [0, 0]);
  let a = 0;
  let b = 0;
  let norm = 0;
  for (let i = 0; i < n; i += 1) {
    const px = src[i][0] - sm[0];
    const py = src[i][1] - sm[1];
    const qx = dst[i][0] - dm[0];
    const qy = dst[i][1] - dm[1];
    a += px * qx + py * qy;
    b += px * qy - py * qx;
    norm += px * px + py * py;
  }
  const c = a / (norm || 1); // scale * cos(theta)
  const s = b / (norm || 1); // scale * sin(theta)
  return { c, s, tx: dm[0] - (c * sm[0] - s * sm[1]), ty: dm[1] - (s * sm[0] + c * sm[1]) };
}

/** Crops and aligns a face to the 112x112 SFace input (RGB, bilinear sampling). */
function alignFace(image: RgbImage, landmarks: Point[]): Float32Array {
  const { c, s, tx, ty } = similarityTransform(landmarks, ALIGN_TEMPLATE);
  const det = c * c + s * s || 1;
  const size = 112;
  const plane = size * size;
  const out = new Float32Array(3 * plane);
  for (let v = 0; v < size; v += 1) {
    for (let u = 0; u < size; u += 1) {
      // Inverse of [c -s; s c] * p + t.
      const dx = u - tx;
      const dy = v - ty;
      const x = (c * dx + s * dy) / det;
      const y = (-s * dx + c * dy) / det;
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      for (let ch = 0; ch < 3; ch += 1) {
        const sample = (sx: number, sy: number) => (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height ? 0 : image.data[(sy * image.width + sx) * 3 + ch]);
        const value = sample(x0, y0) * (1 - fx) * (1 - fy) + sample(x0 + 1, y0) * fx * (1 - fy) + sample(x0, y0 + 1) * (1 - fx) * fy + sample(x0 + 1, y0 + 1) * fx * fy;
        out[ch * plane + v * size + u] = value;
      }
    }
  }
  return out;
}

export class FaceEngine {
  private detector: Promise<ort.InferenceSession> | null = null;
  private recognizer: Promise<ort.InferenceSession> | null = null;

  /** False until `npm run models:download` has been run on this machine. */
  modelsAvailable(): boolean {
    return existsSync(DETECTOR_FILE) && existsSync(RECOGNIZER_FILE);
  }

  private session(file: string, slot: 'detector' | 'recognizer') {
    if (!this[slot]) {
      this[slot] = ort.InferenceSession.create(file, { logSeverityLevel: 3 }).catch((error: unknown) => {
        this[slot] = null;
        throw error;
      });
    }
    return this[slot]!;
  }

  async detect(image: RgbImage): Promise<DetectedFace[]> {
    const scale = DETECTOR_SIZE / Math.max(image.width, image.height);
    const width = Math.round(image.width * scale);
    const height = Math.round(image.height * scale);
    // Letterbox into 640x640 (pad right/bottom) so coordinates only need dividing by `scale`.
    const resized = await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 3 } })
      .resize(width, height)
      .extend({ right: DETECTOR_SIZE - width, bottom: DETECTOR_SIZE - height, background: { r: 0, g: 0, b: 0 } })
      .raw()
      .toBuffer();
    const plane = DETECTOR_SIZE * DETECTOR_SIZE;
    const input = new Float32Array(3 * plane);
    // YuNet was trained on OpenCV BGR images with 0-255 values.
    for (let i = 0; i < plane; i += 1) {
      input[i] = resized[i * 3 + 2];
      input[plane + i] = resized[i * 3 + 1];
      input[2 * plane + i] = resized[i * 3];
    }
    const session = await this.session(DETECTOR_FILE, 'detector');
    const outputs = await session.run({ input: new ort.Tensor('float32', input, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]) });

    const candidates: DetectedFace[] = [];
    for (const stride of [8, 16, 32]) {
      const cls = outputs[`cls_${stride}`].data as Float32Array;
      const obj = outputs[`obj_${stride}`].data as Float32Array;
      const bbox = outputs[`bbox_${stride}`].data as Float32Array;
      const kps = outputs[`kps_${stride}`].data as Float32Array;
      const cols = DETECTOR_SIZE / stride;
      for (let index = 0; index < cls.length; index += 1) {
        const score = Math.sqrt(Math.min(1, Math.max(0, cls[index])) * Math.min(1, Math.max(0, obj[index])));
        if (score < SCORE_THRESHOLD) continue;
        const row = Math.floor(index / cols);
        const col = index % cols;
        const cx = (col + bbox[index * 4]) * stride;
        const cy = (row + bbox[index * 4 + 1]) * stride;
        const w = Math.exp(bbox[index * 4 + 2]) * stride;
        const h = Math.exp(bbox[index * 4 + 3]) * stride;
        const landmarks: Point[] = [];
        for (let k = 0; k < 5; k += 1) landmarks.push([((kps[index * 10 + 2 * k] + col) * stride) / scale, ((kps[index * 10 + 2 * k + 1] + row) * stride) / scale]);
        candidates.push({ score, box: { x: (cx - w / 2) / scale, y: (cy - h / 2) / scale, width: w / scale, height: h / scale }, landmarks });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const kept: DetectedFace[] = [];
    for (const face of candidates) if (kept.every((other) => iou(face.box, other.box) < NMS_IOU)) kept.push(face);
    return kept;
  }

  /**
   * Finds small faces (e.g. the photo on an ID card held up next to the face) by
   * searching the areas left and right of `exclude` at a larger scale. A whole
   * webcam frame is shrunk to 640px for detection, which makes a card photo too
   * small to find. Boxes and landmarks are returned in full-image coordinates.
   */
  async detectBeside(image: RgbImage, exclude: DetectedFace['box']): Promise<DetectedFace[]> {
    const margin = exclude.width * 0.1;
    const regions = [
      { left: 0, width: Math.floor(exclude.x - margin) },
      { left: Math.ceil(exclude.x + exclude.width + margin), width: image.width - Math.ceil(exclude.x + exclude.width + margin) },
    ].filter((region) => region.width >= 64 && region.left >= 0 && region.left + region.width <= image.width);
    const found: DetectedFace[] = [];
    for (const region of regions) {
      const crop = await sharp(image.data, { raw: { width: image.width, height: image.height, channels: 3 } })
        .extract({ left: region.left, top: 0, width: region.width, height: image.height })
        .raw()
        .toBuffer();
      const faces = await this.detect({ data: crop, width: region.width, height: image.height });
      for (const face of faces) {
        found.push({ score: face.score, box: { ...face.box, x: face.box.x + region.left }, landmarks: face.landmarks.map(([x, y]) => [x + region.left, y] as Point) });
      }
    }
    return found;
  }

  /** L2-normalised 128-d embedding of one detected face. */
  async embed(image: RgbImage, face: DetectedFace): Promise<Float32Array> {
    const session = await this.session(RECOGNIZER_FILE, 'recognizer');
    const outputs = await session.run({ data: new ort.Tensor('float32', alignFace(image, face.landmarks), [1, 3, 112, 112]) });
    const raw = outputs.fc1.data as Float32Array;
    const norm = Math.sqrt(raw.reduce((sum, value) => sum + value * value, 0)) || 1;
    return Float32Array.from(raw, (value) => value / norm);
  }
}
