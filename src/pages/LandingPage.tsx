import Navbar from '../components/common/Navbar'
import Footer from '../components/common/Footer'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import Testimonials from '../components/landing/Testimonials'
import Pricing from '../components/landing/Pricing'
import AIChatWidget from '../components/common/AIChatWidget'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar variant="landing" />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />

        {/* Final CTA section */}
        <section className="py-20 bg-brown-900 text-white text-center">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-4xl font-extrabold mb-4">
              Ready to transform your onboarding?
            </h2>
            <p className="text-brown-300 text-lg mb-8">
              Get new hires productive in 48 hours with AI-powered onboarding workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/admin"
                className="border border-white/30 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors inline-flex items-center gap-2 justify-center"
              >
                View Live Demo
              </Link>
            </div>
            <p className="text-brown-400 text-sm mt-4">14-day free trial · Setup in 15 minutes · Cancel anytime</p>
          </div>
        </section>
      </main>
      <Footer />
      <AIChatWidget />
    </div>
  )
}
