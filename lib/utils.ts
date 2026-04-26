export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function daysAgo(date: string): number {
  const d = new Date(date);
  const today = new Date();
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function getRiskColor(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
      return 'bg-red-100 border-red-300';
    case 'moderate':
      return 'bg-yellow-100 border-yellow-300';
    default:
      return 'bg-green-100 border-green-300';
  }
}

export function getStageLabel(stage: string): string {
  const labels: { [key: string]: string } = {
    welcome: 'Day 1 - Welcome',
    day7: 'Day 7 - Check-in',
    day30: 'Day 30 - Progress Check',
    return_incentive: 'Return Incentive',
    day90: 'Day 90 - Final Check-in',
    complete: 'Complete',
  };
  return labels[stage] || stage;
}

export function getStageColor(stage: string): string {
  switch (stage) {
    case 'welcome':
      return 'bg-blue-100';
    case 'day7':
      return 'bg-blue-200';
    case 'day30':
      return 'bg-purple-100';
    case 'return_incentive':
      return 'bg-orange-100';
    case 'day90':
      return 'bg-pink-100';
    case 'complete':
      return 'bg-green-100';
    default:
      return 'bg-gray-100';
  }
}
