/**
 * Bidirectional-text handling for values the USER types.
 *
 * A form control inherits the direction of the interface, which is right for
 * prose in the user's own language and wrong for a machine identifier. The
 * Unicode bidirectional algorithm resolves `+` (class ES) and `@` (class ON)
 * from their neighbours, and at the START of a value there is nothing to the
 * left of them, so they take the paragraph direction instead. In an Arabic or
 * Hebrew UI that draws the phone number `+994501234567` as `994501234567+` and
 * the handle `@elvin` as `elvin@`: the digits are in the right order and the
 * sign has moved to the far end — which is what "the `+` acts unusual" means,
 * the country code no longer has its plus in front of it.
 *
 * `dir="auto"` fixes it without the app having to classify the field. The
 * browser takes the direction from the first STRONG character of the value
 * itself and falls back to left-to-right when there is none (HTML's "auto"
 * directionality). A phone number has no strong character at all, so it reads
 * left-to-right; `@elvin` and `https://…` start with a Latin letter, so they do
 * too; an Arabic street address starts with an Arabic letter and stays
 * right-to-left. One attribute, no per-field table, and a contact channel added
 * later is covered for free.
 *
 * It is deliberately NOT applied to prose fields (names, employer, description).
 * Those are written in the interface language, so following the interface
 * direction is correct, and `dir="auto"` would left-align a Latin employer name
 * in an otherwise right-aligned form.
 *
 * Scope: this is an EDITOR concern only. The CV preview and the exported PDF are
 * laid out left-to-right whatever the CV language (`A4Frame` pins `dir="ltr"`
 * and react-pdf has no page direction — see `templates/_core/direction.ts`), so
 * a phone number printed on the CV was never reordered.
 *
 * The same trap bites TRANSLATIONS that quote a phone format: a right-to-left
 * sentence ending in `+994XXXXXXXXX` renders the `+` after the number. There the
 * fix is a LEFT-TO-RIGHT MARK (U+200E) in front of the `+` — it makes the digits
 * left-to-right by rule W7, which pulls the sign into the same run. `ar` and
 * `he` `validation.shouldMatchPhone` carry one; see `docs/adding-a-language.md`.
 */
export const VALUE_DIR = 'auto';

/** What a control may declare. `VALUE_DIR` is the only value the app passes. */
export type ValueDirection = 'auto' | 'ltr' | 'rtl';
