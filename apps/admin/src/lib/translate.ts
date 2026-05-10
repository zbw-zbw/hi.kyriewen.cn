/**
 * AI Translation utility — Chinese → English
 * Uses the same AI provider configured in main site (AI_PROVIDER + AI_API_KEY)
 */

export type TranslateFieldType = 'title' | 'description' | 'article' | 'short';

interface TranslateRequest {
  text: string;
  type?: TranslateFieldType;
}

interface TranslateResult {
  original: string;
  translated: string;
}

const SYSTEM_PROMPTS: Record<TranslateFieldType, string> = {
  title:
    'You are a professional translator. Translate the following Chinese text to English. Keep it concise and natural. Only output the translated text, nothing else.',
  description:
    'You are a professional translator. Translate the following Chinese text to English. Maintain the tone and style. Only output the translated text, nothing else.',
  short:
    'You are a professional translator. Translate the following short Chinese text to English. Be concise. Only output the translated text, nothing else.',
  article: `You are a professional technical translator. Translate the following Chinese Markdown article to English.

Rules:
- Preserve all Markdown formatting (headings, lists, code blocks, links, images, bold, italic)
- Do NOT translate content inside code blocks (\`\`\` or inline \`)
- Keep technical terms, brand names, and proper nouns as-is
- Maintain the original paragraph structure
- Only output the translated Markdown, nothing else.`,
};

function getApiConfig() {
  const provider = (process.env.AI_PROVIDER ?? 'deepseek').toLowerCase();
  const apiKey = process.env.AI_API_KEY ?? '';

  if (!apiKey) throw new Error('AI_API_KEY is not configured');

  if (provider === 'deepseek') {
    return {
      baseUrl: 'https://api.deepseek.com/v1',
      model: process.env.AI_MODEL ?? 'deepseek-chat',
      apiKey,
    };
  }

  // Default: OpenAI-compatible
  return {
    baseUrl: 'https://api.openai.com/v1',
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
    apiKey,
  };
}

export async function translateText(
  text: string,
  type: TranslateFieldType = 'description'
): Promise<string> {
  if (!text.trim()) return '';

  const { baseUrl, model, apiKey } = getApiConfig();
  const systemPrompt = SYSTEM_PROMPTS[type];

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: type === 'article' ? 8192 : 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`AI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const translated = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!translated) throw new Error('Empty translation response');
  return translated;
}

export async function translateBatch(
  items: TranslateRequest[]
): Promise<TranslateResult[]> {
  const results: TranslateResult[] = [];
  for (const item of items) {
    const translated = await translateText(item.text, item.type ?? 'description');
    results.push({ original: item.text, translated });
  }
  return results;
}
