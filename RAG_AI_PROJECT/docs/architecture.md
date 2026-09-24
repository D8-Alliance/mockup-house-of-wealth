# RAG Architecture

## Request Flow

```text
Knowledge Base UI
        |
        v
AiController
        |
        v
AiService.createDocument / uploadPdf
        |
        v
RagDocument + RagChunk in PostgreSQL
```

For an AI analysis:

```text
Contract Advisor or Shariah Assistant
        |
        v
AiService.searchDocuments()
        |
        +--> global tenant chunks
        +--> project-specific chunks
        |
        v
AI context.ragSources
        |
        v
SandboxAiProvider or OpenAiProvider
        |
        v
AiRun with human-review requirement
```

## Database Models

### `RagDocument`

Stores document metadata, tenant scope, optional project scope, source type, content hash, status, uploader, and timestamps.

The optional `projectId` is the distinction between global and project-specific content.

### `RagChunk`

Stores chunked document content. Chunks are created by `AiService.chunk()` using a fixed chunk size of 1200 characters.

The database also supports an optional embedding column for vector retrieval where configured.

## Tenant Isolation

Every RAG document is written with `organisationId` and `countryNodeId` from the authenticated user scope. Searches apply the same scope before returning results.

Project access is additionally checked against the project tenant and organisation.

## Provider Boundary

`AiProvider` is an adapter boundary:

- `SandboxAiProvider` is deterministic and explicitly does not analyse external source documents.
- `OpenAiProvider` is selected when `OPENAI_API_KEY` is configured.
- Both providers receive the same structured context, including `ragSources` when the feature supplies them.

The provider must not be treated as an approval authority.
