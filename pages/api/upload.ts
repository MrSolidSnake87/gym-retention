import type { NextApiResponse } from 'next';
import { parseCSV, parsePDF } from '@/lib/parser';
import type { Member } from '@/lib/db';
import {
  clearMembersByGymId,
  createMembers,
  updateGym,
  getMemberCountByGymId,
  getGymById,
  getSubscriptionByGymId,
} from '@/lib/db-postgres';
import { getPricingTiers } from '@/lib/stripe';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const gymId = req.gym_id!;
    const { file, filename } = req.body;

    if (!file || !filename) {
      return res.status(400).json({ error: 'Missing file or filename' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(file, 'base64');

    let members: Member[] = [];

    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith('.csv')) {
      members = await parseCSV(buffer);
    } else if (lowerFilename.endsWith('.pdf')) {
      members = await parsePDF(buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use CSV or PDF.' });
    }

    if (members.length === 0) {
      return res.status(400).json({
        error: 'No valid members found in file',
        hint: 'Make sure your file contains columns: name, join_date, last_activity. Dates should be in YYYY-MM-DD format.',
      });
    }

    // Server-side subscription gate
    const subscription = await getSubscriptionByGymId(gymId);
    const subscriptionStatus = subscription?.status || 'trial';
    if (subscriptionStatus !== 'active') {
      return res.status(403).json({ error: 'Active subscription required' });
    }

    // Check member count against tier limit
    const gym = await getGymById(gymId);
    if (!gym) {
      return res.status(404).json({ error: 'Gym not found' });
    }

    const subscription = await getSubscriptionByGymId(gymId);
    const tier = subscription?.tier || 'starter';
    const pricingTiers = getPricingTiers();
    const tierConfig = pricingTiers[tier as keyof typeof pricingTiers];
    const memberLimit = tierConfig.members;

    if (memberLimit !== Infinity && members.length > memberLimit) {
      return res.status(400).json({
        error: 'Member count exceeds tier limit',
        currentTier: tier,
        tierLimit: memberLimit,
        uploadedMembers: members.length,
        message: `Your ${tier} plan supports up to ${memberLimit} members. You're trying to upload ${members.length} members.`,
        suggestion: tier === 'pro'
          ? 'Contact us for Enterprise pricing to support unlimited members.'
          : `Upgrade to the ${tier === 'starter' ? 'Pro' : 'Enterprise'} plan to support more members.`,
      });
    }

    // Clear old members for this gym only (other gyms unaffected)
    await clearMembersByGymId(gymId);

    // Insert new members linked to this gym
    await createMembers(gymId, members);

    // Update member count in gyms table
    const count = await getMemberCountByGymId(gymId);
    await updateGym(gymId, { member_count: count });

    return res.status(200).json({
      success: true,
      memberCount: members.length,
      message: `Successfully imported ${members.length} members`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Failed to process file',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

export default withAuth(handler);
