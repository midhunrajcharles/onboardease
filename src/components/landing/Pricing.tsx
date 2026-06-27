import { Link } from 'react-router-dom'
import { CheckCircle, Zap, ArrowRight, Star } from 'lucide-react'
import { useState } from 'react'

const plans = [
  {
    name: 'Starter',
    price: { monthly: 49, annual: 39 },
    description: 'Perfect for early-stage startups just getting started with structured onboarding.',
    badge: null,
    features: [
      'Up to 10 employees',
      'Basic templates & workflows',
      '3 core integrations',
      'AI assistant (basic)',
      'Email support',
      'Compliance tracking',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: { monthly: 149, annual: 119 },
    description: 'For scaling startups that need advanced AI features and full integration coverage.',
    badge: 'Most Popular',
    features: [
      'Up to 50 employees',
      'Advanced AI features',
      'All integrations (20+)',
      'Document Intelligence Engine',
      'Smart buddy matching',
      'Custom branding',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Scale',
    price: { monthly: 299, annual: 239 },
    description: 'For established startups that need unlimited scale and a dedicated success team.',
    badge: null,
    features: [
      'Unlimited employees',
      'All Growth features',
      'Dedicated success manager',
      'Custom integrations',
      'White-label options',
      'Advanced reporting',
      'SLA guarantee',
      'On-boarding workshops',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="py-20 lg:py-28" style={{ background: '#E0EFFD' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-brown-500/10 text-brown-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
            <Zap size={14} />
            Simple Pricing
          </div>
          <h2 className="section-title">Start free, grow with confidence</h2>
          <p className="section-subtitle">
            No hidden fees. Cancel anytime. 14-day free trial on all plans.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-brown-200 rounded-xl p-1 mt-2">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                !annual ? 'bg-brown-500 text-white shadow-sm' : 'text-brown-600 hover:text-brown-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                annual ? 'bg-brown-500 text-white shadow-sm' : 'text-brown-600 hover:text-brown-900'
              }`}
            >
              Annual
              <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl overflow-hidden transition-all duration-200 ${
                plan.highlighted
                  ? 'bg-brown-900 text-white shadow-2xl scale-[1.02] border-2 border-brown-500'
                  : 'bg-white border border-brown-200 shadow-sm hover:shadow-md'
              }`}
            >
              {plan.badge && (
                <div className="absolute top-0 left-0 right-0 flex justify-center">
                  <span className="bg-brown-500 text-white text-xs font-bold px-4 py-1.5 rounded-b-lg flex items-center gap-1">
                    <Star size={11} className="fill-yellow-400 text-yellow-400" />
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className={`p-8 ${plan.badge ? 'pt-12' : ''}`}>
                <h3 className={`text-xl font-bold mb-1 ${plan.highlighted ? 'text-white' : 'text-brown-900'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 leading-relaxed ${plan.highlighted ? 'text-brown-300' : 'text-brown-500'}`}>
                  {plan.description}
                </p>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className={`text-5xl font-black ${plan.highlighted ? 'text-white' : 'text-brown-900'}`}>
                      ${annual ? plan.price.annual : plan.price.monthly}
                    </span>
                    <span className={`text-sm pb-2 ${plan.highlighted ? 'text-brown-400' : 'text-brown-500'}`}>/mo</span>
                  </div>
                  {annual && (
                    <p className={`text-xs mt-1 ${plan.highlighted ? 'text-brown-400' : 'text-brown-500'}`}>
                      Billed annually · Save ${(plan.price.monthly - plan.price.annual) * 12}/yr
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle
                        size={16}
                        className={`flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-green-400' : 'text-green-600'}`}
                      />
                      <span className={`text-sm ${plan.highlighted ? 'text-brown-200' : 'text-brown-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div className="bg-white rounded-2xl p-8 border border-brown-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-brown-900 mb-2">Enterprise</h3>
            <p className="text-brown-600 text-sm max-w-lg">
              Need volume discounts, custom features, on-premise deployment, or white-label options? Let's talk about your specific requirements.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <a href="#" className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap">
              Request Demo
            </a>
            <a href="#" className="btn-primary inline-flex items-center gap-2 whitespace-nowrap">
              Contact Sales <ArrowRight size={16} />
            </a>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-10 text-center">
          <div className="flex flex-wrap gap-6 justify-center items-center text-brown-400 text-sm font-medium">
            {['SOC 2 Type II', 'GDPR Compliant', 'CCPA Ready', '99.9% Uptime SLA', 'SSO & MFA'].map(badge => (
              <span key={badge} className="flex items-center gap-1.5">
                <CheckCircle size={14} className="text-green-500" />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
