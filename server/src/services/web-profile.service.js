import { parseJsonSafe } from '../utils/http.js';
import { isPersonIdentityQuestion } from '../utils/text.js';
import { fetchVideoMetadata } from './visual-frames.service.js';

async function searchPersonOnWeb(query) {
  const res = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=0`
  );
  const data = await parseJsonSafe(res);
  if (!res.ok) return null;

  const related = Array.isArray(data?.RelatedTopics)
    ? data.RelatedTopics.flatMap((topic) => (Array.isArray(topic?.Topics) ? topic.Topics : [topic]))
    : [];
  const relatedText = related
    .map((item) => item?.Text)
    .filter((text) => typeof text === 'string')
    .slice(0, 4);

  const snippets = [
    data?.Heading ? `Heading: ${data.Heading}` : '',
    data?.AbstractText ? `Abstract: ${data.AbstractText}` : '',
    ...relatedText.map((text, idx) => `Related ${idx + 1}: ${text}`),
  ]
    .filter(Boolean)
    .join('\n');

  return snippets.trim() ? snippets : null;
}

export async function maybeResolvePersonFromWeb(videoId, question) {
  if (!isPersonIdentityQuestion(question)) return null;

  const metadata = await fetchVideoMetadata(videoId);
  if (!metadata) return null;

  const [titleLookup, channelLookup] = await Promise.all([
    searchPersonOnWeb(`${metadata.title} ${metadata.channel} who is she`),
    searchPersonOnWeb(`${metadata.channel} biography`),
  ]);

  const evidence = [titleLookup, channelLookup].filter(Boolean).join('\n\n');
  if (!evidence) return null;

  return { metadata, evidence };
}
