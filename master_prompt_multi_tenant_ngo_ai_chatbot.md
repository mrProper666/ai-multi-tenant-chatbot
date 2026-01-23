# 🧠 MASTER PROMPT FOR CURSOR

**Multi-Tenant NGO AI Chatbot (RAG, Production-Ready)**

---

## CONTEXT

You are generating a **production-ready web application** called:

**“Multi-Tenant NGO AI Chatbot”**

The application serves **multiple NGOs (tenants)**.\
Each tenant uploads **PDF documents**, and users can chat with an AI assistant that answers **strictly based on that tenant’s documents** using **RAG (Retrieval-Augmented Generation)**.

This is **NOT a demo**.\
All architectural decisions must prioritize:

- data isolation
- correctness
- traceability
- maintainability

---

## TECH STACK (FIXED)

- Frontend: **Next.js v16 (App Router)** + Tailwind CSS
- Backend: **Next.js Route Handlers (app/api)**
- AI:
  - **Vercel AI SDK v6**
  - **Vercel AI Gateway**
- Embeddings:
  - Provider: OpenAI
  - Model: **text-embedding-3-large**
  - Dimensions: **3072**
- Vector Storage:
  - **PostgreSQL + pgvector**
- File Storage:
  - **S3-compatible storage** (implementation abstracted)
- Hosting:
  - **Vercel**

---

## CORE REQUIREMENTS

### 1. Multi-Tenant Architecture (CRITICAL)

- The system must support multiple tenants (NGOs).
- Every operation MUST be tenant-scoped:
  - PDF upload
  - embedding
  - vector search
  - chat responses
- `tenantId` must be explicit and required everywhere.
- No default tenant.
- No cross-tenant data access under any circumstances.

Tenant resolution mechanism should be abstracted (TODO).

---

### 2. PDF Upload & Storage

- Only PDF files are accepted.
- PDFs are uploaded via a dashboard UI.
- Files are stored in S3-compatible storage under tenant-scoped paths:
  ```
  /tenants/{tenantId}/documents/{documentId}.pdf
  ```
- Document metadata is stored in the database.

---

### 3. Text Extraction & Chunking (FIXED STRATEGY)

Chunking must follow these **exact rules**:

- Token-based chunking
- Chunk size: **800 tokens**
- Overlap: **150 tokens**
- Chunking is **semantic-aware**:
  - Do NOT split in the middle of paragraphs
  - Do NOT split lists
- Chunking is **page-aware**
- Tables must be converted into descriptive text
- Each chunk MUST include metadata:
  - tenantId
  - documentId
  - chunkIndex
  - pageNumber
  - contentType ("text" | "table")

Each chunk is embedded individually.

---

### 4. Embeddings (FIXED)

- Use **OpenAI ****text-embedding-3-large**
- Access via **Vercel AI Gateway**
- One embedding per chunk
- Do NOT mix embedding models
- Do NOT embed entire documents as one vector

Environment variables:

```env
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-large
```

---

### 5. Vector Storage (FIXED)

- Use **PostgreSQL with pgvector**
- Vector column: `vector(3072)`
- Similarity search:
  - cosine similarity
  - tenant-filtered
- Table design must support:
  - tenant isolation
  - document tracing
  - chunk-level retrieval

Use a **VectorStore abstraction interface** to allow future migration.

---

### 6. Retrieval Logic

- Retrieve **5–8 most relevant chunks**
- Retrieval must:
  - filter by tenantId
  - return metadata needed for citations
- Retrieval logic must be separated from chat logic

---

### 7. System Prompt (FIXED)

Use the following system prompt **verbatim**:

```text
You are an AI assistant designed to support non-governmental organizations (NGOs).

Your purpose is to answer questions strictly based on the provided documents.
These documents represent official NGO materials such as policies, reports,
regulations, internal guidelines, and public statements.

RULES YOU MUST FOLLOW AT ALL TIMES:

1. You MUST ONLY use information found in the provided context documents.
   Do NOT use general knowledge, assumptions, or external information.

2. If the answer to a question cannot be found in the provided documents,
   you MUST respond clearly and explicitly that the information is not available
   in the current documents.

3. You MUST NOT speculate, infer, or "fill in gaps".
   Accuracy is more important than completeness.

4. Your tone must be neutral, professional, and institutional.
   Avoid emotional language, opinions, or advocacy.

5. You MUST NOT provide legal, financial, or professional advice.
   If a question appears to request such advice, clarify that you can only
   summarize what the documents state.

6. When possible, structure answers clearly:
   - short introduction
   - factual statements
   - references to the documents

7. If multiple documents provide relevant information,
   summarize them without contradiction.

8. Do NOT mention internal system details such as embeddings,
   vector databases, or retrieval mechanisms.

9. If the question is outside the scope of the NGO's documents,
   state this explicitly and do not attempt to answer.

You are a document-based assistant, not a general-purpose chatbot.
Trustworthiness and fidelity to the source documents are your highest priority.
```

---

### 8. Citation Strategy (FIXED, CRITICAL)

- Use **chunk-level citations**
- Every factual statement MUST have a citation
- Context chunks passed to the LLM must be numbered:

```
[1] Document: Strategic Plan 2023–2025, Page 12
Content: "..."

[2] Document: Internal Policy, Page 7
Content: "..."
```

- Answer format:
  - Inline numeric references (¹,²)
  - Final section: **“Sources”**
- If no sources exist → DO NOT answer

No cross-tenant citations allowed.

---

### 9. Chat API

- Use **Vercel AI SDK v6**
- Streaming responses enabled
- Message separation:
  - system
  - context
  - user
- Do NOT expose raw chunks to the UI

---

### 10. Frontend

- Dashboard with:
  - Document upload & list
  - Chat interface
- Clear tenant context in UI
- Tailwind CSS only

---

## DOCUMENTATION REQUIREMENTS (MANDATORY)

You MUST generate a **README.md** at the root of the project with the following sections:

1. **Project Overview**
2. **Architecture Overview**
3. **Review Checklist (Architecture & Quality)**
4. **Installation & Local Development**
5. **Configuration**
6. **Troubleshooting**
7. **Limitations & Future Improvements**
8. **Security & Data Isolation Notes**

The README must be:

- clear
- technical
- non-marketing
- suitable for onboarding developers

---

## FINAL NOTES

- Do NOT hardcode secrets.
- Provide `.env.example`.
- Mark future improvements with TODO comments.
- Prefer clarity over cleverness.

Generate the full codebase accordingly.

---

# END OF MASTER PROMPT

