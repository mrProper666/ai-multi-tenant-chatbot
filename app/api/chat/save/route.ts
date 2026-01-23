import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import { createMessage } from '@/lib/db/repositories/conversations';

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const { conversationId, message, citations } = body;

    if (!conversationId || !message) {
      return NextResponse.json({ error: 'Conversation ID and message are required' }, { status: 400 });
    }

    await createMessage(conversationId, tenantId, 'assistant', message, citations || null);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save message' },
      { status: 500 }
    );
  }
}
