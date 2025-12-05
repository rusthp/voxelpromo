'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'lg', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { cube: 40, text: 'text-lg' },
    md: { cube: 60, text: 'text-2xl' },
    lg: { cube: 80, text: 'text-3xl' },
    xl: { cube: 120, text: 'text-5xl' }
  }

  const { cube, text } = sizes[size]

  // Isometric transformation values
  const isoAngle = 30
  const scaleX = Math.cos(isoAngle * Math.PI / 180)
  const scaleY = Math.sin(isoAngle * Math.PI / 180)

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* 3D Voxel Cube */}
      <div className="relative" style={{ width: cube, height: cube }}>
        <svg
          width={cube}
          height={cube}
          viewBox="0 0 100 100"
          className="drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
        >
          {/* Top Face (Blue) - 3x3 grid */}
          <g transform="translate(20, 10)">
            {/* Row 1 - Top (darker) */}
            <rect x="0" y="0" width="20" height="20" fill="#2563EB" />
            <rect x="20" y="0" width="20" height="20" fill="#3B82F6" />
            <rect x="40" y="0" width="20" height="20" fill="#60A5FA" />
            
            {/* Row 2 - Middle */}
            <rect x="0" y="20" width="20" height="20" fill="#3B82F6" />
            <rect x="20" y="20" width="20" height="20" fill="#60A5FA" />
            <rect x="40" y="20" width="20" height="20" fill="#93C5FD" />
            
            {/* Row 3 - Bottom (lighter) */}
            <rect x="0" y="40" width="20" height="20" fill="#60A5FA" />
            <rect x="20" y="40" width="20" height="20" fill="#93C5FD" />
            <rect x="40" y="40" width="20" height="20" fill="#DBEAFE" />
          </g>

          {/* Left Face (Pink/Magenta) - Isometric */}
          <g>
            {/* Top row */}
            <polygon points="10,30 20,20 20,40 10,50" fill="#DB2777" />
            <polygon points="20,20 30,10 30,30 20,40" fill="#EC4899" />
            <polygon points="30,10 40,0 40,20 30,30" fill="#F472B6" />
            
            {/* Middle row */}
            <polygon points="10,50 20,40 20,60 10,70" fill="#EC4899" />
            <polygon points="20,40 30,30 30,50 20,60" fill="#F472B6" />
            <polygon points="30,30 40,20 40,40 30,50" fill="#FBCFE8" />
            
            {/* Bottom row */}
            <polygon points="10,70 20,60 20,80 10,90" fill="#F472B6" />
            <polygon points="20,60 30,50 30,70 20,80" fill="#FBCFE8" />
            <polygon points="30,50 40,40 40,60 30,70" fill="#FCE7F3" />
          </g>

          {/* Right Face (Orange) - Isometric */}
          <g>
            {/* Top row */}
            <polygon points="60,10 70,20 50,20 50,0" fill="#EA580C" />
            <polygon points="70,20 80,30 60,30 60,10" fill="#F97316" />
            <polygon points="80,30 90,40 70,40 70,20" fill="#FB923C" />
            
            {/* Middle row */}
            <polygon points="60,30 70,40 50,40 50,20" fill="#F97316" />
            <polygon points="70,40 80,50 60,50 60,30" fill="#FB923C" />
            <polygon points="80,50 90,60 70,60 70,40" fill="#FED7AA" />
            
            {/* Bottom row */}
            <polygon points="60,50 70,60 50,60 50,40" fill="#FB923C" />
            <polygon points="70,60 80,70 60,70 60,50" fill="#FED7AA" />
            <polygon points="80,70 90,80 70,80 70,60" fill="#FFEDD5" />
          </g>

          {/* Edge lines for depth */}
          <path
            d="M 20 10 L 60 10 L 80 30 L 80 70 L 60 90 L 20 90 L 10 70 L 10 30 Z"
            fill="none"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <h1 className={`${text} font-bold text-gray-800 tracking-wider uppercase drop-shadow-lg`}>
          VOXELPROMO
        </h1>
      )}
    </div>
  )
}
