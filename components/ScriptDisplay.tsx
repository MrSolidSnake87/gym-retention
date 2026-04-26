import { useState } from 'react';
import { MemberScript } from '@/lib/scriptGenerator';

interface Props {
  script: MemberScript | null;
}

export default function ScriptDisplay({ script }: Props) {
  const [copied, setCopied] = useState<'email' | 'call' | null>(null);

  if (!script) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <p className="text-gray-600">Select a member to view their personalized script</p>
      </div>
    );
  }

  const copyToClipboard = (text: string, type: 'email' | 'call') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">{script.memberName}</h2>
        <p className="text-gray-600 mt-2">
          <strong>Action:</strong> {script.action}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          <strong>Contact via:</strong> {script.contactMethod === 'both'
            ? `${script.contactInfo.email} / ${script.contactInfo.phone}`
            : script.contactMethod === 'email'
            ? script.contactInfo.email
            : script.contactInfo.phone}
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Script */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                ✉
              </span>
              Email Script
            </h3>
            <button
              onClick={() => copyToClipboard(script.emailScript, 'email')}
              className={`text-sm px-3 py-1 rounded transition ${
                copied === 'email'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {copied === 'email' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-4 whitespace-pre-wrap text-sm text-gray-800 max-h-64 overflow-y-auto font-mono">
            {script.emailScript}
          </div>
        </div>

        {/* Call Script */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
                ☎
              </span>
              Call Script
            </h3>
            <button
              onClick={() => copyToClipboard(script.callScript, 'call')}
              className={`text-sm px-3 py-1 rounded transition ${
                copied === 'call'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {copied === 'call' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4 whitespace-pre-wrap text-sm text-gray-800 max-h-64 overflow-y-auto font-mono">
            {script.callScript}
          </div>
        </div>
      </div>
    </div>
  );
}
