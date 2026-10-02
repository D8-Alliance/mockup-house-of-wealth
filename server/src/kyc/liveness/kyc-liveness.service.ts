import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../auth/identity.service';
import { PrismaService } from '../../prisma.service';
import { DocumentTextReader } from '../checks/document-text-reader';
import { idNumberOnDocument } from '../checks/providers/document-content.provider';
import { KYC_EDITABLE_STATUSES, kycReviewScope } from '../kyc-workflow';
import { detectDocumentType } from '../kyc.service';
import { cosineSimilarity, decodeImage, DetectedFace, FaceEngine, headPose, meanBrightness, RgbImage } from './face-engine';
import { Baseline, evaluateFaceStep, issueSteps, LivenessStep, SESSION_TTL_MS, splitLiveAndCardFaces, STEP_TIME_LIMIT_MS, StepVerdict, THRESHOLDS } from './liveness-rules';

/** What the client is told about a session. Embeddings and raw frames never leave the server. */
export interface LivenessSessionView {
  id: string;
  status: string;
  steps: LivenessStep[];
  currentStep: number;
  expiresAt: Date;
  stepTimeLimitSeconds: number;
  completedAt: Date | null;
  result: LivenessResultView | null;
}

export interface LivenessResultView {
  livenessPassed: boolean;
  failureReason?: string;
  /** Live face vs the photo on the ID card held up to the camera (SFace cosine). */
  cardFaceSimilarity: number | null;
  /** Live face vs the photo on the uploaded ID_FRONT document. */
  uploadedIdFaceSimilarity: number | null;
  idNumberOnCard: 'MATCH' | 'MISMATCH' | 'NOT_FOUND';
}

type StoredMetrics = Record<string, unknown> & { embedding?: number[]; yaw?: number; pitch?: number };

const SESSION_SELECT = { id: true, applicationId: true, userId: true, steps: true, currentStep: true, stepStartedAt: true, status: true, expiresAt: true, completedAt: true, result: true } as const;

/**
 * Face verification prototype (KYC "liveness"): the server issues a random
 * sequence of head movements, validates every captured frame itself (face zone,
 * movement, same person), and finally compares the live face with the photo on
 * the ID card. Advisory input to the KYC officer, like the other automated checks.
 */
@Injectable()
export class KycLivenessService {
  private readonly engine = new FaceEngine();
  private readonly reader = new DocumentTextReader();

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private assertEngine() {
    if (!this.engine.modelsAvailable()) throw new ServiceUnavailableException('Face verification is not set up on this server. Run "npm run models:download" in the server folder.');
  }

  // ---- Applicant -----------------------------------------------------------

