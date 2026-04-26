import { Member } from './db';

export interface MemberAnalysis extends Member {
  days_since_join: number;
  days_since_activity: number;
  is_at_risk: boolean;
  risk_level: 'none' | 'moderate' | 'critical';
  onboarding_stage: 'welcome' | 'day7' | 'day30' | 'return_incentive' | 'day90' | 'complete';
  action_needed: string;
}

export function analyzeMember(member: Member, today = new Date()): MemberAnalysis {
  const joinDate = new Date(member.join_date);
  const lastActivityDate = new Date(member.last_activity);

  const daysSinceJoin = Math.floor(
    (today.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysSinceActivity = Math.floor(
    (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // At-risk detection: no activity for 14+ days
  const isAtRisk = daysSinceActivity >= 14;
  let riskLevel: 'none' | 'moderate' | 'critical' = 'none';
  if (daysSinceActivity >= 30) riskLevel = 'critical';
  else if (daysSinceActivity >= 14) riskLevel = 'moderate';

  // Onboarding stage calculation
  let onboardingStage: MemberAnalysis['onboarding_stage'] = 'complete';
  let actionNeeded = 'No action needed';

  if (daysSinceJoin < 1) {
    onboardingStage = 'welcome';
    actionNeeded = 'Send welcome email';
  } else if (daysSinceJoin < 7) {
    onboardingStage = 'day7';
    actionNeeded = 'Plan day 7 check-in';
  } else if (daysSinceJoin < 30) {
    onboardingStage = 'day30';
    actionNeeded = 'Plan day 30 progress check';
  } else if (daysSinceJoin >= 30 && daysSinceActivity >= 14) {
    onboardingStage = 'return_incentive';
    actionNeeded = 'Offer return incentive (free PT session)';
  } else if (daysSinceJoin >= 30 && daysSinceJoin < 90) {
    onboardingStage = 'day90';
    actionNeeded = 'Plan day 90 check-in';
  }

  return {
    ...member,
    days_since_join: daysSinceJoin,
    days_since_activity: daysSinceActivity,
    is_at_risk: isAtRisk,
    risk_level: riskLevel,
    onboarding_stage: onboardingStage,
    action_needed: actionNeeded,
  };
}

export function analyzeAllMembers(members: Member[]): MemberAnalysis[] {
  // Filter out members with zero/no payment (complimentary or unpaying)
  const activeMembers = members.filter((m) => {
    const status = m.payment_status?.toLowerCase() || '';
    return status !== 'complimentary' && status !== 'complimentary mem' && status !== '0.00';
  });

  return activeMembers.map((m) => analyzeMember(m));
}

export function getAtRiskMembers(analyzed: MemberAnalysis[]): MemberAnalysis[] {
  return analyzed.filter((m) => m.is_at_risk).sort((a, b) => b.days_since_activity - a.days_since_activity);
}

export function getMembersByStage(analyzed: MemberAnalysis[], stage: MemberAnalysis['onboarding_stage']) {
  return analyzed.filter((m) => m.onboarding_stage === stage);
}

export function getOnboardingCohorts(analyzed: MemberAnalysis[]) {
  return {
    welcome: analyzed.filter((m) => m.onboarding_stage === 'welcome'),
    day7: analyzed.filter((m) => m.onboarding_stage === 'day7'),
    day30: analyzed.filter((m) => m.onboarding_stage === 'day30'),
    return_incentive: analyzed.filter((m) => m.onboarding_stage === 'return_incentive'),
    day90: analyzed.filter((m) => m.onboarding_stage === 'day90'),
    complete: analyzed.filter((m) => m.onboarding_stage === 'complete'),
  };
}

export function getTodaysActions(analyzed: MemberAnalysis[]): MemberAnalysis[] {
  const today = new Date();
  const dayOfMonth = today.getDate();

  return analyzed.filter((m) => {
    // Day 7 actions
    if (
      m.onboarding_stage === 'day7' &&
      new Date(m.join_date).getDate() === dayOfMonth
    ) {
      return true;
    }

    // Day 30 actions
    if (
      m.onboarding_stage === 'day30' &&
      new Date(m.join_date).getDate() === dayOfMonth
    ) {
      return true;
    }

    // Day 90 actions
    if (
      m.onboarding_stage === 'day90' &&
      new Date(m.join_date).getDate() === dayOfMonth
    ) {
      return true;
    }

    // Return incentive (ongoing)
    if (m.onboarding_stage === 'return_incentive') {
      return true;
    }

    return false;
  });
}
