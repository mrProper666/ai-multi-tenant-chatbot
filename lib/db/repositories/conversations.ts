import { getDbPool } from '../client';
import { Conversation, Message } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function createConversation(tenantId: string): Promise<Conversation> {
  const pool = getDbPool();
  const id = uuidv4();

  const result = await pool.query<Conversation>(
    `INSERT INTO conversations (id, tenant_id) VALUES ($1, $2) RETURNING *`,
    [id, tenantId]
  );

  return result.rows[0];
}

export async function getConversationById(
  tenantId: string,
  conversationId: string
): Promise<Conversation | null> {
  const pool = getDbPool();

  const result = await pool.query<Conversation>(
    `SELECT * FROM conversations WHERE id = $1 AND tenant_id = $2`,
    [conversationId, tenantId]
  );

  return result.rows[0] || null;
}

export async function createMessage(
  conversationId: string,
  tenantId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  citations: any[] | null = null
): Promise<Message> {
  const pool = getDbPool();
  const id = uuidv4();

  const result = await pool.query<Message>(
    `INSERT INTO messages (id, conversation_id, tenant_id, role, content, citations)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [id, conversationId, tenantId, role, content, JSON.stringify(citations)]
  );

  return result.rows[0];
}

export async function getConversationMessages(
  tenantId: string,
  conversationId: string
): Promise<Message[]> {
  const pool = getDbPool();

  const result = await pool.query<Message>(
    `SELECT * FROM messages 
     WHERE conversation_id = $1 AND tenant_id = $2 
     ORDER BY created_at ASC`,
    [conversationId, tenantId]
  );

  return result.rows.map(row => ({
    ...row,
    citations: row.citations ? (typeof row.citations === 'string' ? JSON.parse(row.citations) : row.citations) : null,
  }));
}
