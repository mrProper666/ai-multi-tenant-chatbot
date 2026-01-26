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
  
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error: any) {
    // Provide more helpful error messages for common OpenAI API errors
    if (error?.status === 429) {
      if (error?.code === 'insufficient_quota') {
        throw new Error(
          'OpenAI API quota exceeded. Please check your OpenAI billing and plan details. ' +
          'Visit https://platform.openai.com/account/billing to add credits or upgrade your plan.'
        );
      } else {
        throw new Error(
          'OpenAI API rate limit exceeded. Please try again in a few moments.'
        );
      }
    }
    
    if (error?.status === 401) {
      throw new Error(
        'OpenAI API authentication failed. Please check your OPENAI_API_KEY environment variable.'
      );
    }
    
    // Re-throw with original message if it's already a helpful error
    if (error?.message) {
      throw error;
    }
    
    throw new Error(`Failed to generate embedding: ${error?.toString() || 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const client = getOpenAIClient();
  
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(item => item.embedding);
  } catch (error: any) {
    // Provide more helpful error messages for common OpenAI API errors
    if (error?.status === 429) {
      if (error?.code === 'insufficient_quota') {
        throw new Error(
          'OpenAI API quota exceeded. Please check your OpenAI billing and plan details. ' +
          'Visit https://platform.openai.com/account/billing to add credits or upgrade your plan.'
        );
      } else {
        throw new Error(
          'OpenAI API rate limit exceeded. Please try again in a few moments.'
        );
      }
    }
    
    if (error?.status === 401) {
      throw new Error(
        'OpenAI API authentication failed. Please check your OPENAI_API_KEY environment variable.'
      );
    }
    
    // Re-throw with original message if it's already a helpful error
    if (error?.message) {
      throw error;
    }
    
    throw new Error(`Failed to generate embeddings: ${error?.toString() || 'Unknown error'}`);
  }
}
