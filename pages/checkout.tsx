import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import Head from 'next/head';

interface AuthSession {
  gym_name: string;
  email: string;
}

const PRICING = [
  {
    id: 'starter',
    name: 'Starter',
    price: 39.95,
    currency: '£',
    members: '< 500',
    features: [
      'Up to 500 members',
      'At-risk member detection',
      'Basic onboarding stages',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 89.95,
    currency: '£',
    members: '< 2,000',
    features: [
      'Up to 2,000 members',
      'All Starter features',
      'Advanced analytics',
      'Priority support',
      'Custom scripts',
    ],
    popular: true,
  },
];

const ENTERPRISE = {
  id: 'enterprise',
  name: 'Enterprise',
  members: '2,000+',
  features: [
    'Unlimited members',
    'All Pro features',
    'Dedicated support',
    'Custom integrations',
    'SLA guarantee',
    'Advanced reporting',
  ],
};

export default function Checkout() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/verify')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setSession(data.session);
        } else {
          window.location.href = '/auth/login';
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (tier: string) => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error: redirectError } = await stripe.redirectToCheckout({ sessionId });
      if (redirectError) {
        throw new Error(redirectError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

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
        <title>Gym Retention - Pricing</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gym Retention</h1>
            </div>
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/auth/login';
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Title */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">
              Choose the perfect plan for your gym. Billed monthly.
            </p>
            {session && (
              <p className="text-sm text-gray-500 mt-2">
                Signing up as <strong>{session.gym_name}</strong>
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-16">
            {PRICING.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-lg shadow-lg overflow-hidden transition transform ${
                  plan.popular ? 'md:scale-105 ring-2 ring-blue-600' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold">
                    Most Popular
                  </div>
                )}

                <div className={`p-8 ${plan.popular ? 'bg-blue-600 text-white' : 'bg-white'}`}>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`text-sm mb-6 ${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                    Up to {plan.members} members
                  </p>

                  <div className="mb-6">
                    <span className="text-5xl font-bold">{plan.currency}{plan.price.toFixed(2)}</span>
                    <span className={`text-sm ${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                      /month
                    </span>
                  </div>

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={processing || selectedTier === plan.id}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition mb-6 ${
                      plan.popular
                        ? 'bg-white text-blue-600 hover:bg-blue-50 disabled:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400'
                    }`}
                  >
                    {processing && selectedTier === plan.id ? 'Processing...' : 'Get Started'}
                  </button>
                </div>

                <div className={`px-8 py-6 ${plan.popular ? 'bg-blue-500' : 'bg-gray-50'}`}>
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg
                          className={`h-5 w-5 mr-3 flex-shrink-0 ${
                            plan.popular ? 'text-white' : 'text-green-600'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className={plan.popular ? 'text-white' : 'text-gray-700'}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg p-12 text-white">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-4">{ENTERPRISE.name}</h3>
                  <p className="text-slate-300 text-lg mb-6">
                    For gyms with <strong>2,000+ members</strong> or custom requirements
                  </p>
                  <ul className="space-y-3 mb-8">
                    {ENTERPRISE.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="h-5 w-5 mr-3 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-slate-400 text-sm">Custom pricing based on your needs</p>
                </div>
                <div className="bg-white bg-opacity-5 rounded-lg p-8 backdrop-blur">
                  <h4 className="text-xl font-bold mb-4">Get a Custom Quote</h4>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const subject = `Enterprise Inquiry - ${formData.get('gym_name')}`;
                      const body = `Name: ${formData.get('contact_name')}%0AEmail: ${formData.get('email')}%0AGym Name: ${formData.get('gym_name')}%0AMember Count: ${formData.get('member_count')}%0A%0AMessage:%0A${formData.get('message')}`;
                      window.location.href = `mailto:sales@gymretention.com?subject=${encodeURIComponent(subject)}&body=${body}`;
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium mb-1">Gym Name</label>
                      <input
                        type="text"
                        name="gym_name"
                        required
                        placeholder="Your gym name"
                        className="w-full px-3 py-2 bg-white bg-opacity-10 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Contact Name</label>
                      <input
                        type="text"
                        name="contact_name"
                        required
                        placeholder="Your name"
                        className="w-full px-3 py-2 bg-white bg-opacity-10 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 bg-white bg-opacity-10 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Member Count</label>
                      <input
                        type="number"
                        name="member_count"
                        required
                        placeholder="e.g., 3500"
                        className="w-full px-3 py-2 bg-white bg-opacity-10 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Message (Optional)</label>
                      <textarea
                        name="message"
                        placeholder="Tell us about your needs..."
                        rows={3}
                        className="w-full px-3 py-2 bg-white bg-opacity-10 border border-slate-600 rounded text-white placeholder-slate-400 focus:border-blue-400 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded transition"
                    >
                      Request Quote
                    </button>
                  </form>
                  <p className="text-xs text-slate-400 mt-4 text-center">
                    We'll get back to you within 24 hours
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Can I upgrade my plan?</h4>
                <p className="text-gray-600">
                  Yes, you can upgrade at any time. Your subscription will be prorated based on
                  the remaining days in your billing cycle.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Is there a free trial?</h4>
                <p className="text-gray-600">
                  Contact our team for a custom trial period based on your gym's needs.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">What about larger gyms?</h4>
                <p className="text-gray-600">
                  For gyms with more than 2,000 members, we offer custom Enterprise pricing.
                  Contact us for a quote.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