  async start(actor: AuthenticatedUser): Promise<LivenessSessionView> {
    this.assertEngine();
    const application = await this.prisma.kycApplication.findFirst({ where: { userId: actor.userId, status: { in: KYC_EDITABLE_STATUSES } }, orderBy: { createdAt: 'desc' } });
    if (!application) throw new BadRequestException('Save your KYC details before starting face verification.');
    // Only one session runs at a time; an unfinished one is abandoned.
    await this.prisma.kycLivenessSession.updateMany({ where: { applicationId: application.id, status: 'IN_PROGRESS' }, data: { status: 'EXPIRED', completedAt: new Date() } });
    const session = await this.prisma.kycLivenessSession.create({
      data: { applicationId: application.id, userId: actor.userId, steps: issueSteps(), expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
      select: SESSION_SELECT,
    });
    await this.audit.recordActor(actor, { action: 'kyc.liveness.start', resourceType: 'KycLivenessSession', resourceId: session.id, organisationId: application.organisationId, countryNodeId: application.countryNodeId, metadata: { applicationId: application.id, steps: session.steps } });
    return this.view(session, 'applicant');
  }

  async latestMine(actor: AuthenticatedUser): Promise<LivenessSessionView | null> {
    const session = await this.prisma.kycLivenessSession.findFirst({ where: { userId: actor.userId }, orderBy: { createdAt: 'desc' }, select: SESSION_SELECT });
    return session && this.view(session, 'applicant');
  }

  /**
   * Checks one camera frame for the current step. Rejected frames only return
   * guidance and are not stored; an accepted frame is kept and the session moves on.
   */
  async submitFrame(actor: AuthenticatedUser, sessionId: string, step: string, file: Express.Multer.File | undefined) {
    this.assertEngine();
    if (!file) throw new BadRequestException('A camera frame is required.');
    const mimeType = detectDocumentType(file.buffer);
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') throw new BadRequestException('Frames must be JPG or PNG images.');
    const session = await this.prisma.kycLivenessSession.findFirst({ where: { id: sessionId, userId: actor.userId }, select: SESSION_SELECT });
    if (!session) throw new NotFoundException('Face verification session not found.');
    if (session.status !== 'IN_PROGRESS') throw new ConflictException(`This face verification session is ${session.status.toLowerCase()}. Start again.`);
    const steps = session.steps as LivenessStep[];
    const now = Date.now();
    if (now > session.expiresAt.getTime()) return this.fail(session.id, 'EXPIRED', 'The session expired before all steps were completed.');
    if (now - session.stepStartedAt.getTime() > STEP_TIME_LIMIT_MS) return this.fail(session.id, 'FAILED', `Step ${steps[session.currentStep]} was not completed within ${STEP_TIME_LIMIT_MS / 1000} seconds.`);
    if (steps[session.currentStep] !== step) throw new ConflictException(`Complete the current step first: ${steps[session.currentStep]}.`);

    const image = await decodeImage(file.buffer);
    const faces = await this.engine.detect(image);
    const frames = await this.prisma.kycLivenessFrame.findMany({ where: { sessionId }, select: { step: true, metrics: true } });
    const alignMetrics = frames.find((frame) => frame.step === 'ALIGN')?.metrics as StoredMetrics | undefined;
    const baseline: Baseline | null = alignMetrics?.yaw !== undefined && alignMetrics.pitch !== undefined ? { yaw: alignMetrics.yaw, pitch: alignMetrics.pitch } : null;
    const baselineEmbedding = alignMetrics?.embedding ? Float32Array.from(alignMetrics.embedding) : null;

    const verdict = step === 'ID_CARD'
      ? await this.evaluateIdCard(actor, session.applicationId, image, faces)
      : step === 'FACE_WITH_ID'
        ? await this.evaluateFaceWithId(image, faces, baselineEmbedding)
        : await this.evaluateFace(step as LivenessStep, image, faces, baseline, baselineEmbedding);
    if (!verdict.accepted) return { accepted: false, message: verdict.message, metrics: applicantMetrics(verdict.metrics), session: this.view(session, 'applicant') };

    const nextStep = session.currentStep + 1;
    const done = nextStep >= steps.length;
    // Conditional on the step we validated, so two frames sent at once cannot both advance the session.
    const advanced = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.kycLivenessSession.updateMany({ where: { id: sessionId, status: 'IN_PROGRESS', currentStep: session.currentStep }, data: { currentStep: nextStep, stepStartedAt: new Date() } });
      if (!claimed.count) return false;
      await tx.kycLivenessFrame.create({ data: { sessionId, step, mimeType, content: file.buffer, metrics: verdict.metrics as Prisma.InputJsonObject } });
      return true;
    });
    if (!advanced) throw new ConflictException('This step was already completed.');
    const updated = done ? await this.finalize(actor, sessionId) : await this.prisma.kycLivenessSession.findUniqueOrThrow({ where: { id: sessionId }, select: SESSION_SELECT });
    return { accepted: true, message: verdict.message, metrics: applicantMetrics(verdict.metrics), session: this.view(updated, 'applicant') };
  }

  private async evaluateFace(step: LivenessStep, image: RgbImage, faces: DetectedFace[], baseline: Baseline | null, baselineEmbedding: Float32Array | null): Promise<StepVerdict> {
    const verdict = evaluateFaceStep(step, { width: image.width, height: image.height, faces, brightness: faces[0] ? meanBrightness(image, faces[0].box) : 0 }, baseline);
    if (!verdict.accepted) return verdict;
    const embedding = await this.engine.embed(image, faces[0]);
    if (step === 'ALIGN') return { ...verdict, metrics: { ...verdict.metrics, embedding: Array.from(embedding) as unknown as string } };
    const similarity = baselineEmbedding ? cosineSimilarity(embedding, baselineEmbedding) : 0;
    // The same person must perform every movement: a swapped face or photo fails here.
    if (similarity < THRESHOLDS.samePerson) return { accepted: false, message: 'A different face was detected. The same person must complete every step.', metrics: { ...verdict.metrics, samePerson: round(similarity) } };
    return { ...verdict, metrics: { ...verdict.metrics, samePerson: round(similarity) } };
  }

  private async evaluateIdCard(actor: AuthenticatedUser, applicationId: string, image: RgbImage, faces: DetectedFace[]): Promise<StepVerdict> {
    const application = await this.prisma.kycApplication.findUniqueOrThrow({ where: { id: applicationId }, select: { idDocumentNumber: true } });
    const { text } = await this.reader.read({ mimeType: 'image/png', content: await toPng(image) });
    const idNumber = idNumberOnDocument(application.idDocumentNumber, text);
    const metrics = { idNumberOnCard: idNumber, textLength: text.length, faces: faces.length };
    if (idNumber === 'MATCH') return { accepted: true, message: 'ID card read.', metrics };
    // Webcam images of a card are often too small for OCR; accept a readable card with a photo and let the officer judge.
    if (faces.length >= 1 && text.replace(/\s/g, '').length >= 20) return { accepted: true, message: 'ID card captured. The number could not be read clearly; the officer will check it.', metrics };
    return { accepted: false, message: 'Hold the FRONT of your ID card inside the frame, close to the camera, without glare.', metrics };
  }

  private async evaluateFaceWithId(image: RgbImage, detected: DetectedFace[], baselineEmbedding: Float32Array | null): Promise<StepVerdict> {
    let faces = detected;
    // The card photo is usually too small to find in the full frame; look beside the live face at a larger scale.
    if (faces.length === 1) faces = [...faces, ...(await this.engine.detectBeside(image, faces[0].box))];
    if (faces.length < 2) return { accepted: false, message: 'Hold your ID card next to your face so both your face and the photo on the card are visible.', metrics: { faces: faces.length } };
    const { live, cardFaces } = splitLiveAndCardFaces(faces);
    const liveEmbedding = await this.engine.embed(image, live!);
    const samePerson = baselineEmbedding ? cosineSimilarity(liveEmbedding, baselineEmbedding) : 0;
    if (samePerson < THRESHOLDS.samePerson) return { accepted: false, message: 'A different face was detected. The same person must complete every step.', metrics: { faces: faces.length, samePerson: round(samePerson) } };
    let cardSimilarity = -1;
    for (const card of cardFaces) cardSimilarity = Math.max(cardSimilarity, cosineSimilarity(liveEmbedding, await this.engine.embed(image, card)));
    return { accepted: true, message: 'Face and ID card captured.', metrics: { faces: faces.length, samePerson: round(samePerson), cardFaceSimilarity: round(cardSimilarity), yaw: round(headPose(live!.landmarks).yaw) } };
  }

  /** All steps done: compare the live face with the ID photos and record the result. */
  private async finalize(actor: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.kycLivenessSession.findUniqueOrThrow({ where: { id: sessionId }, select: { ...SESSION_SELECT, frames: { select: { step: true, metrics: true } } } });
    const metricsOf = (step: string) => session.frames.find((frame) => frame.step === step)?.metrics as StoredMetrics | undefined;
    const align = metricsOf('ALIGN');
    const cardFaceSimilarity = typeof metricsOf('FACE_WITH_ID')?.cardFaceSimilarity === 'number' ? metricsOf('FACE_WITH_ID')!.cardFaceSimilarity as number : null;
    const uploadedIdFaceSimilarity = align?.embedding ? await this.compareWithUploadedId(session.applicationId, Float32Array.from(align.embedding)) : null;
    const idNumberOnCard = (metricsOf('ID_CARD')?.idNumberOnCard as LivenessResultView['idNumberOnCard']) ?? 'NOT_FOUND';
    const result: LivenessResultView = { livenessPassed: true, cardFaceSimilarity, uploadedIdFaceSimilarity, idNumberOnCard };
    const updated = await this.prisma.kycLivenessSession.update({ where: { id: sessionId }, data: { status: 'PASSED', completedAt: new Date(), result: result as unknown as Prisma.InputJsonObject }, select: SESSION_SELECT });
    const application = await this.prisma.kycApplication.findUniqueOrThrow({ where: { id: session.applicationId }, select: { organisationId: true, countryNodeId: true } });
    await this.audit.recordActor(actor, { action: 'kyc.liveness.completed', resourceType: 'KycLivenessSession', resourceId: sessionId, organisationId: application.organisationId, countryNodeId: application.countryNodeId, metadata: { ...result } });
    return updated;
  }

  /** Face on the uploaded ID_FRONT image, if it is an image and a face can be found on it. */
  private async compareWithUploadedId(applicationId: string, liveEmbedding: Float32Array): Promise<number | null> {
    const document = await this.prisma.kycDocument.findUnique({ where: { applicationId_documentType: { applicationId, documentType: 'ID_FRONT' } }, select: { mimeType: true, fileContent: true } });
    if (!document || document.mimeType === 'application/pdf') return null;
    const image = await decodeImage(Buffer.from(document.fileContent));
    const faces = await this.engine.detect(image);
    if (!faces.length) return null;
    return round(cosineSimilarity(liveEmbedding, await this.engine.embed(image, faces[0])));
  }

  private async fail(sessionId: string, status: 'FAILED' | 'EXPIRED', reason: string) {
    await this.prisma.kycLivenessSession.updateMany({ where: { id: sessionId, status: 'IN_PROGRESS' }, data: { status, completedAt: new Date(), result: { livenessPassed: false, failureReason: reason } } });
    throw new ConflictException(`${reason} Start face verification again.`);
  }

  // ---- Reviewer ------------------------------------------------------------

  async latestForReview(actor: AuthenticatedUser, applicationId: string) {
    const application = await this.prisma.kycApplication.findFirst({ where: { id: applicationId, status: { not: 'DRAFT' }, ...kycReviewScope(actor) }, select: { id: true } });
    if (!application) throw new NotFoundException('KYC application not found');
    const session = await this.prisma.kycLivenessSession.findFirst({ where: { applicationId }, orderBy: { createdAt: 'desc' }, select: { ...SESSION_SELECT, frames: { select: { id: true, step: true, metrics: true, capturedAt: true }, orderBy: { capturedAt: 'asc' } } } });
    if (!session) return null;
    return { ...this.view(session, 'reviewer'), frames: session.frames.map((frame) => ({ id: frame.id, step: frame.step, capturedAt: frame.capturedAt, metrics: publicMetrics(frame.metrics as Record<string, unknown>) })) };
  }

  async frameForReview(actor: AuthenticatedUser, applicationId: string, frameId: string) {
    const frame = await this.prisma.kycLivenessFrame.findFirst({ where: { id: frameId, session: { applicationId, application: { status: { not: 'DRAFT' }, ...kycReviewScope(actor) } } }, include: { session: { select: { application: { select: { organisationId: true, countryNodeId: true } } } } } });
    if (!frame) throw new NotFoundException('Frame not found');
    await this.audit.recordActor(actor, { action: 'kyc.liveness.frame.view', resourceType: 'KycLivenessFrame', resourceId: frame.id, organisationId: frame.session.application.organisationId, countryNodeId: frame.session.application.countryNodeId, metadata: { applicationId, step: frame.step } });
    return { fileName: `liveness-${frame.step.toLowerCase()}.${frame.mimeType === 'image/png' ? 'png' : 'jpg'}`, mimeType: frame.mimeType, fileContent: frame.content };
  }

  /** Applicants see only whether verification passed; scores and card readings are for officers (they would coach a fraudster). */
  private view(session: { id: string; status: string; steps: unknown; currentStep: number; expiresAt: Date; completedAt: Date | null; result: unknown }, audience: 'applicant' | 'reviewer'): LivenessSessionView {
    const result = (session.result as LivenessResultView | null) ?? null;
    const visible = result && audience === 'applicant' ? { livenessPassed: result.livenessPassed, failureReason: result.failureReason } as LivenessResultView : result;
    return { id: session.id, status: session.status, steps: session.steps as LivenessStep[], currentStep: session.currentStep, expiresAt: session.expiresAt, stepTimeLimitSeconds: STEP_TIME_LIMIT_MS / 1000, completedAt: session.completedAt, result: visible };
  }
}

/** Guidance the applicant needs (position, lighting, movement), without face-match scores or card readings. */
function applicantMetrics(metrics: Record<string, unknown>) {
  const allowed = ['faces', 'widthRatio', 'brightness', 'yawChange', 'pitchChange'];
  return Object.fromEntries(Object.entries(metrics).filter(([key]) => allowed.includes(key)));
}

/** Metrics safe to show an officer: everything except the face embedding. */
function publicMetrics(metrics: Record<string, unknown>) {
  const { embedding: _embedding, ...rest } = metrics;
  return rest;
}

async function toPng(image: RgbImage): Promise<Buffer> {
  const sharp = (await import('sharp')).default;
  return sharp(image.data, { raw: { width: image.width, height: image.height, channels: 3 } }).png().toBuffer();
}

const round = (value: number) => Math.round(value * 1000) / 1000;
