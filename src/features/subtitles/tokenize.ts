export interface Token {
  text: string;
  /** True when the token is a clickable word (letters), false for punctuation/space. */
  isWord: boolean;
}

// German letters incl. umlauts and ß, with internal hyphens/apostrophes
// ("E-Mail-Adresse", "gibt's").
const WORD_RE = /[A-Za-zÄÖÜäöüß]+(?:['’-][A-Za-zÄÖÜäöüß]+)*/g;

/** Splits a subtitle line into clickable word tokens and passthrough separators. */
export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  for (const match of line.matchAll(WORD_RE)) {
    const start = match.index;
    if (start > last) tokens.push({ text: line.slice(last, start), isWord: false });
    tokens.push({ text: match[0], isWord: true });
    last = start + match[0].length;
  }
  if (last < line.length) tokens.push({ text: line.slice(last), isWord: false });
  return tokens;
}
