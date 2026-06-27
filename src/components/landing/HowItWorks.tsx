import { Link } from 'react-router-dom'
import { Building2, FileUp, UserPlus, Rocket, ArrowRight } from 'lucide-react'

const steps = [
  {
    number: '01',
    icon: <Building2 size={28} />,
    title: 'Set Up Your Company',
    description: 'Complete our 5-step wizard. Add your company info, team size, industry, and connect your existing tools. Takes under 15 minutes.',
    detail: ['Add company details', 'Select your industry', 'Connect integrations', 'Choose role templates'],
    color: 'from-brown-500 to-brown-600',
  },
  {
    number: '02',
    icon: <FileUp size={28} />,
    title: 'Upload Your Documents',
    description: 'Upload your existing HR documents, policies, and handbooks. Our AI Document Intelligence Engine does the rest.',
    detail: ['Policy documents', 'Employee handbook', 'Compliance materials', 'Role descriptions'],
    color: 'from-amber-500 to-orange-500',
  },
  {
    number: '03',
    icon: <UserPlus size={28} />,
    title: 'Add New Hires',
    description: 'Add a new hire and our AI instantly creates a personalized 30-day roadmap, matches a compatible buddy, and provisions all tool access.',
    detail: ['Auto-generated roadmap', 'Smart buddy match', 'Tool provisioning', 'Welcome email sent'],
    color: 'from-green-500 to-teal-500',
  },
  {
    number: '04',
    icon: <Rocket size={28} />,
    title: 'Track & Optimize',
    description: 'Monitor real-time progress, receive AI-powered alerts for at-risk hires, and continuously improve your onboarding process.',
    detail: ['Real-time dashboard', 'Risk alerts', 'Engagement metrics', 'Continuous improvement'],
    color: 'from-purple-500 to-indigo-500',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28" style={{ background: '#E0EFFD' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-brown-500/10 text-brown-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
            How It Works
          </div>
          <h2 className="section-title">From setup to productive in 4 steps</h2>
          <p className="section-subtitle">
            OnboardEase removes every friction point between "first day" and "fully productive" — automatically.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`flex flex-col lg:flex-row gap-6 items-start ${i % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
            >
              {/* Step card */}
              <div className="flex-1 bg-white rounded-2xl p-6 lg:p-8 border border-brown-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white flex-shrink-0`}>
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl font-black text-brown-200">{step.number}</span>
                      <h3 className="text-xl font-bold text-brown-900">{step.title}</h3>
                    </div>
                    <p className="text-brown-600 leading-relaxed mb-4">{step.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {step.detail.map(d => (
                        <span key={d} className="inline-flex items-center gap-1 bg-brown-50 text-brown-700 text-xs font-medium px-3 py-1.5 rounded-full border border-brown-200">
                          <span className="w-1.5 h-1.5 bg-brown-400 rounded-full" />
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
