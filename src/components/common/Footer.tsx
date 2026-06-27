import { useState } from 'react'
import Logo from './Logo'
import { Twitter, Linkedin, Github, Mail, X, Clock } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  const [showDialog, setShowDialog] = useState(false)
  const [clickedItem, setClickedItem] = useState('')

  const handleLinkClick = (item: string) => {
    setClickedItem(item)
    setShowDialog(true)
  }

  const links = {
    Product: ['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'],
    Company: ['About Us', 'Blog', 'Careers', 'Press Kit', 'Contact'],
    Resources: ['Documentation', 'Help Center', 'Community', 'Webinars', 'Templates'],
    Legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR', 'Security'],
  }

  return (
    <footer className="bg-brown-900 text-white">
      {/* Coming Soon Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setShowDialog(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-brown-100 flex items-center justify-center mx-auto mb-4">
              <Clock size={26} className="text-brown-600" />
            </div>
            <h3 className="text-lg font-bold text-brown-900 mb-2">{clickedItem}</h3>
            <p className="text-brown-500 text-sm leading-relaxed mb-6">
              These details can be configured later. We're still building out this section — check back soon!
            </p>
            <button
              onClick={() => setShowDialog(false)}
              className="w-full bg-brown-700 hover:bg-brown-900 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Got it
            </button>
            <button
              onClick={() => setShowDialog(false)}
              className="absolute top-4 right-4 text-brown-300 hover:text-brown-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <Logo size="md" className="mb-4" />
            <p className="text-brown-300 text-sm leading-relaxed mb-6">
              Effortless onboarding for growing teams. Get new hires productive in 48 hours with AI-powered workflows.
            </p>
            <div className="flex gap-4">
              {[
                { icon: <Twitter size={18} /> },
                { icon: <Linkedin size={18} /> },
                { icon: <Github size={18} /> },
                { icon: <Mail size={18} /> },
              ].map((social, i) => (
                <button
                  key={i}
                  onClick={() => handleLinkClick(['Twitter', 'LinkedIn', 'GitHub', 'Email'][i])}
                  className="w-9 h-9 rounded-lg bg-brown-800 flex items-center justify-center text-brown-300 hover:bg-brown-500 hover:text-white transition-all duration-200"
                >
                  {social.icon}
                </button>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4 text-sm">{category}</h4>
              <ul className="space-y-2.5">
                {items.map(item => (
                  <li key={item}>
                    <button
                      onClick={() => handleLinkClick(item)}
                      className="text-brown-300 hover:text-white text-sm transition-colors text-left"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-brown-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-brown-400 text-sm">
            © {currentYear} OnboardEase. Built for Youth Code x AI Hackathon.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-brown-400 text-sm">AI-powered onboarding for growing teams</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
