import { generatePersonalizedRoadmap, getRoadmap, markNodeComplete } from '../services/roadmap.service.js';

export async function handleGetRoadmap(req, res) {
  const userId = req.authUserId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let roadmap = await getRoadmap(userId);
    if (!roadmap) {
      // Try to auto-generate if missing
      roadmap = await generatePersonalizedRoadmap(userId).catch(() => null);
    }
    return res.json(roadmap);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
}

export async function handleGenerateRoadmap(req, res) {
  const userId = req.authUserId;
  const { videoId } = req.body ?? {};
  
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const roadmap = await generatePersonalizedRoadmap(userId, videoId);
    return res.json(roadmap);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function handleCompleteNode(req, res) {
  const userId = req.authUserId;
  const { nodeId } = req.params;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const roadmap = await markNodeComplete(userId, nodeId);
    return res.json(roadmap);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update node' });
  }
}
