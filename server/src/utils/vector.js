export function dotProduct(a, b) {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    sum += a[i] * b[i];
  }
  return sum;
}

export function magnitude(vector) {
  let sum = 0;
  for (let i = 0; i < vector.length; i += 1) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length) return 0;
  const denominator = magnitude(a) * magnitude(b);
  if (denominator === 0) return 0;
  return dotProduct(a, b) / denominator;
}
