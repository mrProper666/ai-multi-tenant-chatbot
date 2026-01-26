import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { createDocument, updateDocumentPageCount } from '@/lib/db/repositories/documents';
import { S3FileStorage } from '@/lib/storage/s3-storage';
import { processPdfToChunks } from '@/lib/utils/pdf-processing';
import { generateEmbeddings } from '@/lib/utils/embeddings';
import { PgVectorStore } from '@/lib/storage/vector-store-pgvector';
import { v4 as uuidv4 } from 'uuid';

const fileStorage = new S3FileStorage();
const vectorStore = new PgVectorStore();

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process PDF
    const chunks = await processPdfToChunks(buffer);
    
    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No text could be extracted from PDF' }, { status: 400 });
    }

    // Get page count (approximate)
    const pageCount = Math.max(...chunks.map(c => c.pageNumber));

    // Create document record
    const documentId = uuidv4();
    const s3Key = await fileStorage.uploadFile(tenantId, documentId, file.name, buffer);
    
    const document = await createDocument(
      tenantId,
      file.name,
      s3Key,
      buffer.length,
      pageCount
    );

    // Update page count if we have better info
    await updateDocumentPageCount(tenantId, documentId, pageCount);

    // Generate embeddings for all chunks
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await generateEmbeddings(chunkTexts);

    // Store chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      await vectorStore.storeChunk(
        tenantId,
        documentId,
        i,
        chunks[i].pageNumber,
        chunks[i].content,
        chunks[i].contentType,
        chunks[i].tokenCount,
        embeddings[i]
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        pageCount: document.page_count,
        chunkCount: chunks.length,
      },
    });
  } catch (error: any) {
    console.error('Error uploading document:', error);
    
    // Return appropriate status codes based on error type
    let status = 500;
    let errorMessage = error.message || 'Failed to upload document';
    
    // Handle OpenAI API errors with appropriate status codes
    if (errorMessage.includes('quota exceeded') || errorMessage.includes('rate limit')) {
      status = 503; // Service Unavailable
    } else if (errorMessage.includes('authentication failed')) {
      status = 401; // Unauthorized
    } else if (errorMessage.includes('No file provided') || errorMessage.includes('Only PDF')) {
      status = 400; // Bad Request
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}
