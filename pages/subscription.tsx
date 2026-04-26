import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface AuthSession {
  gym_id: string;
  gym_name: string;
  email: string;
  subscription_status: string;
}

export default function Subscription() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/verify')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setSession(data.session);
          // Check if coming from successful checkout
          if (router.query.session_id) {
            setMessage('✓ Subscription activated! Your account is now active.');
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          }
        } else {
          window.location.href = '/auth/login';
        }
      })
      .finally(() => setLoading(false));
  }, [router.query.session_id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Gym Retention - Subscription</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
            </div>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto px-6 py-12">
          {message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-semibold">{message}</p>
            </div>
          )}

          {session && (
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Subscription</h2>

              <div className="space-y-6">
                {/* Gym Name */}
                <div className="border-b border-gray-200 pb-6">
                  <p className="text-sm text-gray-600">Gym Name</p>
                  <p className="text-lg font-semibold text-gray-900">{session.gym_name}</p>
                </div>

                {/* Email */}
                <div className="border-b border-gray-200 pb-6">
                  <p className="text-sm text-gray-600">Account Email</p>
                  <p className="text-lg font-semibold text-gray-900">{session.email}</p>
                </div>

                {/* Subscription Status */}
                <div className="border-b border-gray-200 pb-6">
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-2 flex items-center">
                    {session.subscription_status === 'active' ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-lg font-semibold text-green-700">Active</span>
                      </>
                    ) : session.subscription_status === 'trial' ? (
                      <>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-lg font-semibold text-yellow-700">Trial</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-lg font-semibold text-red-700">Inactive</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Trial Info */}
                {session.subscription_status === 'trial' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-blue-900 font-semibold mb-4">
                      You're currently on a trial. Choose a plan to continue.
                    </p>
                    <button
                      onClick={() => (window.location.href = '/checkout')}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                    >
                      View Plans
                    </button>
                  </div>
                )}

                {/* Active Subscription */}
                {session.subscription_status === 'active' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <p className="text-green-900 font-semibold mb-4">
                      ✓ Your subscription is active and renews automatically each month.
                    </p>
                    <p className="text-sm text-green-800 mb-4">
                      To manage your subscription, billing, or cancel, please contact our support team.
                    </p>
                    <button
                      onClick={() => (window.location.href = '/dashboard')}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Continue to Dashboard
                    </button>
                  </div>
                )}

                {/* Help Section */}
                <div className="bg-gray-50 rounded-lg p-6 mt-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Need Help?</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    For billing questions, subscription changes, or to cancel your subscription, contact our support team.
                  </p>
                  <a
                    href="mailto:support@gymretention.com"
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    support@gymretention.com
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
