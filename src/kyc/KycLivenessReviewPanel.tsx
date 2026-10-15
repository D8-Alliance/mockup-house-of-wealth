import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ScanFace } from 'lucide-react';
import { apiClient, apiErrorMessage, LivenessReview, LivenessStep } from '../services/apiClient';
import { formatDateTime } from '../utils/platformTime';

const STEP_LABELS: Record<LivenessStep, string> = {
  ALIGN: 'Face in oval',
  TURN_LEFT: 'Turned left',
  TURN_RIGHT: 'Turned right',
  LOOK_UP: 'Looked up',
  ID_CARD: 'ID card',
  FACE_WITH_ID: 'Face with ID card',
};
// SFace cosine similarity; the server uses the same threshold (THRESHOLDS.samePerson).
const SAME_PERSON = 0.363;

/** Officer view of the applicant's camera face verification: result, scores and captured frames. */
export const KycLivenessReviewPanel: React.FC<{ applicationId: string }> = ({ applicationId }) => {
  const [review, setReview] = useState<LivenessReview | null | undefined>(undefined);
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    setReview(undefined);
    setImages({});
    apiClient.getKycLivenessForReview(applicationId)
      .then(async (data) => {
        if (cancelled) return;
        setReview(data);
        for (const frame of data?.frames ?? []) {
          const url = await apiClient.getKycLivenessFrameUrl(applicationId, frame.id);
          if (cancelled) { URL.revokeObjectURL(url); return; }
          urls.push(url);
          setImages((current) => ({ ...current, [frame.id]: url }));
        }
      })
      .catch((cause) => { if (!cancelled) setError(apiErrorMessage(cause, 'Face verification could not be loaded.')); });
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [applicationId]);

  const similarity = (value: number | null | undefined) => {
    if (typeof value !== 'number' || value < 0) return <span className="text-slate-400">not available</span>;
    const match = value >= SAME_PERSON;
    return <span className={`font-bold ${match ? 'text-emerald-600' : 'text-amber-600'}`}>{value.toFixed(2)} ({match ? 'same person' : 'does not match'})</span>;
  };

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase flex items-center gap-1.5"><ScanFace className="w-4 h-4 text-purple-500" />Face verification (camera, prototype)</h5>
      {error && <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">{error}</div>}
      {review === undefined && !error && <p className="text-xs text-slate-400">Loading...</p>}
      {review === null && (
        <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />The applicant did not perform face verification.</p>
      )}
      {review && (
        <>
          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
            <div className="flex items-center gap-1.5">
              {review.status === 'PASSED' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
              <strong>{review.status === 'PASSED' ? 'All movements completed' : `Not completed (${review.status.toLowerCase()})`}</strong>
              {review.completedAt && <span className="text-slate-400">· {formatDateTime(review.completedAt)}</span>}
            </div>
            {review.result?.failureReason && <div className="text-rose-600">{review.result.failureReason}</div>}
            {review.status === 'PASSED' && (
              <>
                <div>Live face vs photo on the ID card held up: {similarity(review.result?.cardFaceSimilarity)}</div>
                <div>Live face vs uploaded ID (front): {similarity(review.result?.uploadedIdFaceSimilarity)}</div>
                <div>ID number on the card shown to the camera: <strong className={review.result?.idNumberOnCard === 'MATCH' ? 'text-emerald-600' : 'text-amber-600'}>{review.result?.idNumberOnCard === 'MATCH' ? 'matches the application' : review.result?.idNumberOnCard === 'MISMATCH' ? 'does NOT match the application' : 'could not be read'}</strong></div>
              </>
            )}
            <div className="text-[10px] text-slate-400">Steps issued: {review.steps.map((step) => STEP_LABELS[step]).join(' → ')}. Prototype: movements and face match are checked on the server, but a screen replay or real-time deepfake is not detected. Compare the frames yourself.</div>
          </div>
          {review.frames.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {review.frames.map((frame) => (
                <figure key={frame.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  {images[frame.id] ? <img src={images[frame.id]} alt={STEP_LABELS[frame.step]} className="w-full aspect-video object-cover" /> : <div className="w-full aspect-video animate-pulse bg-slate-200 dark:bg-slate-700" />}
                  <figcaption className="px-2 py-1 text-[10px] text-slate-500">{STEP_LABELS[frame.step]} · {formatDateTime(frame.capturedAt)}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
