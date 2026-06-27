import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, Plug, LayoutTemplate, Rocket, CheckCircle,
  ArrowRight, ArrowLeft, Upload, Sparkles
} from 'lucide-react'

const steps = [
  { id: 1, label: 'Company Info', icon: <Building2 size={18} /> },
  { id: 2, label: 'Team & Industry', icon: <Users size={18} /> },
  { id: 3, label: 'Integrations', icon: <Plug size={18} /> },
  { id: 4, label: 'Templates', icon: <LayoutTemplate size={18} /> },
  { id: 5, label: 'Launch', icon: <Rocket size={18} /> },
]

const industries = [
  'SaaS / Software', 'FinTech', 'HealthTech', 'E-commerce',
  'EdTech', 'Marketplace', 'B2B Services', 'Hardware / IoT', 'Other',
]

const integrations = [
  { id: 'slack', name: 'Slack', color: '#4A154B', emoji: '💬' },
  { id: 'google', name: 'Google Workspace', color: '#4285F4', emoji: '📧' },
  { id: 'github', name: 'GitHub', color: '#24292e', emoji: '🐙' },
  { id: 'notion', name: 'Notion', color: '#000', emoji: '📝' },
  { id: 'jira', name: 'Jira', color: '#0052CC', emoji: '🎯' },
  { id: 'zoom', name: 'Zoom', color: '#2D8CFF', emoji: '📹' },
  { id: 'ms-teams', name: 'MS Teams', color: '#5059C9', emoji: '🔵' },
  { id: 'asana', name: 'Asana', color: '#FC636B', emoji: '✅' },
  { id: 'linear', name: 'Linear', color: '#5E6AD2', emoji: '📐' },
]

const roleTemplates = [
  { id: 'dev', icon: '💻', label: 'Software Developer', desc: '45 tasks · 30 days' },
  { id: 'sales', icon: '📊', label: 'Sales Representative', desc: '38 tasks · 21 days' },
  { id: 'marketing', icon: '📣', label: 'Marketing Manager', desc: '32 tasks · 21 days' },
  { id: 'design', icon: '🎨', label: 'UX/UI Designer', desc: '28 tasks · 14 days' },
  { id: 'ops', icon: '⚙️', label: 'Operations Manager', desc: '40 tasks · 30 days' },
  { id: 'cs', icon: '🤝', label: 'Customer Success', desc: '35 tasks · 21 days' },
  { id: 'data', icon: '📈', label: 'Data Analyst', desc: '30 tasks · 21 days' },
  { id: 'pm', icon: '🗂️', label: 'Product Manager', desc: '42 tasks · 30 days' },
]

