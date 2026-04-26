import type { NextApiResponse } from 'next';
import { getMembersByGymId, getSubscriptionByGymId } from '@/lib/db-postgres';
import { analyzeAllMembers, getAtRiskMembers, getOnboardingCohorts } from '@/lib/analyzer';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const gymId = req.gym_id!;

    // Server-side subscription gate — block data access for non-active subscriptions
    const subscription = await getSubscriptionByGymId(gymId);
    const subscriptionStatus = subscription?.status || 'trial';
    if (subscriptionStatus !== 'active') {
      return res.status(403).json({ error: 'Active subscription required', subscription_status: subscriptionStatus });
    }

    // Fetch only this gym's members
    const rawMembers = await getMembersByGymId(gymId);

    if (rawMembers.length === 0) {
      return res.status(200).json({
        members: [],
        atRisk: [],
        cohorts: {
          welcome: [],
          day7: [],
          day30: [],
          return_incentive: [],
          day90: [],
          complete: [],
        },
        stats: {
          totalMembers: 0,
          atRiskCount: 0,
          atRiskPercentage: '0.0',
        },
      });
    }

    const analyzed = analyzeAllMembers(rawMembers);
    const atRisk = getAtRiskMembers(analyzed);
    const cohorts = getOnboardingCohorts(analyzed);

    return res.status(200).json({
      members: analyzed,
      atRisk,
      cohorts,
      stats: {
        totalMembers: analyzed.length,
        atRiskCount: atRisk.length,
        atRiskPercentage: ((atRisk.length / analyzed.length) * 100).toFixed(1),
      },
    });
  } catch (error) {
    console.error('Members fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch members',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export default withAuth(handler);
