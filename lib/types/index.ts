export type ModelId = `${string}/${string}`;

export interface Tenant {
  id: string;
  name: string;
  llm_model_id: ModelId;
  embedding_model_id: ModelId;
  embedding_dimensions: number;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: string;
  tenant_id: string;
  filename: string;
  s3_key: string;
  file_size: number;
  page_count: number | null;
  uploaded_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentChunk {
  id: string;
  tenant_id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  content_type: 'text' | 'table';
  token_count: number | null;
  vector: number[];
  created_at: Date;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[] | null;
  created_at: Date;
}

export interface Citation {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number;
  chunk_index: number;
}

export interface ChunkWithMetadata extends DocumentChunk {
  document_name: string;
}
