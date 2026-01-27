import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/utils/tenant';
import {
  getTenantModelSettings,
  updateTenantModelSettings,
} from '@/lib/db/repositories/tenants';
import {
  assertAllowedEmbeddingModelSelection,
  assertAllowedLlmModelId,
  getAllowedEmbeddingModel,
} from '@/lib/ai/models';

export async function GET(_request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const settings = await getTenantModelSettings(tenantId);
    if (!settings) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load tenant settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();

    const llm_model_id = body?.llm_model_id as string | undefined;
    const embedding_model_id = body?.embedding_model_id as string | undefined;

    if (!llm_model_id && !embedding_model_id) {
      return NextResponse.json(
        { error: 'No settings provided' },
        { status: 400 }
      );
    }

    if (llm_model_id) {
      assertAllowedLlmModelId(llm_model_id);
    }

    let embedding_dimensions: number | undefined;
    if (embedding_model_id) {
      const allowed = getAllowedEmbeddingModel(embedding_model_id);
      if (!allowed) {
        return NextResponse.json(
          { error: `Unsupported embedding model_id: "${embedding_model_id}"` },
          { status: 400 }
        );
      }
      embedding_dimensions = allowed.dimensions;
      assertAllowedEmbeddingModelSelection(embedding_model_id, embedding_dimensions);
    }

    const updated = await updateTenantModelSettings(tenantId, {
      llm_model_id: llm_model_id as any,
      embedding_model_id: embedding_model_id as any,
      embedding_dimensions,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ settings: updated });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update tenant settings' },
      { status: 500 }
    );
  }
}

