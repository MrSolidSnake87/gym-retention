import type { NextApiResponse } from 'next';
import { getMembersByGymId, getMemberByIdAndGym } from '@/lib/db-postgres';
import { analyzeAllMembers, getTodaysActions } from '@/lib/analyzer';
import { generateScriptForMember } from '@/lib/scriptGenerator';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const gymId = req.gym_id!;
    const { memberId } = req.query;

    // If memberId provided, return script for that specific member
    if (memberId) {
      const id = Array.isArray(memberId) ? memberId[0] : memberId;

      // getMemberByIdAndGym enforces gym_id — can't look up another gym's member
      const rawMember = await getMemberByIdAndGym(id, gymId);

      if (!rawMember) {
        return res.status(404).json({ error: 'Member not found' });
      }

      const analyzed = analyzeAllMembers([rawMember]);
      const script = generateScriptForMember(analyzed[0]);

      return res.status(200).json({ script });
    }

    // Otherwise return today's action queue for this gym
    const rawMembers = await getMembersByGymId(gymId);

    if (rawMembers.length === 0) {
      return res.status(200).json({
        actionQueue: [],
        scripts: [],
        count: 0,
      });
    }

    const analyzed = analyzeAllMembers(rawMembers);
    const todaysActions = getTodaysActions(analyzed);
    const scripts = todaysActions.map((member) => generateScriptForMember(member));

    return res.status(200).json({
      actionQueue: todaysActions,
      scripts,
      count: scripts.length,
    });
  } catch (error) {
    console.error('Actions fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch actions',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export default withAuth(handler);
