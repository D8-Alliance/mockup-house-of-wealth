import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, CreditCard, RefreshCw, ScanFace, X } from 'lucide-react';
import { apiClient, apiErrorMessage, LivenessSession, LivenessStep } from '../services/apiClient';

const STEP_TEXT: Record<LivenessStep, { title: string; hint: string }> = {
  ALIGN: { title: 'Position your face inside the oval', hint: 'Look straight at the camera. Remove sunglasses or a face mask.' },
  TURN_LEFT: { title: 'Turn your head to your LEFT', hint: 'Turn slowly and hold for a moment.' },
  TURN_RIGHT: { title: 'Turn your head to your RIGHT', hint: 'Turn slowly and hold for a moment.' },
  LOOK_UP: { title: 'Tilt your head UP', hint: 'Lift your chin slowly and hold for a moment.' },
  ID_CARD: { title: 'Show the FRONT of your ID card', hint: 'Hold the card inside the frame, close to the camera, without glare.' },
  FACE_WITH_ID: { title: 'Hold your ID card next to your face', hint: 'Your face and the photo on the card must both be visible.' },
};

const isCardStep = (step: LivenessStep | undefined) => step === 'ID_CARD';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface KycLivenessCaptureProps {
  onFinished: (session: LivenessSession) => void;
  onCancel: () => void;
}

/**
 * Camera face verification (prototype). The server issues a random sequence of
 * head movements and checks every frame itself; this component only shows the
 * camera, the guides and the server's feedback. The preview is mirrored like a
 * selfie camera, but frames are sent un-mirrored so left/right are measured correctly.
 */
export const KycLivenessCapture: React.FC<KycLivenessCaptureProps> = ({ onFinished, onCancel }) => {
  const [phase, setPhase] = useState<'consent' | 'starting' | 'running' | 'passed' | 'failed'>('consent');
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState<LivenessSession | null>(null);
  const [message, setMessage] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [aspect, setAspect] = useState(16 / 9);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const stepDeadlineRef = useRef(0);

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  // Countdown for the current step (the server enforces the same limit).
  useEffect(() => {
    if (phase !== 'running') return undefined;
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.ceil((stepDeadlineRef.current - Date.now()) / 1000))), 250);
    return () => clearInterval(timer);
  }, [phase]);

  const captureFrame = (step: LivenessStep): Promise<Blob> => {
    const video = videoRef.current!;
    // ID steps need more pixels so the card text and photo can be read.
    const maxWidth = step === 'ID_CARD' || step === 'FACE_WITH_ID' ? 1280 : 960;
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
      }
      const step = current.steps[current.currentStep];
      try {
        const result = await apiClient.submitLivenessFrame(current.id, step, await captureFrame(step));
        if (!runningRef.current) return;
        current = result.session;
        setSession(current);
        setMessage(result.message);
        setAccepted(result.accepted);
        // Pause after a completed step so the next instruction can be read.
        await sleep(result.accepted ? 1000 : 350);
      } catch (cause) {
        if (!runningRef.current) return;
        setError(apiErrorMessage(cause, 'Face verification stopped. Please try again.'));
        setPhase('failed');
        stopCamera();
        return;
      }
    }
    // Loop left because the person cancelled: nothing to report.
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
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot use the camera. Use a recent Chrome, Edge or Safari over https.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
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
      setError(name === 'NotAllowedError' ? 'Camera permission was denied. Allow camera access in your browser and try again.'
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
  const text = step ? STEP_TEXT[step] : null;
  const guideColour = accepted ? '#10b981' : '#fbbf24';

  return (
    <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2"><ScanFace className="w-4 h-4 text-purple-600" />Face verification</h5>
        <button type="button" onClick={cancel} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Close face verification"><X className="w-4 h-4" /></button>
      </div>

      {phase === 'consent' && (
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <ul className="list-disc pl-5 space-y-1">
            <li>Your camera is used to confirm you are a real person and match the photo on your ID card.</li>
            <li>You will be asked to follow a few random head movements, then show your ID card.</li>
            <li>Captured images are stored with your KYC application and can only be viewed by authorised KYC officers.</li>
            <li>Have your ID card ready, and use a well-lit place.</li>
          </ul>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5" />
            <span>I agree to the use of my camera and the storage of these images for identity verification.</span>
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Cancel</button>
            <button type="button" disabled={!consent} onClick={() => void start()} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"><Camera className="w-3.5 h-3.5" />Start camera</button>
          </div>
        </div>
      )}

      <div className={phase === 'starting' || phase === 'running' ? 'space-y-3' : 'hidden'}>
        <div className="relative w-full max-w-xl mx-auto rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: String(aspect) }}>
          <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
          {phase === 'running' && step && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id="liveness-guide">
                  <rect width="100" height="100" fill="white" />
                  {!isCardStep(step) && <ellipse cx={step === 'FACE_WITH_ID' ? 38 : 50} cy="50" rx="20" ry="34" fill="black" />}
                  {(isCardStep(step) || step === 'FACE_WITH_ID') && <rect x={step === 'FACE_WITH_ID' ? 62 : 18} y={step === 'FACE_WITH_ID' ? 40 : 22} width={step === 'FACE_WITH_ID' ? 30 : 64} height={step === 'FACE_WITH_ID' ? 30 : 56} rx="3" fill="black" />}
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(15,23,42,0.55)" mask="url(#liveness-guide)" />
              {!isCardStep(step) && <ellipse cx={step === 'FACE_WITH_ID' ? 38 : 50} cy="50" rx="20" ry="34" fill="none" stroke={guideColour} strokeWidth="0.8" />}
              {(isCardStep(step) || step === 'FACE_WITH_ID') && <rect x={step === 'FACE_WITH_ID' ? 62 : 18} y={step === 'FACE_WITH_ID' ? 40 : 22} width={step === 'FACE_WITH_ID' ? 30 : 64} height={step === 'FACE_WITH_ID' ? 30 : 56} rx="3" fill="none" stroke={guideColour} strokeWidth="0.8" strokeDasharray="2 1" />}
            </svg>
          )}
          {phase === 'starting' && <div className="absolute inset-0 flex items-center justify-center text-white text-xs gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Starting camera...</div>}
        </div>

        {phase === 'running' && session && text && (
          <div className="space-y-2 text-center">
            <div className="flex justify-center gap-1.5" aria-label={`Step ${session.currentStep + 1} of ${session.steps.length}`}>
              {session.steps.map((item, index) => <span key={`${item}-${index}`} className={`h-1.5 w-8 rounded-full ${index < session.currentStep ? 'bg-emerald-500' : index === session.currentStep ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-600'}`} />)}
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white flex items-center justify-center gap-2">
              {isCardStep(step) || step === 'FACE_WITH_ID' ? <CreditCard className="w-5 h-5 text-purple-600" /> : <ScanFace className="w-5 h-5 text-purple-600" />}
              {text.title}
            </div>
            <div className="text-xs text-slate-500">{text.hint}</div>
            {message && <div className={`text-xs font-bold ${accepted ? 'text-emerald-600' : 'text-amber-600'}`}>{message}</div>}
            <div className="text-[11px] text-slate-400">Step {session.currentStep + 1} of {session.steps.length} · {secondsLeft}s left</div>
          </div>
        )}
      </div>

      {phase === 'passed' && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Face verification completed. A KYC officer will review it with your application.</div>
      )}

      {phase === 'failed' && (
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">{error}</div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={cancel} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold cursor-pointer">Close</button>
            <button type="button" onClick={() => void start()} className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" />Try again</button>
          </div>
        </div>
      )}
    </div>
  );
};
