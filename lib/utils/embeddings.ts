import OpenAI from 'openai';

const EMBEDDING_MODEL = 'text-embedding-3-large';
const EMBEDDING_DIMENSIONS = 3072;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    // TODO: Use Vercel AI Gateway if configured
    const gatewayUrl = process.env.VERCEL_AI_GATEWAY_URL;
    
    openaiClient = new OpenAI({
      apiKey,
      baseURL: gatewayUrl || undefined,
    });
  }

  return openaiClient;
}

/**
 * Generate embedding for a text chunk
 * Uses OpenAI text-embedding-3-large model via Vercel AI Gateway (if configured)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();
  
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();
  
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data.map(item => item.embedding);
}
