# RAG Operations

## Upload a Global Standard

1. Sign in as `Super Admin` or `AI Administrator`.
2. Open `AI Wealth Engine`.
3. Open `AI Knowledge Base`.
4. Select `Global tenant corpus`.
5. Choose an approved source type.
6. Paste approved text or upload a text-based PDF.
7. Search for representative terms after upload.

## Search a Project With Global Context

1. Open `AI Knowledge Base`.
2. Select a project as the search scope.
3. Search for a term or rule.
4. The result set can include global tenant content and that project's RAG content.

## Troubleshooting

### No result returned

- Confirm the document is active.
- Confirm the user tenant and country scope match the document.
- Search using terms that occur in the source text.
- Confirm the project filter is correct.

### PDF upload fails

- The PDF must be text-extractable.
- Scanned image PDFs require OCR before upload.
- The upload limit is 10 MB for the RAG PDF route.

### AI output does not cite a source

- Confirm the relevant feature is Contract Advisor or Shariah Assistant.
- Contract Draft Assistant and Due Diligence use separate flows.
- Confirm the query returned RAG chunks.
- Treat sandbox output as synthetic and non-authoritative.

## Audit Events

The service records audit events for:

- RAG document creation.
- Text search.
- Vector search.
- AI request and response.

These records should be retained for governance review and incident investigation.
