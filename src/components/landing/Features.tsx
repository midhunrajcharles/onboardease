import {
  Zap, Bot, Users, BarChart3, FileCheck, Settings2,
  BookOpen, Shield, MessageSquare, Map, CalendarClock
} from 'lucide-react'

const features = [
  {
    icon: <Zap size={24} />,
    title: 'Quick Company Setup',
    description: 'Configure your entire onboarding system in under 15 minutes with smart defaults and industry templates.',
    color: 'bg-yellow-50 text-yellow-700',
  },
  {
    icon: <Bot size={24} />,
    title: 'AI-Powered Assistant',
    description: '24/7 AI chatbot trained on your company policies. Answers questions, escalates issues, and learns over time.',
    color: 'bg-purple-50 text-purple-700',
  },
  {
    icon: <Map size={24} />,
    title: 'Smart Roadmap Generator',
    description: 'AI analyzes uploaded company documents and generates personalized onboarding roadmaps for each role.',
    color: 'bg-blue-50 text-blue-700',
  },
  {
    icon: <Users size={24} />,
    title: 'Smart Buddy Matching',
    description: 'AI pairs new hires with compatible mentors based on role, experience, and availability for effective guidance.',
    color: 'bg-green-50 text-green-700',
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'Progress Analytics',
    description: 'Real-time dashboards showing completion rates, engagement scores, and predictive risk indicators.',
    color: 'bg-orange-50 text-orange-700',
  },
  {
    icon: <Settings2 size={24} />,
    title: 'Integration Hub',
    description: 'Auto-provision accounts in Slack, GitHub, Google Workspace, and 20+ tools the moment a hire is added.',
    color: 'bg-pink-50 text-pink-700',
  },
  {
    icon: <BookOpen size={24} />,
    title: 'Knowledge Base',
    description: 'Searchable repository of policies, FAQs, and guides organized by role with multimedia support.',
    color: 'bg-teal-50 text-teal-700',
  },
  {
    icon: <FileCheck size={24} />,
    title: 'Compliance Tracking',
    description: 'Automated tracking of required documents, training completions, and compliance deadlines with audit trails.',
    color: 'bg-red-50 text-red-700',
  },
  {
    icon: <MessageSquare size={24} />,
    title: 'Feedback Loops',
    description: 'Automated milestone surveys, feedback analysis, and continuous improvement recommendations.',
    color: 'bg-indigo-50 text-indigo-700',
  },
  {
    icon: <CalendarClock size={24} />,
    title: 'Automated Task Scheduling',
    description: 'AI schedules onboarding tasks in the right order and at the right time — no manual planning needed.',
    color: 'bg-cyan-50 text-cyan-700',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-brown-100 text-brown-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
            <Zap size={14} />
            Everything you need
          </div>
          <h2 className="section-title">Built for startup speed</h2>
          <p className="section-subtitle">
            Every feature is designed to eliminate manual work and get new hires contributing faster — without requiring an HR team.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="card-hover group"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                {feature.icon}
              </div>
              <h3 className="font-bold text-brown-900 text-lg mb-2">{feature.title}</h3>
              <p className="text-brown-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-brown-50 to-brown-100 rounded-2xl p-10 border border-brown-200">
          <h3 className="text-2xl font-bold text-brown-900 mb-3">Document Intelligence Engine</h3>
          <p className="text-brown-600 max-w-xl mx-auto mb-6">
            Upload your company policies and HR documents — our AI automatically extracts onboarding requirements and generates role-specific task schedules in minutes.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {['Policy PDFs', 'Employee Handbooks', 'Compliance Docs', 'Role Descriptions', 'Training Materials'].map(tag => (
              <span key={tag} className="badge-brown py-1.5 px-3">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
