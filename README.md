# Multi-Tenant NGO AI Chatbot

A production-ready, multi-tenant AI chatbot application for NGOs that enables document-based question answering using Retrieval-Augmented Generation (RAG). Each tenant (NGO) can upload PDF documents, and users can chat with an AI assistant that answers questions strictly based on that tenant's documents.

## Project Overview

This application provides:

- **Multi-tenant architecture** with strict data isolation
- **PDF document upload and processing** with semantic chunking
- **Vector-based document search** using PostgreSQL + pgvector
- **AI-powered chat interface** with streaming responses
- **Citation support** for traceability
- **Production-ready architecture** with abstractions for future scalability

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js v16 (App Router) + React + Tailwind CSS
- **Backend**: Next.js Route Handlers (app/api)
- **AI/LLM**: Vercel AI SDK v6 + OpenAI GPT-4
- **Embeddings**: OpenAI text-embedding-3-large (3072 dimensions)
- **Vector Database**: PostgreSQL + pgvector extension
- **File Storage**: S3-compatible storage (abstracted interface)
- **Hosting**: Vercel (recommended)

### Core Components

1. **Multi-Tenant Layer**
   - Tenant-scoped operations throughout the application
   - Tenant ID resolution via headers (TODO: implement proper JWT/subdomain resolution)
   - Database-level tenant isolation

2. **Document Processing Pipeline**
   - PDF upload → S3 storage
   - Text extraction and semantic chunking (800 tokens, 150 overlap)
   - Embedding generation via OpenAI
   - Vector storage in PostgreSQL

3. **Retrieval System**
   - Cosine similarity search with tenant filtering
   - Retrieves 5-8 most relevant chunks per query
   - Metadata preservation for citations

4. **Chat System**
   - Streaming responses via Vercel AI SDK
   - Context injection from retrieved chunks
   - Conversation history management
   - Citation tracking

### Database Schema

- `tenants`: Tenant information
- `documents`: Document metadata (tenant-scoped)
- `document_chunks`: Text chunks with vector embeddings (tenant-scoped)
- `conversations`: Chat conversation sessions (tenant-scoped)
- `messages`: Chat messages with citations (tenant-scoped)

### Abstractions

- **VectorStore interface**: Allows migration to different vector databases
- **FileStorage interface**: S3-compatible storage abstraction
- **Tenant resolution**: Abstracted for future implementation (JWT, subdomain, etc.)

## Review Checklist (Architecture & Quality)

### Data Isolation
- [x] All database queries filter by `tenant_id`
- [x] S3 storage uses tenant-scoped paths (`/tenants/{tenantId}/documents/`)
- [x] Vector search includes tenant filtering
- [x] No default tenant or cross-tenant access

