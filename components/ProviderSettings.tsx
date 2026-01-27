'use client';

import { useEffect, useMemo, useState } from 'react';
import { ALLOWED_EMBEDDING_MODELS, ALLOWED_LLM_MODELS } from '@/lib/ai/models';

type TenantSettings = {
  llm_model_id: string;
  embedding_model_id: string;
  embedding_dimensions: number;
};

export default function ProviderSettings({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [initial, setInitial] = useState<TenantSettings | null>(null);
  const [draft, setDraft] = useState<TenantSettings | null>(null);

  const embeddingOptions = useMemo(() => ALLOWED_EMBEDDING_MODELS, []);
  const llmOptions = useMemo(() => ALLOWED_LLM_MODELS, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);

        const res = await fetch('/api/tenants/settings', {
          headers: { 'X-Tenant-Id': tenantId },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load settings');
        }

        const settings: TenantSettings = data.settings;
        if (!cancelled) {
          setInitial(settings);
          setDraft(settings);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const embeddingChanged =
    !!initial &&
    !!draft &&
    initial.embedding_model_id !== draft.embedding_model_id;

  async function save() {
    if (!draft) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/tenants/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
          llm_model_id: draft.llm_model_id,
          embedding_model_id: draft.embedding_model_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save settings');
      }

      const updated: TenantSettings = data.settings;
      setInitial(updated);
      setDraft(updated);
      setSuccess('Settings saved.');
    } catch (e: any) {
      setError(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-gray-600">Loading settings…</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-sm text-red-700">Failed to load settings.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">AI Model Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Select models in <span className="font-mono">provider/model</span> format (routed via Vercel AI Gateway).
        </p>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-800 rounded-md p-3 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="border border-green-200 bg-green-50 text-green-800 rounded-md p-3 text-sm">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Chat (LLM) model</label>
          <select
            value={draft.llm_model_id}
            onChange={(e) => setDraft({ ...draft, llm_model_id: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {llmOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.id})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-900">Embeddings model</label>
          <select
            value={draft.embedding_model_id}
            onChange={(e) => {
              const nextId = e.target.value;
              const next = embeddingOptions.find((x) => x.id === nextId);
              setDraft({
                ...draft,
                embedding_model_id: nextId,
                embedding_dimensions: next?.dimensions ?? draft.embedding_dimensions,
              });
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {embeddingOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.dimensions}d) ({m.id})
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-600">
            Current dimensions: <span className="font-mono">{draft.embedding_dimensions}</span>
          </div>
        </div>
      </div>

      {embeddingChanged && (
        <div className="border border-amber-200 bg-amber-50 text-amber-900 rounded-md p-3 text-sm">
          Changing the embeddings model requires re-embedding all existing document chunks to keep retrieval accurate.
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setDraft(initial);
            setError(null);
            setSuccess(null);
          }}
          disabled={saving}
          className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

