import { Star, Quote } from 'lucide-react'
import { useState } from 'react'

const testimonials = [
  {
    quote: "We went from spending 3 full days onboarding each engineer to having them contributing PRs on day 2. OnboardEase is genuinely magic for a 12-person startup.",
    name: "Sarah Chen",
    role: "CTO",
    company: "BuildFast Labs",
    initials: "SC",
    color: "#2B85DC",
    stars: 5,
  },
  {
    quote: "The AI assistant replaced 80% of the 'dumb questions' that were clogging up our Slack. New hires feel supported, and the team stays focused.",
    name: "Marcus Johnson",
    role: "Head of People",
    company: "Velocity Health",
    initials: "MJ",
    color: "#4EA0EB",
    stars: 5,
  },
  {
    quote: "Setting up took 11 minutes. We connected Slack, GitHub, and Notion, and it automatically generated a perfect dev onboarding flow. I was blown away.",
    name: "Priya Sharma",
    role: "Founder & CEO",
    company: "DataSprint",
    initials: "PS",
    color: "#7DBCF5",
    stars: 5,
  },
  {
    quote: "Our 90-day retention jumped from 71% to 89% in the first quarter using OnboardEase. The buddy matching feature alone is worth the price.",
    name: "Tom Ramirez",
    role: "VP Operations",
    company: "ScaleForce",
    initials: "TR",
    color: "#B3D8FF",
    stars: 5,
  },
  {
    quote: "I uploaded our 80-page employee handbook and it turned it into 45 actionable onboarding tasks in 3 minutes. Absolutely incredible.",
    name: "Aisha Williams",
    role: "HR Manager",
    company: "NexGen Fintech",
    initials: "AW",
    color: "#1F6EC4",
    stars: 5,
  },
  {
    quote: "We're a 7-person team with no HR department. OnboardEase lets us onboard like a company 10x our size. Couldn't imagine doing it without it.",
    name: "David Park",
    role: "CEO",
    company: "Clarity AI",
    initials: "DP",
    color: "#1558A8",
    stars: 5,
  },
]

export default function Testimonials() {
  const [active, setActive] = useState(0)

  return (
    <section id="testimonials" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 text-sm font-medium px-4 py-2 rounded-full mb-4 border border-yellow-200">
            <Star size={14} className="fill-yellow-500 text-yellow-500" />
            Customer Stories
          </div>
          <h2 className="section-title">Loved by 500+ startup teams</h2>
          <p className="section-subtitle">
            From solo founders to 50-person teams — OnboardEase helps every startup onboard faster.
          </p>
        </div>

        {/* Featured testimonial */}
        <div className="bg-gradient-to-br from-brown-500 to-brown-700 rounded-2xl p-8 lg:p-12 mb-8 text-white relative overflow-hidden">
          <Quote size={80} className="absolute top-4 right-4 text-white/10" />
          <div className="relative">
            <div className="flex items-center gap-1 mb-6">
              {Array(testimonials[active].stars).fill(0).map((_, i) => (
                <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <blockquote className="text-xl lg:text-2xl font-medium leading-relaxed mb-8 max-w-3xl">
              "{testimonials[active].quote}"
            </blockquote>
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ background: 'rgba(255,255,255,0.2)' }}
              >
                {testimonials[active].initials}
              </div>
              <div>
                <p className="font-bold text-white">{testimonials[active].name}</p>
                <p className="text-white/70 text-sm">{testimonials[active].role} at {testimonials[active].company}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <button
              key={t.name}
              onClick={() => setActive(i)}
              className={`card text-left hover:shadow-md transition-all duration-200 ${
                active === i ? 'border-brown-400 ring-2 ring-brown-300/30' : ''
              }`}
            >
              <div className="flex items-center gap-1 mb-3">
                {Array(t.stars).fill(0).map((_, j) => (
                  <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-brown-700 text-sm leading-relaxed mb-4 line-clamp-3">"{t.quote}"</p>
              <div className="flex items-center gap-3 mt-auto">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: t.color }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="font-semibold text-brown-900 text-sm">{t.name}</p>
                  <p className="text-brown-500 text-xs">{t.role} · {t.company}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { value: '500+', label: 'Startup Customers' },
            { value: '12,000+', label: 'New Hires Onboarded' },
            { value: '4.9/5', label: 'Customer Rating' },
            { value: '<5%', label: 'Monthly Churn' },
          ].map(stat => (
            <div key={stat.label} className="text-center bg-brown-50 rounded-xl p-5 border border-brown-200">
              <p className="text-3xl font-black text-brown-700 mb-1">{stat.value}</p>
              <p className="text-brown-500 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