### Chunking Strategy
- [x] Token-based chunking (800 tokens, 150 overlap)
- [x] Semantic-aware (doesn't split paragraphs/lists)
- [x] Page-aware chunking
- [x] Table conversion to descriptive text
- [x] Metadata preservation (page number, content type, chunk index)

### Embeddings
- [x] OpenAI text-embedding-3-large model
- [x] 3072 dimensions
- [x] One embedding per chunk
- [x] Vercel AI Gateway support (optional)

### Vector Storage
- [x] PostgreSQL + pgvector
- [x] Vector column: `vector(3072)`
- [x] Cosine similarity search
- [x] Tenant-filtered queries
- [x] Indexes for performance

### Retrieval
- [x] Retrieves 5-8 chunks per query
- [x] Tenant-filtered
- [x] Returns metadata for citations

### System Prompt
- [x] Fixed system prompt (as specified)
- [x] Document-only responses
- [x] No speculation or general knowledge

### Citations
- [x] Chunk-level citations
- [x] Numbered context chunks
- [x] Metadata includes document name and page number

### API Design
- [x] RESTful endpoints
- [x] Streaming chat responses
- [x] Error handling
- [x] Tenant validation

### Frontend
- [x] Document upload interface
- [x] Document list with delete
- [x] Chat interface with streaming
- [x] Tenant context display

## Installation & Local Development

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+ with pgvector extension
- S3-compatible storage (AWS S3, MinIO, etc.)
- OpenAI API key

### Setup Steps

1. **Clone and install dependencies**

```bash
npm install
```

2. **Set up PostgreSQL with pgvector**

```bash
# Install pgvector extension
# On macOS with Homebrew:
brew install pgvector

# Or use Docker:
docker run -d \
  --name postgres-pgvector \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ngo_chatbot \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: Your OpenAI API key
- `S3_*`: S3-compatible storage credentials
- `TENANT_HEADER_NAME`: Header name for tenant ID (default: `X-Tenant-Id`)

4. **Run database migrations**

```bash
npm run db:migrate
```

5. **Seed database (optional)**

Create a demo tenant:

```bash
npm run db:seed
```

6. **Start development server**

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Testing with a Tenant ID

1. Run the seed script to create a tenant, or manually insert one in the database
2. Use the tenant ID in the browser (the app will prompt for it on first load)
3. Or set it via the `X-Tenant-Id` header in API requests

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

### Database Configuration

The application uses a connection pool. Ensure your PostgreSQL instance has:
- pgvector extension enabled
- Sufficient connection limits
- Proper indexing (automatically created via migrations)

### S3 Storage Configuration

The application supports any S3-compatible storage:
- AWS S3
- **Cloudflare R2** (recommended for cost-effective storage)
- MinIO
- DigitalOcean Spaces
- Other S3-compatible services

Configure via:
- `S3_ENDPOINT`: Storage endpoint URL
  - For Cloudflare R2: `https://{account-id}.r2.cloudflarestorage.com`
- `S3_REGION`: Region
  - For AWS S3: Use actual region (e.g., `us-east-1`, `eu-central-1`)
  - For Cloudflare R2: Can be `auto` or any value (R2 doesn't enforce regions)
- `S3_ACCESS_KEY_ID`: Access key (R2 API Token)
- `S3_SECRET_ACCESS_KEY`: Secret key (R2 Secret Access Key)
- `S3_BUCKET_NAME`: Bucket name

#### How to Get Cloudflare R2 API Credentials

**⚠️ IMPORTANT**: Make sure you're creating an **R2 API Token**, not a general Cloudflare API Token. These are different things!

**Step 1: Access R2 in Cloudflare Dashboard**
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the left sidebar (under "Storage")
3. If you haven't purchased R2 yet, you'll need to enable it first

**Step 2: Create an R2 API Token**
1. In the R2 page, click on **"Manage R2 API Tokens"** or **"API Tokens"** button
   - This should be on the R2 overview page, NOT in the general API Tokens section
2. You'll see two options:
   - **Create Account API Token** (tied to your Cloudflare account; requires Super Administrator role)
   - **Create User API Token** (tied to your individual user account)
3. Choose the appropriate option based on your needs

**Step 3: Configure Token Permissions**
1. **Token Name**: Give it a descriptive name (e.g., "AI Chatbot Storage")
2. **Permissions**: Select one of:
   - **Admin Read & Write** - Full access to all buckets (recommended for development)
   - **Admin Read only** - Read-only access to all buckets
   - **Object Read & Write** - Read/write access to specific buckets (more secure)
   - **Object Read only** - Read-only access to specific buckets
3. If you chose Object permissions, select the specific bucket(s) you want to grant access to
4. Click **"Create Account API Token"** or **"Create User API Token"**

**Step 4: Copy Your Credentials - THIS IS CRITICAL!**
⚠️ **VERY IMPORTANT**: After clicking "Create", a modal/popup will appear showing BOTH credentials:
- **Access Key ID** (also called Client ID) - this is your `S3_ACCESS_KEY_ID`
- **Secret Access Key** (also called Client Secret) - this is your `S3_SECRET_ACCESS_KEY`

**The Secret Access Key is shown ONLY ONCE and cannot be retrieved later!**

**What to do if you only see Access Key ID:**
- If you only see the Access Key ID in a list of tokens, it means you've already closed the creation modal
- The Secret Access Key was shown in the initial creation confirmation popup
- **Solution**: You need to create a NEW token and this time:
  1. **DO NOT close the popup/modal** that appears after creation
  2. Look for BOTH values displayed together
  3. Copy BOTH immediately before closing anything
  4. The Secret Access Key might be in a separate field or shown below the Access Key ID

**Alternative: Check if Secret is shown elsewhere**
- Sometimes the Secret Access Key appears in a separate section or requires clicking "Show" or "Reveal"
- Look for buttons like "Show Secret", "Reveal", or similar
- Check if there's a copy icon next to the Secret Access Key

**Step 5: Find Your Account ID**
1. In the Cloudflare Dashboard, go to any page
2. Your **Account ID** is visible in the right sidebar
3. Use this to construct your endpoint: `https://{account-id}.r2.cloudflarestorage.com`

**Step 6: Update Your .env.local**
```bash
S3_ENDPOINT=https://{your-account-id}.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID={your-access-key-id}
S3_SECRET_ACCESS_KEY={your-secret-access-key}
S3_BUCKET_NAME={your-bucket-name}
```

**Troubleshooting:**

- **If you only see Access Key ID after creation**: 
  - The Secret Access Key should appear in the SAME popup/modal right after creation
  - Look carefully - it might be below the Access Key ID or in a separate field
  - Check if there's a "Show" or "Reveal" button to display the secret
  - If you already closed the popup, the Secret is lost and you need to create a new token

- **If you lost your Secret Access Key**: 
  - You'll need to delete the old token and create a new one
  - Go to "Manage R2 API Tokens" → Find your token → Delete it → Create a new one
  - This time, copy BOTH values before closing the creation popup

- **Alternative: Get credentials via API** (if you have Cloudflare API token):
  - If the dashboard doesn't show the Secret, you can use the Cloudflare API
  - When creating a token via API, the response includes both Access Key ID and Secret Access Key
  - See: https://developers.cloudflare.com/r2/api/tokens/#get-s3-api-credentials-from-an-api-token

- **Make sure you're in R2 section**: 
  - Don't use general Cloudflare API Tokens (from "My Profile" → "API Tokens")
  - You MUST use "Manage R2 API Tokens" from the R2 page specifically
  - General API tokens won't work for S3-compatible access

- **Bucket name**: Make sure your bucket name matches exactly (case-sensitive)
- **Account ID**: Verify your Account ID is correct in the endpoint URL

### Embedding Configuration

- `EMBEDDING_PROVIDER`: Currently only `openai` (fixed)
- `EMBEDDING_MODEL`: `text-embedding-3-large` (fixed)
- `VERCEL_AI_GATEWAY_URL`: Optional Vercel AI Gateway endpoint

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check pgvector extension is installed: `CREATE EXTENSION IF NOT EXISTS vector;`

### PDF Processing Errors

- Ensure PDFs are not password-protected
- Check file size limits (configured in `next.config.js`)
- Verify `pdf-parse` dependency is installed

### Embedding Generation Failures

- Verify `OPENAI_API_KEY` is set and valid
- Check API rate limits
- Ensure sufficient OpenAI credits

### S3 Upload Failures

- Verify S3 credentials are correct
- Check bucket exists and is accessible
- Ensure IAM permissions allow PutObject/GetObject/DeleteObject

### Vector Search Not Working

- Verify pgvector extension is installed
- Check vector column type: `vector(3072)`
- Ensure indexes are created (run migrations)

### Tenant Isolation Issues

- Verify tenant ID is being passed correctly
- Check database queries include `tenant_id` filter
- Review logs for cross-tenant access attempts

## Limitations & Future Improvements

### Current Limitations

1. **Tenant Resolution**: Currently uses header-based tenant ID. TODO: Implement proper JWT authentication or subdomain-based resolution.

2. **PDF Processing**: Uses `pdf-parse` which has limited per-page extraction. TODO: Use a more advanced PDF library for better page-level extraction.

3. **Citation Extraction**: Citations are extracted but not yet formatted in the UI. TODO: Add inline citation formatting (¹,²) and "Sources" section.

4. **Conversation Management**: Basic conversation handling. TODO: Add conversation list, rename, delete functionality.

5. **Error Handling**: Basic error handling. TODO: Add comprehensive error boundaries and user-friendly error messages.

6. **Streaming Message Saving**: Messages are saved after streaming completes. TODO: Consider alternative approaches for better reliability.

7. **Table Processing**: Simple table-to-text conversion. TODO: Implement proper table parsing and structured representation.

### Future Improvements

- [ ] JWT-based authentication and tenant resolution
- [ ] Subdomain-based tenant routing
- [ ] Advanced PDF processing with better page extraction
- [ ] Citation formatting in chat responses
- [ ] Conversation management UI
- [ ] Document preview and search
- [ ] Batch document upload
- [ ] Document versioning
- [ ] Analytics and usage tracking
- [ ] Rate limiting per tenant
- [ ] Caching layer for embeddings
- [ ] Multi-language support
- [ ] Document OCR for scanned PDFs
- [ ] Webhook support for document processing events

## Security & Data Isolation Notes

### Data Isolation

- **Database Level**: All queries include `tenant_id` filter
- **Storage Level**: Files stored in tenant-scoped S3 paths
- **Vector Search**: Tenant filtering applied before similarity search
- **API Level**: Tenant ID validated on every request

### Security Considerations

1. **Tenant ID Validation**: Currently relies on client-provided tenant ID. In production, implement:
   - JWT token validation
   - Subdomain-based tenant resolution
   - API key authentication

2. **File Upload Security**:
   - Only PDF files accepted
   - File size limits enforced
   - Files stored in isolated paths

3. **Database Security**:
   - Use connection pooling
   - Parameterized queries (SQL injection prevention)
   - Row-level security (consider PostgreSQL RLS)

4. **API Security**:
   - Rate limiting (TODO)
   - CORS configuration
   - Input validation

5. **Secrets Management**:
   - Never commit `.env` files
   - Use environment variables
   - Consider secret management services (Vercel, AWS Secrets Manager)

### Production Deployment Checklist

- [ ] Implement proper tenant resolution (JWT/subdomain)
- [ ] Set up database backups
- [ ] Configure S3 bucket policies
- [ ] Enable HTTPS
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Enable database connection pooling
- [ ] Configure CDN for static assets
- [ ] Set up CI/CD pipeline
- [ ] Add comprehensive tests

## License

[Specify your license here]

## Support

For issues, questions, or contributions, please [create an issue or contact the maintainers].
