interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  className?: string
}

export default function Logo({ size = 'md', variant = 'full', className = '' }: LogoProps) {
  const sizes = { sm: 32, md: 44, lg: 56 }
  const iconSize = sizes[size]

  const icon = (
    <img
      src="/logo.png"
      alt="OnboardEase logo"
      width={iconSize}
      height={iconSize}
      style={{ objectFit: 'contain' }}
    />
  )

  if (variant === 'icon') return <span className={className}>{icon}</span>

  const textSizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      {icon}
      <span className={`font-bold text-brown-900 ${textSizes[size]}`}>
        Onboard<span className="text-brown-500">Ease</span>
      </span>
    </span>
  )
}
