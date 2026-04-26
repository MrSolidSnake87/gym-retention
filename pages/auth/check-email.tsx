import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function CheckEmailPage() {
  const router = useRouter();
  const email = router.query.email as string;
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <>
      <Head><title>Verify your email — Gym Retention</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            {/* Email icon */}
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your inbox</h1>
            <p className="text-gray-600 mb-2">
              We sent a verification link to:
            </p>
            {email && (
              <p className="font-semibold text-gray-900 mb-6">{email}</p>
            )}
            <p className="text-gray-500 text-sm mb-8">
              Click the link in the email to verify your account and continue to checkout.
              The link expires in 24 hours.
            </p>

            <div className="border-t border-gray-200 pt-6">
              <p className="text-gray-500 text-sm mb-3">Didn&apos;t receive it? Check your spam folder, or:</p>
              {resendSent ? (
                <p className="text-green-600 font-medium text-sm">✓ New verification email sent!</p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading || !email}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm underline disabled:text-gray-400"
                >
                  {resendLoading ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>

            <div className="mt-6">
              <a href="/auth/login" className="text-gray-400 hover:text-gray-600 text-sm">
                ← Back to login
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
