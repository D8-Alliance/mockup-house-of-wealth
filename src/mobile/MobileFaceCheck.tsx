import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, CreditCard, RefreshCw, ScanFace, X } from 'lucide-react';
import { apiClient, apiErrorMessage, LivenessSession, LivenessStep } from '../services/apiClient';

/** Short, large instructions for a phone held at arm's length. */
const STEP_TEXT: Record<LivenessStep, { title: string; hint: string }> = {
  ALIGN: { title: 'Fit your face in the oval', hint: 'Look straight at the screen. No sunglasses or face mask.' },
  TURN_LEFT: { title: 'Turn your head LEFT', hint: 'Slowly, then hold for a moment.' },
  TURN_RIGHT: { title: 'Turn your head RIGHT', hint: 'Slowly, then hold for a moment.' },
  LOOK_UP: { title: 'Tilt your head UP', hint: 'Keep the phone at eye level and lift your chin.' },
  ID_CARD: { title: 'Show the FRONT of your ID card', hint: 'Fill the frame with the card, flat, in good light, no glare.' },
  FACE_WITH_ID: { title: 'Hold your ID card next to your face', hint: 'Your face and the photo on the card must both be visible.' },
};

const isCardStep = (step: LivenessStep | undefined) => step === 'ID_CARD';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The face guide in the camera picture's 0-100 box, as on the website (the server wants a face 22-65% wide). */
function faceOval(aspect: number, withCard: boolean): { cx: number; rx: number; ry: number } {
  const shape = 0.75;
  let ry = 38;
  let rx = (ry * shape) / aspect;
  const maxRx = withCard ? 22 : 30;
  if (rx > maxRx) { rx = maxRx; ry = (rx * aspect) / shape; }
  return { cx: withCard ? 38 : 50, rx, ry };
}

interface MobileFaceCheckProps {
  onFinished: (session: LivenessSession) => void;
  onCancel: () => void;
}

/**
 * Face verification for the mini-app, full screen: the instruction on top, the camera picture in the middle with
 * the server's live feedback over it (move closer, move back, centre your face), nothing to scroll. The server
 * issues the random steps and judges every frame, exactly as on the website (src/kyc/KycLivenessCapture.tsx);
 * frames are sent un-mirrored so left and right are measured correctly.
 */
