export function normalizeQuestionText(text) {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeForOverlap(text) {
  return new Set(
    String(text ?? '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

export function hasLexicalOverlap(question, chunks) {
  const qTokens = tokenizeForOverlap(question);
  if (qTokens.size === 0) return false;

  return chunks.some((chunk) => {
    const chunkTokens = tokenizeForOverlap(chunk.text);
    let overlap = 0;
    for (const token of qTokens) {
      if (chunkTokens.has(token)) overlap += 1;
      if (overlap >= 2) return true;
    }
    return false;
  });
}

export function extractTopicTokens(text, limit = 3) {
  const stopWords = new Set([
    'what',
    'when',
    'where',
    'which',
    'who',
    'why',
    'how',
    'this',
    'that',
    'from',
    'with',
    'about',
    'into',
    'your',
    'have',
    'does',
    'please',
    'explain',
    'video',
    'lecture',
  ]);

  const tokens = Array.from(tokenizeForOverlap(text)).filter((token) => !stopWords.has(token));
  return tokens.slice(0, limit);
}

export function isPersonIdentityQuestion(question) {
  const q = String(question ?? '').toLowerCase();
  return (
    /\bwho is (she|he|this person|that person)\b/.test(q) ||
    /\btell me about (her|him|this person|that person)\b/.test(q) ||
    /\bwho is in (the )?video\b/.test(q)
  );
}

export function isVisualQuestion(question) {
  const q = String(question ?? '').toLowerCase();
  return /\b(diagram|shown|show|screen|slide|image|visual|figure|chart|graph|seen|looks like)\b/.test(
    q
  );
}
