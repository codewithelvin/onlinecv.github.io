/**
 * Fold a string for substring search in the dictionary dropdowns.
 *
 * WHY `toLowerCase()` IS NOT ENOUGH, and this is a real defect it fixes: the
 * Azerbaijani dotted capital `İ` lower-cases to `i` PLUS a combining dot above
 * (U+0307), so `'İsgəndəriyyə'.toLowerCase().includes('is')` is **false** and the
 * university simply could not be found by typing its first two letters. 67 rows
 * across the shipped dictionaries contain `İ` or `I`, and Azerbaijani is the
 * primary market.
 *
 * Decomposing and dropping the combining marks fixes that and makes search
 * diacritic-insensitive as a bonus, which matters when the label is in a script
 * or with letters the user's keyboard may not have: `ozel` finds `Özəl`, `seki`
 * finds `Şəki`, `muhammad` is unaffected. Arabic harakat fold away too, so a
 * pointed and an unpointed spelling both match.
 *
 * `ə` and `ı` need explicit handling: neither has a canonical decomposition, so
 * NFD leaves them alone and they would stay unreachable from a Latin keyboard.
 */
const NON_DECOMPOSING = /[əı]/g;
const FOLDED: Record<string, string> = { ə: 'e', ı: 'i' };

export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    // Combining marks, i.e. everything NFD just split off.
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(NON_DECOMPOSING, (ch) => FOLDED[ch]);
}

/**
 * Does `label` contain `input`, ignoring case and diacritics?
 *
 * The needle is folded ONCE by the caller in the hot path — this signature keeps
 * that possible — because a dropdown filter runs per option per keystroke, and
 * folding the input again for each of several thousand options is pure waste.
 */
export function matchesSearch(foldedLabel: string, foldedInput: string): boolean {
  return foldedLabel.includes(foldedInput);
}
