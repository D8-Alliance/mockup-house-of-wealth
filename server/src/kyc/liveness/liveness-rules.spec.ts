import { DetectedFace, Point } from './face-engine';
import { evaluateFaceStep, FrameFacts, issueSteps, randomChallenges, splitLiveAndCardFaces } from './liveness-rules';

/** A face in a 640x480 frame; `noseShift` moves the nose sideways (yaw), `noseLift` up (pitch). */
function face({ centreX = 320, centreY = 240, width = 200, noseShift = 0, noseLift = 0 } = {}): DetectedFace {
  const eyeY = centreY - 30;
  const mouthY = centreY + 50;
  const landmarks: Point[] = [[centreX - 40, eyeY], [centreX + 40, eyeY], [centreX + noseShift, centreY + 16 - noseLift], [centreX - 30, mouthY], [centreX + 30, mouthY]];
  return { score: 0.9, box: { x: centreX - width / 2, y: centreY - width * 0.6, width, height: width * 1.2 }, landmarks };
}
const frame = (faces: DetectedFace[], brightness = 130): FrameFacts => ({ width: 640, height: 480, faces, brightness });
const baseline = { yaw: 0, pitch: 0.575 };

describe('liveness challenges', () => {
  it('issues ALIGN, three random movements, then the ID steps', () => {
    const steps = issueSteps();
    expect(steps[0]).toBe('ALIGN');
    expect(steps.slice(-2)).toEqual(['ID_CARD', 'FACE_WITH_ID']);
    expect(steps).toHaveLength(6);
  });

  it('never repeats the same movement twice in a row', () => {
    for (let i = 0; i < 200; i += 1) {
      const sequence = randomChallenges();
      for (let j = 1; j < sequence.length; j += 1) expect(sequence[j]).not.toBe(sequence[j - 1]);
    }
  });
});

describe('face zone (ALIGN)', () => {
  it('accepts a single, centred, well-lit face looking straight', () => {
    expect(evaluateFaceStep('ALIGN', frame([face()]), null).accepted).toBe(true);
  });

  it('asks to move closer when the face is too small', () => {
    const verdict = evaluateFaceStep('ALIGN', frame([face({ width: 90 })]), null);
    expect(verdict.accepted).toBe(false);
    expect(verdict.message).toMatch(/closer/);
  });

  it('asks to centre the face when it is outside the oval', () => {
    expect(evaluateFaceStep('ALIGN', frame([face({ centreX: 520 })]), null).message).toMatch(/centre/);
  });

  it('rejects a second person and a dark frame', () => {
    expect(evaluateFaceStep('ALIGN', frame([face(), face({ centreX: 100, width: 120 })]), null).message).toMatch(/one person/);
    expect(evaluateFaceStep('ALIGN', frame([face()], 30), null).message).toMatch(/dark/);
  });

  it('requires looking straight at the camera', () => {
    expect(evaluateFaceStep('ALIGN', frame([face({ noseShift: 20 })]), null).message).toMatch(/straight/);
  });
});

describe('head movements', () => {
  // Raw (un-mirrored) camera frame: turning to the person's LEFT moves the nose to the image's RIGHT.
  it('detects a turn to the left and to the right', () => {
    expect(evaluateFaceStep('TURN_LEFT', frame([face({ noseShift: 22 })]), baseline).accepted).toBe(true);
    expect(evaluateFaceStep('TURN_RIGHT', frame([face({ noseShift: -22 })]), baseline).accepted).toBe(true);
  });

  it('does not accept the wrong direction or too small a movement', () => {
    expect(evaluateFaceStep('TURN_LEFT', frame([face({ noseShift: -22 })]), baseline).accepted).toBe(false);
    expect(evaluateFaceStep('TURN_LEFT', frame([face({ noseShift: 8 })]), baseline).accepted).toBe(false);
  });

  it('detects looking up as the nose rising towards the eye line', () => {
    expect(evaluateFaceStep('LOOK_UP', frame([face({ noseLift: 10 })]), baseline).accepted).toBe(true);
    expect(evaluateFaceStep('LOOK_UP', frame([face({ noseLift: 2 })]), baseline).accepted).toBe(false);
  });

  it('needs the aligned baseline first', () => {
    expect(evaluateFaceStep('TURN_LEFT', frame([face({ noseShift: 22 })]), null).accepted).toBe(false);
  });
});

describe('face with ID card', () => {
  it('treats the largest face as the live person and smaller ones as the card photo', () => {
    const live = face({ width: 220 });
    const card = face({ centreX: 520, width: 60 });
    expect(splitLiveAndCardFaces([card, live])).toEqual({ live, cardFaces: [card] });
  });
});
