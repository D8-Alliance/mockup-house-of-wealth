# RAG Integration Matrix

| Feature | Uses global corpus | Uses project evidence | Current status |
| --- | ---: | ---: | --- |
| AI Contract Advisor | Yes | Yes | RAG sources are sent to the provider |
| AI Shariah Assistant | Yes | Yes | RAG sources are sent to the provider |
| AI Contract Draft Assistant | No | Project context only | Structured draft/template generation |
| Due Diligence Scanner | No | `ProjectDocument.extractedText` | Separate document evidence workflow |
| Document Analyzer | No | `ProjectDocument.extractedText` | Separate extraction workflow |
| AI Knowledge Base search | Yes | Optional project filter | Direct retrieval/search |

## Contract Advisor

The service searches using the proposed Shariah contract and supplies matching chunks as `ragSources`. The provider receives those sources along with project context and evidence status.

If verified project evidence is insufficient, the evidence guard changes the result to `Review Required` with low confidence.

## Shariah Assistant

The service searches using the proposed contract and includes the retrieved chunks with the supplied terms. The output remains an advisory analysis requiring human review.

## Draft Assistant

The current draft assistant creates a structured term-sheet template. It should not be described as a RAG-grounded legal document generator until it is explicitly wired to retrieve and cite global and project sources.

## Citation Expectations

The AI response exposes source data through `dataSources` and the Contract Advisor renders it through `AISourcePanel`. A source is context for review, not proof that a project is compliant or investable.
