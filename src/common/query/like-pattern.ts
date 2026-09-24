import { ILike } from 'typeorm';

// `%`, `_` and the escape character itself are wildcards to LIKE, so a search
// for "50%" has to match the literal text.
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Case-insensitive "contains" for a `q` search: what the user typed is matched
// as plain text, wildcards included.
export function containsText(text: string) {
  return ILike(`%${escapeLikePattern(text)}%`);
}
