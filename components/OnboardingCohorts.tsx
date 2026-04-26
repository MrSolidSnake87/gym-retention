import { MemberAnalysis } from '@/lib/analyzer';
import { getStageColor, getStageLabel } from '@/lib/utils';

interface Cohorts {
  welcome: MemberAnalysis[];
  day7: MemberAnalysis[];
  day30: MemberAnalysis[];
  return_incentive: MemberAnalysis[];
  day90: MemberAnalysis[];
  complete: MemberAnalysis[];
}

interface Props {
  cohorts: Cohorts;
  onSelectMember: (member: MemberAnalysis) => void;
}

export default function OnboardingCohorts({ cohorts, onSelectMember }: Props) {
  const stages: Array<{ key: keyof Cohorts; label: string }> = [
    { key: 'welcome', label: 'Day 1 - Welcome' },
    { key: 'day7', label: 'Day 7 - Check-in' },
    { key: 'day30', label: 'Day 30 - Progress' },
    { key: 'return_incentive', label: 'Return Incentive' },
    { key: 'day90', label: 'Day 90 - Final' },
    { key: 'complete', label: 'Complete' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stages.map(({ key, label }) => {
        const members = cohorts[key];
        return (
          <div
            key={key}
            className={`${getStageColor(key)} rounded-lg p-6 border border-gray-200 shadow-sm`}
          >
            <h3 className="font-bold text-gray-900 mb-2">{label}</h3>
            <div className="text-3xl font-bold text-gray-800 mb-4">
              {members.length}
            </div>

            {members.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Members:
                </p>
                <ul className="space-y-2 max-h-32 overflow-y-auto">
                  {members.slice(0, 3).map((member) => (
                    <li
                      key={member.id}
                      className="text-sm text-gray-700 cursor-pointer hover:text-gray-900 hover:font-medium"
                      onClick={() => onSelectMember(member)}
                    >
                      • {member.name}
                    </li>
                  ))}
                  {members.length > 3 && (
                    <li className="text-sm text-gray-500">
                      +{members.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
