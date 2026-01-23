import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { listDocuments, deleteDocument } from '@/lib/db/repositories/documents';
import { PgVectorStore } from '@/lib/storage/vector-store-pgvector';
import { S3FileStorage } from '@/lib/storage/s3-storage';

const vectorStore = new PgVectorStore();
const fileStorage = new S3FileStorage();

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const documents = await listDocuments(tenantId);

    return NextResponse.json({ documents });
  } catch (error: any) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list documents' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Delete chunks
    await vectorStore.deleteDocumentChunks(tenantId, documentId);

    // Delete file from S3
    await fileStorage.deleteFile(tenantId, documentId);

    // Delete document record
    await deleteDocument(tenantId, documentId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}
