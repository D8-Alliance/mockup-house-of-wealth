# RAG AI Project

This directory documents the Retrieval-Augmented Generation (RAG) implementation already available in Wealth Pooling.

This is documentation for the existing TypeScript/NestJS system. It is not a separate Python runtime and does not duplicate the production AI service.

## What RAG Does

The RAG layer stores approved Shariah and contract knowledge, splits it into searchable chunks, retrieves relevant content, and supplies those sources to the AI provider as decision-support context.

RAG output is advisory only. It does not grant legal approval, Shariah approval, investment advice, project verification, or execution authority.

## Current Structure

```text
RAG_AI_PROJECT/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── governance.md
│   ├── integration.md
│   └── operations.md
└── sample_data/
    └── README.md
```

## Production Source Map

| Responsibility | Existing implementation |
| --- | --- |
| API routes | `server/src/ai/ai.controller.ts` |
| RAG service | `server/src/ai/ai.service.ts` |
| DTO validation | `server/src/ai/ai.dto.ts` |
| AI provider adapter | `server/src/ai/ai.provider.ts` |
| Database schema | `server/prisma/schema.prisma` |
| RAG documents | `RagDocument` model |
| RAG chunks | `RagChunk` model |
| Knowledge Base UI | `src/ai/components/AIRagKnowledgeBase.tsx` |
| API client | `src/services/apiClient.ts` |
| Contract integration | `server/src/ai/ai.service.ts`, `contractAdvisor()` |
| Shariah integration | `server/src/ai/ai.service.ts`, `shariah()` |

## Scope Model

There are two supported scopes:

1. **Global tenant corpus**
   - `RagDocument.projectId = null`.
   - Contains reusable approved material such as AAOIFI standards, fatwa, internal Shariah policy, approved contract templates, and regulatory guidance.
   - Upload is restricted to `Super Admin` and `AI Administrator`.
   - It can be retrieved for any project in the same tenant scope.

2. **Project evidence**
   - `RagDocument.projectId` points to a project.
   - Contains project-specific evidence and supporting material.
   - It is retrieved only for that project.

When a project is analysed, retrieval includes both its project evidence and the global tenant corpus. This avoids uploading the same Ijarah, Musharakah, or Mudarabah reference for every project.

## Main Endpoints

```text
POST /ai/rag/documents
POST /ai/rag/documents/upload
POST /ai/rag/documents/search
POST /ai/contract-advisor/analyze
POST /ai/shariah/analyze
```

The RAG document write endpoints require an authenticated administrator. Search remains subject to authentication, tenant scope, and project scope checks.

## Retrieval Modes

- Text retrieval searches chunk content using case-insensitive matching.
- Vector retrieval is supported when an embedding is supplied and the database has an available vector embedding for the chunk.
- Retrieval is limited to active documents in the current tenant scope.
- Project retrieval includes matching project documents and global documents.

## Important Limitations

- RAG is not a blockchain smart-contract deployment engine.
- `AI Contract Draft Assistant` currently generates a structured draft template and is not automatically grounded by RAG.
- Due diligence scans use `ProjectDocument.extractedText`, not the RAG corpus.
- Scanned PDFs require OCR before their text can be indexed.
- Every AI result requires authorised human review.

## Related Documents

- [Architecture](docs/architecture.md)
- [Governance](docs/governance.md)
- [Integration](docs/integration.md)
- [Operations](docs/operations.md)
- [Sample data policy](sample_data/README.md)
