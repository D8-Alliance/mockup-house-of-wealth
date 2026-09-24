# RAG Governance

## Upload Authority

Only these roles can upload or create Knowledge Base RAG documents:

- `Super Admin`
- `AI Administrator`

This applies to both global documents and project-scoped RAG documents through the protected RAG write routes.

Project sponsors may upload project evidence through the project document workflow. That evidence is not automatically an approved global standard.

## Approved Global Material

Global documents should be limited to approved and licensed material, including:

- AAOIFI standards and approved interpretations.
- Approved fatwa and Shariah board resolutions.
- Internal Shariah policies.
- Approved contract and term-sheet clauses.
- Applicable regulatory guidance.

Do not upload unverified web content, confidential third-party material without permission, draft opinions as final policy, or personal data without a documented basis.

## Review and Change Control

Before a document becomes part of the global corpus:

1. Confirm source authority and licensing.
2. Record title, source type, jurisdiction, effective date, and review owner in the document metadata or title.
3. Verify that the content is approved for the relevant tenant and country node.
4. Retire obsolete content by marking it inactive rather than silently replacing the audit trail.
5. Test retrieval with representative queries such as `Ijarah lease conditions` and `Musharakah profit and loss allocation`.

## Human Authority

RAG sources support analysis. They do not replace:

- Shariah Board approval.
- Legal review.
- Compliance or AML review.
- Financial verification.
- Human decision records.

## Scope Rule

Reusable standards belong in the global tenant corpus. Facts, financials, contracts, and evidence belonging to one project remain project-scoped.
