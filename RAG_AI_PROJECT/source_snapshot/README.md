# RAG AI Source Snapshot

This folder contains duplicate copies of the current RAG-related source files for transfer to another location.

The original files remain in their existing project paths and are not moved or modified by this snapshot operation.

## Snapshot Layout

```text
source_snapshot/
├── server/
│   ├── src/
│   │   └── ai/
│   │       ├── ai.controller.ts
│   │       ├── ai.service.ts
│   │       ├── ai.provider.ts
│   │       └── ai.dto.ts
│   └── prisma/
│       └── schema.prisma
└── src/
    └── ai/
        └── AIRagKnowledgeBase.tsx
```

## Original Source Paths

- `server/src/ai/ai.controller.ts`
- `server/src/ai/ai.service.ts`
- `server/src/ai/ai.provider.ts`
- `server/src/ai/ai.dto.ts`
- `server/prisma/schema.prisma`
- `src/ai/components/AIRagKnowledgeBase.tsx`

The frontend copy is placed at `source_snapshot/src/ai/AIRagKnowledgeBase.tsx` to match the requested transfer layout. In the application itself, the component is located under `src/ai/components/`.

## Important

These files are a source snapshot, not an independently runnable project. They depend on the surrounding NestJS modules, Prisma client, authentication, tenant-scope utilities, database migrations, and frontend API client from the main repository.
