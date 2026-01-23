import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { getTenantId } from '@/lib/utils/tenant';
import { retrieveRelevantChunks, formatChunksForContext, extractCitations } from '@/lib/retrieval';
import { createConversation, getConversationById, createMessage, getConversationMessages } from '@/lib/db/repositories/conversations';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `You are an AI assistant designed to support non-governmental organizations (NGOs).

Your purpose is to answer questions strictly based on the provided documents.
These documents represent official NGO materials such as policies, reports,
regulations, internal guidelines, and public statements.

RULES YOU MUST FOLLOW AT ALL TIMES:

1. You MUST ONLY use information found in the provided context documents.
   Do NOT use general knowledge, assumptions, or external information.

2. If the answer to a question cannot be found in the provided documents,
   you MUST respond clearly and explicitly that the information is not available
   in the current documents.

3. You MUST NOT speculate, infer, or "fill in gaps".
   Accuracy is more important than completeness.

4. Your tone must be neutral, professional, and institutional.
   Avoid emotional language, opinions, or advocacy.

5. You MUST NOT provide legal, financial, or professional advice.
   If a question appears to request such advice, clarify that you can only
   summarize what the documents state.

6. When possible, structure answers clearly:
   - short introduction
   - factual statements
   - references to the documents

7. If multiple documents provide relevant information,
   summarize them without contradiction.

8. Do NOT mention internal system details such as embeddings,
   vector databases, or retrieval mechanisms.

9. If the question is outside the scope of the NGO's documents,
   state this explicitly and do not attempt to answer.

You are a document-based assistant, not a general-purpose chatbot.
Trustworthiness and fidelity to the source documents are your highest priority.`;

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const conversation = await createConversation(tenantId);
      convId = conversation.id;
    } else {
      const existing = await getConversationById(tenantId, convId);
      if (!existing) {
        return new Response('Conversation not found', { status: 404 });
      }
    }

    // Save user message
    await createMessage(convId, tenantId, 'user', message);

    // Retrieve relevant chunks
    const chunks = await retrieveRelevantChunks(tenantId, message, 7);

    if (chunks.length === 0) {
      // No relevant documents found
      const noSourceResponse = 'I apologize, but I cannot find any relevant information in the available documents to answer your question. Please ensure that relevant documents have been uploaded, or rephrase your question.';
      
      await createMessage(convId, tenantId, 'assistant', noSourceResponse, null);
      
      return new Response(
        JSON.stringify({ 
          text: noSourceResponse,
          conversationId: convId,
          citations: null 
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Format context for LLM
    const context = formatChunksForContext(chunks);
    const citations = extractCitations(chunks);

    // Get conversation history
    const history = await getConversationMessages(tenantId, convId);
    const historyMessages = history
      .filter(m => m.role !== 'system')
      .slice(-10) // Last 10 messages for context
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Stream response
    const result = await streamText({
      model: openai('gpt-4-turbo-preview'),
      system: SYSTEM_PROMPT,
      messages: [
        ...historyMessages,
        {
          role: 'user',
          content: `Context from documents:\n\n${context}\n\nUser question: ${message}`,
        },
      ],
      onFinish: async ({ text }) => {
        // Save assistant message after streaming completes
        await createMessage(convId, tenantId, 'assistant', text, citations);
      },
    });

    // Add conversation ID to the response headers
    const stream = result.toDataStreamResponse();
    stream.headers.set('X-Conversation-Id', convId);
    
    return stream;
  } catch (error: any) {
    console.error('Error in chat:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process chat message' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
