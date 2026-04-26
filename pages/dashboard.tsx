import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { MemberAnalysis } from '@/lib/analyzer';
import { MemberScript } from '@/lib/scriptGenerator';
import AtRiskMembers from '@/components/AtRiskMembers';
import OnboardingCohorts from '@/components/OnboardingCohorts';
import ScriptDisplay from '@/components/ScriptDisplay';

interface AuthSession {
  gym_id: string;
  user_id: string;
  email: string;
  role: string;
  gym_name: string;
  subscription_status: string;
}

interface DashboardData {
  members: MemberAnalysis[];
  atRisk: MemberAnalysis[];
  cohorts: {
    welcome: MemberAnalysis[];
    day7: MemberAnalysis[];
    day30: MemberAnalysis[];
    return_incentive: MemberAnalysis[];
    day90: MemberAnalysis[];
    complete: MemberAnalysis[];
  };
  stats: {
    totalMembers: number;
    atRiskCount: number;
    atRiskPercentage: string;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberAnalysis | null>(null);
  const [script, setScript] = useState<MemberScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload state (for inline upload on empty dashboard)
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verify session on mount
  useEffect(() => {
    fetch('/api/auth/verify')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          window.location.href = '/auth/login';
        } else {
          setSession(data.session);
          setAuthLoading(false);
        }
      })
      .catch(() => {
        window.location.href = '/auth/login';
      });
  }, []);

  // Fetch dashboard data after auth confirmed
  useEffect(() => {
    if (!authLoading && session) {
      fetchData();
    }
  }, [authLoading, session]);

  useEffect(() => {
    if (selectedMember) {
      fetchScript(selectedMember.id);
    }
  }, [selectedMember]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/members');
      if (response.status === 401) {
        window.location.href = '/auth/login';
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchScript = async (memberId: number | string | undefined) => {
    if (!memberId) return;
    try {
      const response = await fetch(`/api/actions?memberId=${memberId}`);
      if (!response.ok) throw new Error('Failed to fetch script');
      const result = await response.json();
      setScript(result.script);
    } catch (err) {
      console.error('Script fetch error:', err);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  const processFile = async (file: File) => {
    const validExtensions = ['.csv', '.pdf'];
    const validTypes = ['text/csv', 'application/pdf'];
    const isValid =
      validTypes.includes(file.type) ||
      validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValid) {
      setUploadError('Please upload a CSV or PDF file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, filename: file.name }),
      });

      const result = await response.json();

      if (!response.ok) {
        setUploadError(result.error || 'Upload failed');
        return;
      }

      setUploadSuccess(true);
      setUploadedCount(result.memberCount);

      // Reload dashboard data without navigating away
      setTimeout(() => {
        setUploadSuccess(false);
        fetchData();
      }, 1500);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/auth/login';
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Data loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading member data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.stats.totalMembers === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{session?.gym_name}</h1>
              <p className="text-xs text-gray-500">{session?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="p-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-500 mb-8">Upload your member data to get started.</p>

            {uploadSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold text-green-900">Imported {uploadedCount} members!</p>
                <p className="text-sm text-green-700 mt-1">Loading your dashboard...</p>
              </div>
            ) : (
              <>
                {/* Drag & Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-10 text-center transition ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.pdf"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={uploading}
                  />

                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>

                  <p className="font-semibold text-gray-900 mb-1">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">or click below to browse</p>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition text-sm font-medium"
                  >
                    {uploading ? 'Processing...' : 'Select File'}
                  </button>

                  <p className="text-xs text-gray-400 mt-4">Supported formats: CSV, PDF</p>
                </div>

                {/* Upload Error */}
                {uploadError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{uploadError}</p>
                  </div>
                )}

                {/* Format hint */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Expected columns</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span><span className="font-medium text-gray-800">name</span> — Member full name</span>
                    <span><span className="font-medium text-gray-800">join_date</span> — YYYY-MM-DD</span>
                    <span><span className="font-medium text-gray-800">last_activity</span> — YYYY-MM-DD</span>
                    <span><span className="font-medium text-gray-800">payment_status</span> — active / pending</span>
                    <span><span className="font-medium text-gray-800">email</span> — optional</span>
                    <span><span className="font-medium text-gray-800">phone</span> — optional</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{session?.gym_name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                session?.subscription_status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : session?.subscription_status === 'trial'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {session?.subscription_status === 'trial' ? 'Trial' : session?.subscription_status}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Upload New File
            </a>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Gym Retention Dashboard
            </h2>
            <p className="text-gray-600 mt-1">
              Total Members: <span className="font-bold text-lg">{data.stats.totalMembers}</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <p className="text-gray-600 text-sm font-semibold">AT-RISK MEMBERS</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {data.stats.atRiskCount}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {data.stats.atRiskPercentage}% of total
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <p className="text-gray-600 text-sm font-semibold">ONBOARDING</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {data.cohorts.welcome.length +
                  data.cohorts.day7.length +
                  data.cohorts.day30.length}
              </p>
              <p className="text-gray-500 text-sm mt-2">In active journey</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <p className="text-gray-600 text-sm font-semibold">FULLY ENGAGED</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {data.cohorts.complete.length}
              </p>
              <p className="text-gray-500 text-sm mt-2">Complete onboarding</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side: Lists */}
            <div className="lg:col-span-2 space-y-8">
              {/* At-Risk Members */}
              <AtRiskMembers
                members={data.atRisk}
                onSelectMember={setSelectedMember}
              />

              {/* Onboarding Cohorts */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Onboarding by Stage
                </h2>
                <OnboardingCohorts
                  cohorts={data.cohorts}
                  onSelectMember={setSelectedMember}
                />
              </div>
            </div>

            {/* Right Side: Script */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Action Script
                </h2>
                <ScriptDisplay script={script} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
