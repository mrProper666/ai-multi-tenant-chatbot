# Списък с необходимите промени за избор на AI провайдър

## Общ преглед
В момента проектът използва само OpenAI за:
1. **Embeddings** (генериране на векторни представяния) - `lib/utils/embeddings.ts`
2. **Chat/LLM** (чат интерфейс) - `app/api/chat/route.ts`

## Препоръчан подход: `provider/model` + Vercel AI Gateway (AI SDK)

### Защо това е най-опростено
✅ **Най-малко код:** вместо factory-и и `switch`-ове, работим с *един* string id за модел: `openai/gpt-4o`, `anthropic/claude-sonnet-4.5`, `openai/text-embedding-3-large`  
✅ **Една интеграция за много провайдъри:** Gateway рутира към OpenAI/Anthropic/Google/… без да инсталираме отделни `@ai-sdk/*` модули  
✅ **Embeddings + Chat по един и същ начин:** `streamText({ model: '<provider>/<model>' })` и `embedMany({ model: '<provider>/<model>' })`  
✅ **Observability и разходи:** по-лесно проследяване/тагване на заявки през Gateway  

### Какво означава „provider+model“ на практика
- **LLM модел**: `llm_model_id = 'anthropic/claude-sonnet-4.5'` (пример)
- **Embedding модел**: `embedding_model_id = 'openai/text-embedding-3-large'` (пример)
- Приложението подава тези string ids директно към AI SDK.

## Необходими промени

### 1. База данни
- [ ] **Добави колони в `tenants` таблицата:**
  - `llm_model_id` VARCHAR(200) - **единен идентификатор** `<provider>/<model>` (напр. `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4.5`)
  - `embedding_model_id` VARCHAR(200) - **единен идентификатор** `<provider>/<model>` (напр. `openai/text-embedding-3-large`)
  - `embedding_dimensions` INTEGER - размерност на embedding вектора за валидиране (трябва да съвпада с `pgvector vector(N)`)

> Забележка: Ако ползваме AI Gateway централизирано, **не е нужно** да пазим per-tenant API keys в DB.

### 2. Миграция на базата данни
- [ ] **Създай миграционен скрипт** (`scripts/migrate-provider-selection.ts`):
  - Добави новите колони в `tenants` таблицата
  - Мигрирай съществуващите tenants с default стойности (напр. `llm_model_id='openai/gpt-4o-mini'`, `embedding_model_id='openai/text-embedding-3-large'`, `embedding_dimensions=3072`)

### 3. TypeScript типове
- [ ] **Обнови `lib/types/index.ts`:**
  - Обнови `Tenant` интерфейс с новите полета: `llm_model_id`, `embedding_model_id`, `embedding_dimensions`
  - Добави тип за `ModelId` (формат `<provider>/<model>`) и allowlist за разрешени модели (за UI/API валидиране)

### 4. Минимална „абстракция“ (валидация + allowlist)
- [ ] **Създай `lib/ai/models.ts`:**
  - `ALLOWED_LLM_MODELS: ModelId[]`
  - `ALLOWED_EMBEDDING_MODELS: { id: ModelId; dimensions: number }[]`
  - `assertAllowedModelSelection(...)` (валидира избор + размерност)

> Цел: да имаме *валидация*, без да пишем factory-и по провайдър.

### 5. Embeddings модул (чрез AI SDK + Gateway)
- [ ] **Рефакторирай `lib/utils/embeddings.ts`:**
  - Използвай `embed()` и `embedMany()` от `ai` пакета с `model: '<provider>/<model>'`
  - Чети `embedding_model_id` от tenant settings
  - Валидирай, че `embedding_dimensions` съвпада с `vector(N)` в DB
  - Обнови `generateEmbedding()` и `generateEmbeddings()` да приемат `tenantId`

### 6. Chat API (чрез AI SDK + Gateway)
- [ ] **Обнови `app/api/chat/route.ts`:**
  - Извличай `llm_model_id` от tenant settings
  - Премахни hardcoded `openai('gpt-4-turbo-preview')`
  - Използвай `streamText({ model: llm_model_id, ... })`
  - Добави валидиране (allowlist) и error handling

### 7. Tenant repository
- [ ] **Обнови `lib/db/repositories/tenants.ts`:**
  - Добави `updateTenantModelSettings()` функция (llm_model_id, embedding_model_id, embedding_dimensions)
  - Добави `getTenantModelSettings()` функция
  - Обнови `createTenant()` да приема/инициализира default model ids

