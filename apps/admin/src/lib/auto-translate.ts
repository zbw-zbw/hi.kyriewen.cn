/**
 * Auto-translate utility — wraps translateText for field-level automation.
 * Usage: pass Chinese field values + their translation types,
 * get back English translations keyed by field name.
 */

import { translateText, type TranslateFieldType } from './translate';

interface FieldSpec {
  value: string;
  type?: TranslateFieldType;
}

/**
 * Translate multiple Chinese fields to English in one call.
 * @param fields - Record of fieldName → { value, type }
 * @returns Record of fieldName → translated English string
 *
 * @example
 * const en = await autoTranslateFields({
 *   titleZh:       { value: '我的标题', type: 'title' },
 *   descriptionZh: { value: '一段描述', type: 'description' },
 * });
 * // en = { titleZh: 'My Title', descriptionZh: 'A description' }
 */
export async function autoTranslateFields(
  fields: Record<string, FieldSpec>,
): Promise<Record<string, string>> {
  const entries = Object.entries(fields).filter(([, spec]) => spec.value.trim());
  const results: Record<string, string> = {};

  // Translate sequentially to avoid rate-limiting
  for (const [key, spec] of entries) {
    try {
      results[key] = await translateText(spec.value, spec.type ?? 'short');
    } catch (error) {
      console.error(`[auto-translate] Failed to translate field "${key}"`, error);
      results[key] = ''; // Empty on failure, let caller decide fallback
    }
  }

  return results;
}

/**
 * Translate a single text value (Chinese → English).
 * Convenience wrapper that swallows errors and returns empty string on failure.
 */
export async function safeTranslate(
  text: string,
  type: TranslateFieldType = 'short',
): Promise<string> {
  if (!text.trim()) return '';
  try {
    return await translateText(text, type);
  } catch (error) {
    console.error('[auto-translate] safeTranslate failed', error);
    return '';
  }
}
