export type ContentStatus = 'draft' | 'published';

export interface CoreValue {
  id: string;
  order: number;
  arabic: string; // e.g. الأصالة
  name: string; // e.g. Al-Asālah
  translation: string; // e.g. Authenticity
  meaning: string; // Meaning in the Islamic Digital Economy
  whatItMeans: string; // What it means for D-8 IDEAS (short)
  applications: string[]; // SuperApp application bullet points
  guidingPrinciple: string;
  simpleExample: string;
}

export interface ShariahContent {
  id: string;
  title: string;
  subtitle: string;
  intro: string;
  values: CoreValue[];
  updatedAt: string;
  updatedBy?: string;
}

export interface ShariahContentRevision {
  id: string;
  contentId: string;
  version: number;
  status: ContentStatus;
  snapshot: ShariahContent;
  editedBy: string;
  editedAt: string;
  note: string;
}