### 8. UI компоненти
- [ ] **Създай `components/ProviderSettings.tsx`:**
  - Dropdown за избор на `llm_model_id` (показва provider+model)
  - Dropdown за избор на `embedding_model_id` (показва provider+model) + показва `dimensions`
  - Визуално предупреждение: смяна на embedding модел изисква **re-embed на всички документи**
  - Save бутон

- [ ] **Обнови `app/page.tsx`:**
  - Добави таб "Settings" или секция за provider настройки
  - Интегрирай `ProviderSettings` компонента

### 9. API endpoint за настройки
- [ ] **Създай `app/api/tenants/settings/route.ts`:**
  - GET endpoint за взимане на текущите настройки
  - PUT/PATCH endpoint за обновяване на настройки
  - Валидация на provider и model комбинации

### 10. Environment variables
- [ ] **Обнови `.env.example`:**
  - Добави `AI_GATEWAY_API_KEY` (ако не се ползва OIDC през Vercel)
  - Добави default-и (fallback) за `DEFAULT_LLM_MODEL_ID` и `DEFAULT_EMBEDDING_MODEL_ID`

### 11. Документация
- [ ] **Обнови `README.md`:**
  - Добави секция „Model selection (provider/model)“
  - Добави секция „Vercel AI Gateway setup“ (локално и във Vercel)

### 12. Зависимости (package.json)
- [ ] **Добави необходимите пакети:**
  - **Минимално (Gateway-first):** няма нужда от допълнителни `@ai-sdk/*` модули за routing
  - По избор: `@ai-sdk/gateway` (за типове като `GatewayProviderOptions`)
  - **Забележка:** можем да премахнем `openai` пакета, след като embeddings мине изцяло през `ai` (`embed/embedMany`)

### 13. Error handling
- [ ] **Обнови error handling:**
  - Provider-специфични error messages
  - Fallback механизъм при provider failure
  - Валидация на provider/model комбинации

### 14. Backward compatibility
- [ ] **Осигури backward compatibility:**
  - Ако tenant няма зададен provider, използвай environment variables
  - Default към OpenAI ако няма настройки
  - Миграция на съществуващи tenants

## Приоритети

### Фаза 1 (Основна функционалност):
1. Database schema промени
2. Model selection чрез `provider/model` (Gateway-first) + allowlist
3. Tenant repository обновления
4. Embeddings модул рефакториране
5. Chat API обновяване

### Фаза 2 (UI и UX):
6. ProviderSettings компонент
7. Settings API endpoint
8. UI интеграция

### Фаза 3 (Разширяване):
9. Поддръжка на допълнителни providers (Anthropic, etc.)
10. Advanced настройки и конфигурация

## Забележки
### pgvector размерност (vector(N)) и embedding размерност
- `pgvector vector(N)` **трябва да съвпада** с размерността на embedding модела (дължината на масива `number[]`).
- Ако смениш embedding модел към друг с различно `N`, ще трябва:
  - миграция `ALTER TABLE ... ALTER COLUMN vector TYPE vector(N)`
  - rebuild на индекса
  - **пре-индексиране/ре-embeddings на всички document chunks**
- Практическа препоръка за този проект:
  - ако искаме **без миграции сега**: оставаме на `N=3072` и embedding модел като `openai/text-embedding-3-large`
  - ако искаме **по-ниски разходи/по-бързо търсене при сходно качество**: мигрираме към `N=1536` и embedding модел като `openai/text-embedding-3-small` (изисква re-embed)

### Gateway бележки
- AI Gateway позволява да ползваш модел като string: `model: 'openai/gpt-4o'` и `model: 'openai/text-embedding-3-large'`
- Per-tenant BYOK е възможно, но усложнява сигурността; Gateway-first работи най-чисто с централизирани креденшъли във Vercel.

## Примерен код за имплементация

### Chat (app/api/chat/route.ts) – динамичен избор чрез string id
```typescript
import { streamText } from 'ai';
import { getTenantModelSettings } from '@/lib/db/repositories/tenants';

const settings = await getTenantModelSettings(tenantId);

const result = await streamText({
  model: settings.llm_model_id, // напр. 'anthropic/claude-sonnet-4.5'
  // ...
});
```

### Embeddings (lib/utils/embeddings.ts) – динамичен избор чрез string id
```typescript
import { embedMany } from 'ai';
import { getTenantModelSettings } from '@/lib/db/repositories/tenants';

export async function generateEmbeddings(texts: string[], tenantId: string): Promise<number[][]> {
  const settings = await getTenantModelSettings(tenantId);

  const { embeddings } = await embedMany({
    model: settings.embedding_model_id, // напр. 'openai/text-embedding-3-large'
    values: texts,
  });

  return embeddings;
}
```
