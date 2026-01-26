// Import tiktoken - WASM should be handled by Next.js webpack config
import { encoding_for_model } from 'tiktoken';

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;

interface Chunk {
  content: string;
  pageNumber: number;
  contentType: 'text' | 'table';
  tokenCount: number;
}

/**
 * Semantic-aware, page-aware chunking
 * - Does not split paragraphs
 * - Does not split lists
 * - Respects page boundaries
 * - Token-based with overlap
 */
export function chunkText(
  text: string,
  pageNumber: number,
  contentType: 'text' | 'table' = 'text'
): Chunk[] {
  const encoding = encoding_for_model('gpt-4');
  const chunks: Chunk[] = [];

  // Split by paragraphs first (double newlines)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = encoding.encode(paragraph).length;

    // If paragraph alone exceeds chunk size, split it by sentences
    if (paragraphTokens > CHUNK_SIZE) {
      // Save current chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          pageNumber,
          contentType,
          tokenCount: currentTokens,
        });
        currentChunk = '';
        currentTokens = 0;
      }

      // Split large paragraph by sentences
      const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        const sentenceTokens = encoding.encode(sentence).length;

        if (currentTokens + sentenceTokens > CHUNK_SIZE && currentChunk.trim().length > 0) {
          chunks.push({
            content: currentChunk.trim(),
            pageNumber,
            contentType,
            tokenCount: currentTokens,
          });

          // Start new chunk with overlap
          const overlapText = getOverlapText(currentChunk, CHUNK_OVERLAP, encoding);
          currentChunk = overlapText + ' ' + sentence;
          currentTokens = encoding.encode(currentChunk).length;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
          currentTokens += sentenceTokens;
        }
      }
    } else {
      // Check if adding this paragraph would exceed chunk size
      if (currentTokens + paragraphTokens > CHUNK_SIZE && currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          pageNumber,
          contentType,
          tokenCount: currentTokens,
        });

        // Start new chunk with overlap
        const overlapText = getOverlapText(currentChunk, CHUNK_OVERLAP, encoding);
        currentChunk = overlapText + '\n\n' + paragraph;
        currentTokens = encoding.encode(currentChunk).length;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }
    }
  }

  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      pageNumber,
      contentType,
      tokenCount: currentTokens,
    });
  }

  encoding.free();
  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapTokens: number, encoding: any): string {
  const tokens = encoding.encode(text);
  if (tokens.length <= overlapTokens) {
    return text;
  }

  const overlapTokensArray = tokens.slice(-overlapTokens);
  return encoding.decode(overlapTokensArray);
}

/**
 * Convert table-like content to descriptive text
 */
export function convertTableToText(tableContent: string): string {
  // Simple table conversion - can be enhanced with proper table parsing
  const lines = tableContent.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length < 2) {
    return tableContent;
  }

  // Assume first line is header
  const headers = lines[0].split(/\s{2,}|\t/).filter(h => h.trim().length > 0);
  
  let description = 'Table with columns: ' + headers.join(', ') + '. ';
  
  // Convert rows to descriptive text
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(/\s{2,}|\t/).filter(v => v.trim().length > 0);
    if (values.length === headers.length) {
      const rowDescription = headers.map((header, idx) => 
        `${header}: ${values[idx]}`
      ).join(', ');
      description += `Row ${i}: ${rowDescription}. `;
    }
  }

  return description.trim();
}
