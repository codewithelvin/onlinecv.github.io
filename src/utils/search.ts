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
 * `ə`, `ı` and `ß` need explicit handling: none of them has a canonical
 * decomposition, so NFD leaves them alone and they would stay unreachable from a
 * Latin keyboard. `ß` maps to TWO letters, which is what German itself does when
 * the character is unavailable — a user typing `fussball` has to find `Fußball`,
 * and folding it to a single `s` would not match either spelling.
 *
 * The umlauts need nothing: NFD splits `ä ö ü` into a letter plus a diaeresis, so
 * they already fold to `a o u`. That covers a user typing the bare vowel; the
 * `ae`/`oe`/`ue` transliteration is a different string and deliberately not
 * handled, since it only appears where the character cannot be typed at all.
 *
 * Uzbek's `oʻ`/`gʻ` have the same problem as `ə`/`ı`/`ß`: the turned comma
 * U+02BB (and the tutuq belgisi U+02BC it is sometimes confused with) is a
 * spacing MODIFIER letter, not a combining mark, so NFD leaves it exactly
 * where it is. A user without that key on their keyboard — which is nearly
 * everyone, it has no place on a standard layout — types `ozbek` and would
 * never find `Oʻzbek`. Folded away to nothing rather than to a letter: the
 * character marks a distinct vowel in real Uzbek, but the plain-Latin
 * spelling people actually type when they can't produce it drops the mark
 * entirely rather than substituting one, unlike German's `ß`→`ss`.
 */
const NON_DECOMPOSING = /[əıßʻʼ]/g;
const FOLDED: Record<string, string> = { ə: 'e', ı: 'i', ß: 'ss', ʻ: '', ʼ: '' };

export function searchKey(text: string): string {
  return (
    text
      .normalize('NFD')
      // Combining marks, i.e. everything NFD just split off.
      .replace(/\p{M}+/gu, '')
      .toLowerCase()
      .replace(NON_DECOMPOSING, (ch) => FOLDED[ch])
  );
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
