# Quick Start Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- S3-compatible storage account
- OpenAI API key

## Quick Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Set up database**
   ```bash
   # Make sure PostgreSQL is running with pgvector extension
   npm run db:migrate
   npm run db:seed  # Creates a demo tenant
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:3000
   - Enter the tenant ID from the seed script output
   - Upload a PDF document
   - Start chatting!

## Using the Application

### Uploading Documents

1. Go to the "Documents" tab
2. Click "Select PDF File" and choose a PDF
3. Click "Upload Document"
4. Wait for processing (chunking and embedding generation)

### Chatting

1. Go to the "Chat" tab
2. Type your question
3. The AI will answer based on your uploaded documents
4. Responses are streamed in real-time

## Troubleshooting

### "Tenant ID is required" error
- Make sure you've run `npm run db:seed` to create a tenant
- Or manually insert a tenant in the database
- Use the tenant ID when prompted

### Database connection errors
- Verify `DATABASE_URL` in `.env` is correct
- Ensure PostgreSQL is running
- Check pgvector extension is installed: `CREATE EXTENSION vector;`

### PDF upload fails
- Ensure the file is a valid PDF
- Check file size (default limit: 10MB)
- Verify S3 credentials in `.env`

### Chat not working
- Verify OpenAI API key is set in `.env`
- Check that documents have been uploaded and processed
- Ensure you have OpenAI API credits

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Review the architecture and security considerations
- Customize tenant resolution for your use case
- Deploy to production (Vercel recommended)
