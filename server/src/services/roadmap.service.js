import { NIM_API_KEY, NIM_BASE_URL, GENERATION_MODEL } from '../config/env.js';
import { Roadmap } from '../models/Roadmap.model.js';
import { GlobalAnalytics } from '../models/GlobalAnalytics.model.js';
import { getNotes } from './notes.service.js';
import { parseJsonSafe } from '../utils/http.js';

/**
 * Generates a personalized learning roadmap using the LLM.
 * Takes the current study topics, performance, and optional active video context into account.
 */
export async function generatePersonalizedRoadmap(userId, videoId = null) {
  const analytics = await GlobalAnalytics.findOne({ userId });
  
  let currentContext = '';
  if (videoId) {
    const notes = await getNotes(videoId);
    if (notes && notes.sections) {
      const videoTopics = notes.sections.map(s => s.title).join(', ');
      currentContext = `The student is currently studying: ${videoTopics}. `;
    }
  }

  const historicalConcepts = analytics 
    ? Array.from(analytics.conceptStruggles.entries())
        .map(([topic, count]) => topic)
        .join(', ')
    : '';

  const historicalContext = historicalConcepts 
    ? `Their previous study history includes: ${historicalConcepts}. `
    : 'They are a new student. ';

  const prompt = `You are a curriculum designer. Create a learning roadmap for a student.
${currentContext}${historicalContext}

Rules:
- Suggest exactly 6 progressive learning nodes.
- If an active video context is provided, ensure the roadmap starts with its core concepts and branches out.
- At least 2 nodes should be fundamental prerequisites for these topics.
- At least 2 nodes should be advanced applications or next-steps.
- Each node needs a title and a concise 1-sentence description.

Return ONLY a JSON array of objects:
[
  { "title": "Topic Title", "description": "Short explanation", "type": "concept/practice/advanced" }
]`;

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NIM_API_KEY}`,
    },
    body: JSON.stringify({
      model: GENERATION_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    }),
  });

  const data = await parseJsonSafe(res);
  const content = data?.choices?.[0]?.message?.content || '[]';
  
  let suggestedNodes = [];
  try {
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    suggestedNodes = JSON.parse(content.slice(start, end + 1));
  } catch (e) {
    console.error('Failed to parse roadmap JSON:', e);
    return null;
  }

  const nodes = suggestedNodes.map((n, i) => ({
    ...n,
    order: i,
    status: i === 0 ? 'available' : 'locked'
  }));

  const roadmap = await Roadmap.findOneAndUpdate(
    { userId },
    { 
      nodes, 
      totalNodes: nodes.length, 
      completedNodes: 0,
      updatedAt: new Date() 
    },
    { upsert: true, new: true }
  );

  return roadmap;
}

export async function getRoadmap(userId) {
  return Roadmap.findOne({ userId });
}

export async function markNodeComplete(userId, nodeId) {
  const roadmap = await Roadmap.findOne({ userId });
  if (!roadmap) return null;

  const node = roadmap.nodes.id(nodeId);
  if (node) {
    node.status = 'completed';
    
    // Unlock next node
    const nextNode = roadmap.nodes.find(n => n.order === node.order + 1);
    if (nextNode) nextNode.status = 'available';

    roadmap.completedNodes = roadmap.nodes.filter(n => n.status === 'completed').length;
    roadmap.updatedAt = new Date();
    await roadmap.save();
  }

  return roadmap;
}