export default function SetupWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(['slack', 'google'])
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>(['dev'])
  const [selectedIndustry, setSelectedIndustry] = useState('SaaS / Software')
  const [formData, setFormData] = useState({ companyName: '', website: '', teamSize: '5-15' })
  const [completing, setCompleting] = useState(false)
  const [complete, setComplete] = useState(false)

  const toggleIntegration = (id: string) => {
    setSelectedIntegrations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleTemplate = (id: string) => {
    setSelectedTemplates(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleLaunch = () => {
    setCompleting(true)
    setTimeout(() => {
      setCompleting(false)
      setComplete(true)
      setTimeout(() => navigate('/admin'), 2000)
    }, 2000)
  }

  if (complete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brown-50" style={{ background: '#F0F7FF' }}>
        <div className="text-center animate-bounce-in">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-brown-900 mb-3">🎉 You're all set!</h2>
          <p className="text-brown-600 text-lg mb-2">Your onboarding system is live.</p>
          <p className="text-brown-500 text-sm">Redirecting to your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F7FF' }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Step progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                      step.id < currentStep
                        ? 'bg-green-500 text-white'
                        : step.id === currentStep
                        ? 'bg-brown-500 text-white shadow-lg scale-110'
                        : 'bg-brown-200 text-brown-500'
                    }`}
                  >
                    {step.id < currentStep ? <CheckCircle size={18} /> : step.icon}
                  </div>
                  <span className={`text-xs mt-2 font-medium hidden sm:block ${
                    step.id === currentStep ? 'text-brown-700' : 'text-brown-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                    step.id < currentStep ? 'bg-green-400' : 'bg-brown-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-brown-500 text-sm">Step {currentStep} of {steps.length}</p>
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-brown-200 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-brown-500 to-brown-700 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">{steps[currentStep - 1].label}</h2>
            <p className="text-white/70 text-sm mt-1">
              {currentStep === 1 && 'Tell us about your company to get started.'}
              {currentStep === 2 && 'Help us tailor onboarding for your team size and industry.'}
              {currentStep === 3 && 'Connect the tools your team already uses.'}
              {currentStep === 4 && 'Select role templates to auto-generate onboarding paths.'}
              {currentStep === 5 && "Review your setup and launch when you're ready."}
            </p>
          </div>

          <div className="p-8">
            {/* Step 1: Company Info */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">Company Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Acme Corp"
                    value={formData.companyName}
                    onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">Company Website</label>
                  <input
                    type="url"
                    className="input-field"
                    placeholder="https://yourcompany.com"
                    value={formData.website}
                    onChange={e => setFormData(p => ({ ...p, website: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-2">Company Logo</label>
                  <div className="border-2 border-dashed border-brown-200 rounded-xl p-8 text-center hover:border-brown-400 transition-colors cursor-pointer">
                    <Upload size={28} className="text-brown-400 mx-auto mb-3" />
                    <p className="text-brown-600 text-sm font-medium">Drag and drop or click to upload</p>
                    <p className="text-brown-400 text-xs mt-1">PNG, JPG, SVG up to 5MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Team & Industry */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-3">Team Size</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['1-5', '5-15', '15-30', '30-50', '50+'].map(size => (
                      <button
                        key={size}
                        onClick={() => setFormData(p => ({ ...p, teamSize: size }))}
                        className={`py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all duration-200 ${
                          formData.teamSize === size
                            ? 'border-brown-500 bg-brown-50 text-brown-800'
                            : 'border-brown-200 text-brown-600 hover:border-brown-300'
                        }`}
                      >
                        {size} people
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brown-800 mb-3">Industry</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {industries.map(ind => (
                      <button
                        key={ind}
                        onClick={() => setSelectedIndustry(ind)}
                        className={`py-2.5 px-4 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
                          selectedIndustry === ind
                            ? 'border-brown-500 bg-brown-50 text-brown-800'
                            : 'border-brown-200 text-brown-600 hover:border-brown-300'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Integrations */}
            {currentStep === 3 && (
              <div className="animate-fade-in">
                <p className="text-brown-600 text-sm mb-6">
                  Select the tools your team uses. OnboardEase will automatically provision accounts for new hires.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {integrations.map(int => (
                    <button
                      key={int.id}
                      onClick={() => toggleIntegration(int.id)}
                      className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all duration-200 ${
                        selectedIntegrations.includes(int.id)
                          ? 'border-brown-500 bg-brown-50'
                          : 'border-brown-200 hover:border-brown-300'
                      }`}
                    >
                      <span className="text-2xl">{int.emoji}</span>
                      <div className="text-left">
                        <p className={`font-semibold text-sm ${
                          selectedIntegrations.includes(int.id) ? 'text-brown-800' : 'text-brown-600'
                        }`}>
                          {int.name}
                        </p>
                        {selectedIntegrations.includes(int.id) && (
                          <p className="text-xs text-green-600 font-medium">Connected</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-brown-500 text-xs mt-4 text-center">
                  {selectedIntegrations.length} integration{selectedIntegrations.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            {/* Step 4: Templates */}
            {currentStep === 4 && (
              <div className="animate-fade-in">
                <p className="text-brown-600 text-sm mb-6">
                  Select the roles you typically hire for. AI will generate tailored onboarding paths for each.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {roleTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => toggleTemplate(template.id)}
                      className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                        selectedTemplates.includes(template.id)
                          ? 'border-brown-500 bg-brown-50'
                          : 'border-brown-200 hover:border-brown-300'
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{template.icon}</span>
                      <p className={`font-semibold text-sm mb-1 ${
                        selectedTemplates.includes(template.id) ? 'text-brown-800' : 'text-brown-600'
                      }`}>
                        {template.label}
                      </p>
                      <p className="text-xs text-brown-400">{template.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Review & Launch */}
            {currentStep === 5 && (
              <div className="animate-fade-in space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">You're ready to launch!</p>
                    <p className="text-green-700 text-xs mt-0.5">Review your configuration below, then hit Launch.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Company', value: formData.companyName || 'Your Company', icon: '🏢' },
                    { label: 'Team Size', value: `${formData.teamSize} employees`, icon: '👥' },
                    { label: 'Industry', value: selectedIndustry, icon: '🏭' },
                    { label: 'Integrations', value: `${selectedIntegrations.length} connected`, icon: '🔌' },
                    { label: 'Role Templates', value: `${selectedTemplates.length} selected`, icon: '📋' },
                    { label: 'AI Features', value: 'Fully enabled', icon: '✨' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 bg-brown-50 rounded-xl p-4 border border-brown-100">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="text-xs text-brown-500 font-medium">{item.label}</p>
                        <p className="font-semibold text-brown-900 text-sm">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleLaunch}
                  disabled={completing}
                  className="w-full btn-primary py-4 text-base flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {completing ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Setting up your platform...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Launch OnboardEase
                      <Rocket size={20} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-8 pb-8 flex justify-between">
            {currentStep > 1 ? (
              <button
                onClick={() => setCurrentStep(p => p - 1)}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : <div />}

            {currentStep < 5 && (
              <button
                onClick={() => setCurrentStep(p => p + 1)}
                className="btn-primary inline-flex items-center gap-2"
              >
                Continue <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
