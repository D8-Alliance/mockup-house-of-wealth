export type ContentStatus = 'draft' | 'published';

export type PageId = 'about' | 'members' | 'shariah' | 'news' | 'contact';

export type FieldType = 'text' | 'textarea';

export interface PageFieldSchema {
  key: string;
  label: string;
  type: FieldType;
  rows?: number;
}

export interface PageSectionSchema {
  key: string;
  label: string;
  singular: string;
  fields: PageFieldSchema[];
}

export interface PageContentSchema {
  pageId: PageId;
  label: string;
  navLabel: string;
  icon: string;
  metaFields: PageFieldSchema[];
  sections: PageSectionSchema[];
}

export interface PageContentItem {
  id: string;
  values: Record<string, string>;
}

export interface PageContent {
  pageId: PageId;
  meta: Record<string, string>;
  sections: Record<string, PageContentItem[]>;
  updatedAt: string;
  updatedBy?: string;
}

export interface PageContentRevision {
  id: string;
  pageId: PageId;
  version: number;
  status: ContentStatus;
  snapshot: PageContent;
  editedBy: string;
  editedAt: string;
  note: string;
}
