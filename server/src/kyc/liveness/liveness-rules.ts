import { randomInt } from 'node:crypto';
import { DetectedFace, headPose } from './face-engine';

/**
 * Rules for the face-verification (liveness) prototype. Pure functions, so the
 * thresholds can be unit-tested and tuned without a camera.
 *
 * Step order: ALIGN (face in the oval, looking straight), a random sequence of
 * head movements chosen by the server, then ID_CARD (front of the ID close to the
 * camera) and FACE_WITH_ID (face and ID photo in the same frame).
 */

export const CHALLENGE_STEPS = ['TURN_LEFT', 'TURN_RIGHT', 'LOOK_UP'] as const;
export const LIVENESS_STEPS = ['ALIGN', ...CHALLENGE_STEPS, 'ID_CARD', 'FACE_WITH_ID'] as const;
export type LivenessStep = (typeof LIVENESS_STEPS)[number];

export const SESSION_TTL_MS = 5 * 60_000;
export const STEP_TIME_LIMIT_MS = 45_000;
const CHALLENGE_COUNT = 3;

export const THRESHOLDS = {
  /** Face width as a share of the frame width while aligning in the oval. */
  minFaceWidth: 0.22,
  maxFaceWidth: 0.65,
  /** Face centre may be this far from the frame centre (share of width / height). */
  maxCentreOffsetX: 0.15,
  maxCentreOffsetY: 0.2,
  minBrightness: 60,
  maxBrightness: 220,
  /** |yaw| while aligning, i.e. looking roughly straight at the camera. */
  maxAlignYaw: 0.15,
  /** Yaw change from the aligned pose that counts as a head turn. */
  turnYaw: 0.22,
  /** Pitch drop from the aligned pose that counts as looking up. */
  lookUpPitch: 0.08,
  /** SFace cosine similarity: the OpenCV-recommended threshold for "same person". */
  samePerson: 0.363,
} as const;

/** Random head-movement sequence, never the same movement twice in a row. Uses a CSPRNG. */
export function randomChallenges(count = CHALLENGE_COUNT): LivenessStep[] {
  const sequence: LivenessStep[] = [];
  while (sequence.length < count) {
    const options = CHALLENGE_STEPS.filter((step) => step !== sequence[sequence.length - 1]);
    sequence.push(options[randomInt(options.length)]);
  }
  return sequence;
}

export function issueSteps(): LivenessStep[] {
  return ['ALIGN', ...randomChallenges(), 'ID_CARD', 'FACE_WITH_ID'];
}

export interface FrameFacts {
  width: number;
  height: number;
  faces: DetectedFace[];
  /** Mean brightness of the largest face. */
  brightness: number;
}

export interface Baseline {
  yaw: number;
  pitch: number;
}

export interface StepVerdict {
  accepted: boolean;
  /** Guidance for the person in front of the camera. */
  message: string;
  metrics: Record<string, number | string | boolean>;
}

const largest = (faces: DetectedFace[]) => [...faces].sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height)[0];

/** Whether the face is in the on-screen oval: size, position and lighting. */
export function faceZone(frame: FrameFacts, face: DetectedFace) {
  const widthRatio = face.box.width / frame.width;
  const offsetX = (face.box.x + face.box.width / 2) / frame.width - 0.5;
  const offsetY = (face.box.y + face.box.height / 2) / frame.height - 0.5;
  let message = '';
  if (widthRatio < THRESHOLDS.minFaceWidth) message = 'Move closer: your face is too small in the oval.';
  else if (widthRatio > THRESHOLDS.maxFaceWidth) message = 'Move back a little: your face is too close.';
  else if (Math.abs(offsetX) > THRESHOLDS.maxCentreOffsetX || Math.abs(offsetY) > THRESHOLDS.maxCentreOffsetY) message = 'Move your face to the centre of the oval.';
  else if (frame.brightness < THRESHOLDS.minBrightness) message = 'It is too dark. Move to a brighter place.';
  else if (frame.brightness > THRESHOLDS.maxBrightness) message = 'Too bright. Avoid direct light behind or on your face.';
  return { ok: !message, message, widthRatio, offsetX, offsetY };
}

/**
 * Evaluates a frame for the face steps (ALIGN and the head movements).
 * Frames are the raw, un-mirrored camera image: when the person turns to
 * THEIR left, their nose moves towards the IMAGE's right, so yaw increases.
 */
export function evaluateFaceStep(step: LivenessStep, frame: FrameFacts, baseline: Baseline | null): StepVerdict {
  if (!frame.faces.length) return { accepted: false, message: 'No face detected. Look at the camera.', metrics: { faces: 0 } };
  if (frame.faces.length > 1) return { accepted: false, message: 'Only one person should be in front of the camera.', metrics: { faces: frame.faces.length } };
  const face = frame.faces[0];
  const zone = faceZone(frame, face);
  const pose = headPose(face.landmarks);
  const metrics = { faces: 1, yaw: round(pose.yaw), pitch: round(pose.pitch), widthRatio: round(zone.widthRatio), brightness: Math.round(frame.brightness) };

  if (step === 'ALIGN') {
    if (!zone.ok) return { accepted: false, message: zone.message, metrics };
    if (Math.abs(pose.yaw) > THRESHOLDS.maxAlignYaw) return { accepted: false, message: 'Look straight at the camera.', metrics };
    return { accepted: true, message: 'Face aligned.', metrics };
  }
  if (!baseline) return { accepted: false, message: 'Align your face first.', metrics };
  // During a movement the face may leave the centre a little, but must stay in view and at a usable size.
  if (zone.widthRatio < THRESHOLDS.minFaceWidth * 0.7) return { accepted: false, message: 'Move closer: your face is too small in the oval.', metrics };
  const yawChange = pose.yaw - baseline.yaw;
  const pitchChange = pose.pitch - baseline.pitch;
  const done =
    step === 'TURN_LEFT' ? yawChange >= THRESHOLDS.turnYaw
      : step === 'TURN_RIGHT' ? yawChange <= -THRESHOLDS.turnYaw
        : step === 'LOOK_UP' ? pitchChange <= -THRESHOLDS.lookUpPitch
          : false;
  const prompt = step === 'TURN_LEFT' ? 'Slowly turn your head to your LEFT.' : step === 'TURN_RIGHT' ? 'Slowly turn your head to your RIGHT.' : 'Slowly tilt your head UP.';
  return { accepted: done, message: done ? 'Movement detected.' : prompt, metrics: { ...metrics, yawChange: round(yawChange), pitchChange: round(pitchChange) } };
}

/** The live face is the largest face in the frame; any smaller face is assumed to be the photo on the ID card. */
export function splitLiveAndCardFaces(faces: DetectedFace[]): { live: DetectedFace | undefined; cardFaces: DetectedFace[] } {
  const live = largest(faces);
  return { live, cardFaces: faces.filter((face) => face !== live) };
}

const round = (value: number) => Math.round(value * 1000) / 1000;
