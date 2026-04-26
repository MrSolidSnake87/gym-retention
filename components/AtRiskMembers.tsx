'use client';

import { MemberAnalysis } from '@/lib/analyzer';
import { getRiskColor, daysAgo } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Props {
  members: MemberAnalysis[];
  onSelectMember: (member: MemberAnalysis) => void;
}

export default function AtRiskMembers({ members, onSelectMember }: Props) {
  const [completed, setCompleted] = useState<Set<number | string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('completedMembers');
    if (saved) {
      setCompleted(new Set(JSON.parse(saved)));
    }
  }, []);

  const toggleCompleted = (memberId: number | string) => {
    const updated = new Set(completed);
    if (updated.has(memberId)) {
      updated.delete(memberId);
    } else {
      updated.add(memberId);
    }
    setCompleted(updated);
    localStorage.setItem('completedMembers', JSON.stringify(Array.from(updated)));
  };
  if (members.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">
          ✓ No At-Risk Members
        </h3>
        <p className="text-green-700">
          All your members are active and engaged!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              At-Risk Members ({members.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Sorted by days inactive (longest first)
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">
              {completed.size}
            </div>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-1 py-2 text-center text-xs font-semibold text-gray-700 w-8">
                ✓
              </th>
              <th className="px-1 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                Name
              </th>
              <th className="px-1 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                Membership
              </th>
              <th className="px-1 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                Last Active
              </th>
              <th className="px-1 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                Days
              </th>
              <th className="px-1 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">
                Risk
              </th>
              <th className="px-1 py-2 text-left text-xs font-semibold text-gray-700">
                Action Needed
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((member) => {
              const memberId = member.id ?? member.name;
              return (
              <tr
                key={memberId}
                className={`${getRiskColor(member.risk_level)} hover:bg-opacity-75 ${
                  completed.has(memberId) ? 'opacity-50' : ''
                }`}
              >
                <td
                  className="px-1 py-2 text-center text-lg cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompleted(memberId);
                  }}
                >
                  {completed.has(memberId) ? (
                    <span>✅</span>
                  ) : (
                    <span className="text-gray-300">⭕</span>
                  )}
                </td>
                <td
                  className="px-1 py-2 text-xs font-medium text-gray-900 cursor-pointer whitespace-nowrap"
                  onClick={() => onSelectMember(member)}
                >
                  {member.name}
                </td>
                <td
                  className="px-1 py-2 text-xs cursor-pointer whitespace-nowrap"
                  onClick={() => onSelectMember(member)}
                  title={member.payment_status}
                >
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-xs font-medium">
                    {member.payment_status.length > 13 ? member.payment_status.substring(0, 13) + '…' : member.payment_status}
                  </span>
                </td>
                <td
                  className="px-2 py-2 text-xs text-gray-700 cursor-pointer whitespace-nowrap"
                  onClick={() => onSelectMember(member)}
                >
                  {new Date(member.last_activity).toLocaleDateString('en-US', {month: '2-digit', day: '2-digit', year: '2-digit'})}
                </td>
                <td
                  className="px-1 py-2 text-xs font-semibold text-gray-900 cursor-pointer whitespace-nowrap"
                  onClick={() => onSelectMember(member)}
                >
                  {member.days_since_activity}
                </td>
                <td
                  className="px-1 py-2 text-xs cursor-pointer whitespace-nowrap"
                  onClick={() => onSelectMember(member)}
                >
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      member.risk_level === 'critical'
                        ? 'bg-red-200 text-red-900'
                        : 'bg-yellow-200 text-yellow-900'
                    }`}
                  >
                    {member.risk_level === 'critical' ? 'CRIT' : 'MOD'}
                  </span>
                </td>
                <td
                  className="px-1 py-2 text-xs text-gray-700 cursor-pointer"
                  onClick={() => onSelectMember(member)}
                >
                  {member.action_needed.substring(0, 30)}...
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