export const MobileFaceCheck: React.FC<MobileFaceCheckProps> = ({ onFinished, onCancel }) => {
  const [phase, setPhase] = useState<'consent' | 'starting' | 'running' | 'passed' | 'failed'>('consent');
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState<LivenessSession | null>(null);
  const [message, setMessage] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [aspect, setAspect] = useState(9 / 16);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const stepDeadlineRef = useRef(0);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);
  useEffect(() => stopCamera, [stopCamera]);

  // The picture keeps the camera's own shape, as large as the screen allows, so the oval matches what the server
  // measures (cropping the picture to fill the screen would move the face relative to the oval).
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return undefined;
    const fit = () => {
      const width = area.clientWidth;
      const height = area.clientHeight;
      setBox(width / height > aspect ? { width: height * aspect, height } : { width, height: width / aspect });
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [aspect, phase]);

  useEffect(() => {
    if (phase !== 'running') return undefined;
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((stepDeadlineRef.current - Date.now()) / 1000))), 250);
    return () => clearInterval(timer);
  }, [phase]);

  const captureFrame = (step: LivenessStep): Promise<Blob> => {
    const video = videoRef.current!;
    const maxWidth = step === 'ID_CARD' ? 1920 : step === 'FACE_WITH_ID' ? 1280 : 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not capture a camera frame.'))), 'image/jpeg', 0.85));
  };

  const run = async (initial: LivenessSession) => {
    runningRef.current = true;
    let current = initial;
    let stepIndex = -1;
    while (runningRef.current && current.status === 'IN_PROGRESS') {
      if (current.currentStep !== stepIndex) {
        stepIndex = current.currentStep;
        stepDeadlineRef.current = Date.now() + current.stepTimeLimitSeconds * 1000;
        setMessage('');
      }
      const step = current.steps[current.currentStep];
      try {
        const result = await apiClient.submitLivenessFrame(current.id, step, await captureFrame(step));
        if (!runningRef.current) return;
        current = result.session;
        setSession(current);
        setMessage(result.message);
        setAccepted(result.accepted);
        setProgress(typeof result.metrics?.progress === 'number' && !result.accepted ? result.metrics.progress : null);
        await sleep(result.accepted ? 1000 : 350);
      } catch (cause) {
        if (!runningRef.current) return;
        setError(apiErrorMessage(cause, 'Face verification stopped. Please try again.'));
        setPhase('failed');
        stopCamera();
        return;
      }
    }
    if (!runningRef.current && current.status === 'IN_PROGRESS') return;
    stopCamera();
    if (current.status === 'PASSED') {
      setPhase('passed');
      onFinished(current);
    } else {
      setError(current.result?.failureReason || 'Face verification did not finish. Please try again.');
      setPhase('failed');
    }
  };

  const start = async () => {
    setPhase('starting');
    setError('');
    setMessage('');
    setAccepted(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use the camera. Use a recent Chrome or Safari over https.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight);
      const started = await apiClient.startLiveness();
      setSession(started);
      setPhase('running');
      void run(started);
    } catch (cause) {
      stopCamera();
      const name = cause instanceof DOMException ? cause.name : '';
      setError(name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access for this site and try again.'
        : name === 'NotFoundError' ? 'No camera was found on this device.'
          : apiErrorMessage(cause, 'Face verification could not start.'));
      setPhase('failed');
    }
  };

  const cancel = () => {
    stopCamera();
    onCancel();
  };

  const step = session?.steps[session.currentStep];
  const oval = faceOval(aspect, step === 'FACE_WITH_ID');
  const text = step ? STEP_TEXT[step] : null;
  const guideColour = accepted ? '#10b981' : '#fbbf24';
  const cameraOn = phase === 'starting' || phase === 'running';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white" role="dialog" aria-label="Face verification">
      {/* Top: steps, time left, close; then the instruction in large type. */}
      <div className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 space-y-2 bg-gradient-to-b from-black to-black/70">
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-label={session ? `Step ${session.currentStep + 1} of ${session.steps.length}` : undefined}>
            {session?.steps.map((item, index) => <span key={`${item}-${index}`} className={`h-1.5 w-7 rounded-full ${index < session.currentStep ? 'bg-emerald-500' : index === session.currentStep ? 'bg-white' : 'bg-white/25'}`} />)}
          </div>
          <div className="flex items-center gap-3">
            {phase === 'running' && <span className="text-xs font-bold text-white/70">{secondsLeft}s</span>}
            <button type="button" onClick={cancel} aria-label="Close face verification" className="p-2 rounded-full bg-white/10"><X className="w-5 h-5" /></button>
          </div>
        </div>
        {phase === 'running' && text && (
          <div>
            <p className="text-xl font-black flex items-center gap-2">{isCardStep(step) || step === 'FACE_WITH_ID' ? <CreditCard className="w-6 h-6 shrink-0" /> : <ScanFace className="w-6 h-6 shrink-0" />}{text.title}</p>
            <p className="text-sm text-white/70">{text.hint}</p>
          </div>
        )}
        {phase !== 'running' && <p className="text-xl font-black flex items-center gap-2"><ScanFace className="w-6 h-6" />Face verification</p>}
      </div>

      {/* Middle: the camera picture, as large as fits, with the guide and the live feedback over it. */}
      <div ref={areaRef} className="relative flex-1 min-h-0 flex items-center justify-center">
        <div className={cameraOn ? 'relative overflow-hidden rounded-2xl' : 'hidden'} style={{ width: box.width, height: box.height }}>
          <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
          {phase === 'running' && step && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id="mobile-face-guide">
                  <rect width="100" height="100" fill="white" />
                  {!isCardStep(step) && <ellipse cx={oval.cx} cy="50" rx={oval.rx} ry={oval.ry} fill="black" />}
                  {(isCardStep(step) || step === 'FACE_WITH_ID') && <rect x={step === 'FACE_WITH_ID' ? 62 : 8} y={step === 'FACE_WITH_ID' ? 40 : 30} width={step === 'FACE_WITH_ID' ? 30 : 84} height={step === 'FACE_WITH_ID' ? 30 : 40} rx="3" fill="black" />}
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#mobile-face-guide)" />
              {!isCardStep(step) && <ellipse cx={oval.cx} cy="50" rx={oval.rx} ry={oval.ry} fill="none" stroke={guideColour} strokeWidth="0.9" />}
              {(isCardStep(step) || step === 'FACE_WITH_ID') && <rect x={step === 'FACE_WITH_ID' ? 62 : 8} y={step === 'FACE_WITH_ID' ? 40 : 30} width={step === 'FACE_WITH_ID' ? 30 : 84} height={step === 'FACE_WITH_ID' ? 30 : 40} rx="3" fill="none" stroke={guideColour} strokeWidth="0.9" strokeDasharray="2 1" />}
            </svg>
          )}
          {phase === 'starting' && <div className="absolute inset-0 flex items-center justify-center text-sm gap-2"><RefreshCw className="w-5 h-5 animate-spin" />Starting camera...</div>}
          {phase === 'running' && (message || progress !== null) && (
            <div className="absolute inset-x-3 bottom-3 space-y-2">
              {message && <p role="status" className={`rounded-2xl px-4 py-3 text-center text-base font-black shadow-lg ${accepted ? 'bg-emerald-600' : 'bg-amber-400 text-slate-950'}`}>{message}</p>}
              {progress !== null && (
                <div className="mx-auto w-2/3 h-2 rounded-full bg-white/30 overflow-hidden" role="progressbar" aria-label="Movement progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                  <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              )}
            </div>
          )}
        </div>

        {phase === 'consent' && (
          <div className="w-full max-w-md px-5 space-y-4 text-sm">
            <ul className="list-disc pl-5 space-y-2 text-white/85">
              <li>The camera confirms you are a real person and match the photo on your ID card.</li>
              <li>You will follow a few head movements, then show your ID card.</li>
              <li>Keep the phone at eye level, in a bright place, with your ID card ready.</li>
              <li>The images are kept with your KYC application and seen only by authorised KYC officers.</li>
            </ul>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 w-5 h-5 shrink-0" />
              <span>I agree to the use of my camera and the storage of these images for identity verification.</span>
            </label>
            <button type="button" disabled={!consent} onClick={() => void start()} className="w-full py-3.5 rounded-2xl bg-purple-600 disabled:opacity-50 font-black flex items-center justify-center gap-2"><Camera className="w-5 h-5" />Start camera</button>
          </div>
        )}

        {phase === 'passed' && (
          <div className="px-6 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 mx-auto text-emerald-400" />
            <p className="text-lg font-black">Face verification completed</p>
            <button type="button" onClick={onCancel} className="w-full py-3.5 rounded-2xl bg-emerald-600 font-black">Continue</button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="w-full max-w-md px-5 space-y-3">
            <p className="rounded-2xl bg-rose-500/20 border border-rose-400/40 p-4 text-sm font-semibold">{error}</p>
            <button type="button" onClick={() => void start()} className="w-full py-3.5 rounded-2xl bg-purple-600 font-black flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5" />Try again</button>
            <button type="button" onClick={cancel} className="w-full py-3 rounded-2xl bg-white/10 font-bold">Close</button>
          </div>
        )}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
};
