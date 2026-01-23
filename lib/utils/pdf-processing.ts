import pdfParse from 'pdf-parse';
import { chunkText, convertTableToText } from './chunking';

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  isTable: boolean;
}

export interface ProcessedChunk {
  content: string;
  pageNumber: number;
  contentType: 'text' | 'table';
  tokenCount: number;
}

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<ExtractedPage[]> {
  const data = await pdfParse(buffer);
  const pages: ExtractedPage[] = [];

  // pdf-parse doesn't provide per-page extraction by default
  // For now, we'll extract all text and split by page markers if available
  // TODO: Use a more advanced PDF library for per-page extraction
  
  const fullText = data.text;
  
  // Simple heuristic: if we have page info, use it
  // Otherwise, treat as single page
  if (data.numpages === 1) {
    // Check if content looks like a table
    const isTable = /^\s*\|.*\|/m.test(fullText) || 
                    /\t.*\t/.test(fullText) ||
                    (fullText.split('\n').length > 10 && fullText.split(/\s{2,}/).length > 5);
    
    pages.push({
      pageNumber: 1,
      text: isTable ? convertTableToText(fullText) : fullText,
      isTable,
    });
  } else {
    // For multi-page PDFs, split by approximate page boundaries
    // This is a simplified approach - in production, use a library that supports per-page extraction
    const lines = fullText.split('\n');
    const linesPerPage = Math.ceil(lines.length / data.numpages);
    
    for (let i = 0; i < data.numpages; i++) {
      const startLine = i * linesPerPage;
      const endLine = Math.min((i + 1) * linesPerPage, lines.length);
      const pageText = lines.slice(startLine, endLine).join('\n');
      
      const isTable = /^\s*\|.*\|/m.test(pageText) || 
                      /\t.*\t/.test(pageText) ||
                      (pageText.split('\n').length > 10 && pageText.split(/\s{2,}/).length > 5);
      
      pages.push({
        pageNumber: i + 1,
        text: isTable ? convertTableToText(pageText) : pageText,
        isTable,
      });
    }
  }

  return pages;
}

/**
 * Process PDF and return chunks
 */
export async function processPdfToChunks(buffer: Buffer): Promise<ProcessedChunk[]> {
  const pages = await extractTextFromPdf(buffer);
  const allChunks: ProcessedChunk[] = [];

  for (const page of pages) {
    const chunks = chunkText(
      page.text,
      page.pageNumber,
      page.isTable ? 'table' : 'text'
    );
    allChunks.push(...chunks);
  }

  return allChunks;
}
