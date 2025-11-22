'use client'

interface VoxelCubeProps {
  size?: number
  className?: string
}

export function VoxelCube({ size = 100, className = '' }: VoxelCubeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`drop-shadow-2xl ${className}`}
    >
      {/* Top Face (Blue) - 3x3 grid */}
      <g transform="translate(20, 10)">
        {/* Row 1 - Top */}
        <rect x="0" y="0" width="20" height="20" fill="#60A5FA" opacity="0.9" />
        <rect x="20" y="0" width="20" height="20" fill="#3B82F6" opacity="0.95" />
        <rect x="40" y="0" width="20" height="20" fill="#2563EB" opacity="1" />
        
        {/* Row 2 - Middle */}
        <rect x="0" y="20" width="20" height="20" fill="#93C5FD" opacity="0.85" />
        <rect x="20" y="20" width="20" height="20" fill="#60A5FA" opacity="0.9" />
        <rect x="40" y="20" width="20" height="20" fill="#3B82F6" opacity="0.95" />
        
        {/* Row 3 - Bottom */}
        <rect x="0" y="40" width="20" height="20" fill="#DBEAFE" opacity="0.8" />
        <rect x="20" y="40" width="20" height="20" fill="#93C5FD" opacity="0.85" />
        <rect x="40" y="40" width="20" height="20" fill="#60A5FA" opacity="0.9" />
      </g>

      {/* Left Face (Pink/Magenta) - Isometric projection */}
      <g>
        {/* Row 1 */}
        <polygon points="10,50 20,40 20,60 10,70" fill="#F472B6" opacity="0.9" />
        <polygon points="20,40 30,30 30,50 20,60" fill="#EC4899" opacity="0.95" />
        <polygon points="30,30 40,20 40,40 30,50" fill="#DB2777" opacity="1" />
        
        {/* Row 2 */}
        <polygon points="10,70 20,60 20,80 10,90" fill="#FBCFE8" opacity="0.85" />
        <polygon points="20,60 30,50 30,70 20,80" fill="#F472B6" opacity="0.9" />
        <polygon points="30,50 40,40 40,60 30,70" fill="#EC4899" opacity="0.95" />
        
        {/* Row 3 */}
        <polygon points="10,90 20,80 20,100 10,110" fill="#FCE7F3" opacity="0.8" />
        <polygon points="20,80 30,70 30,90 20,100" fill="#FBCFE8" opacity="0.85" />
        <polygon points="30,70 40,60 40,80 30,90" fill="#F472B6" opacity="0.9" />
      </g>

      {/* Right Face (Orange) - Isometric projection */}
      <g>
        {/* Row 1 */}
        <polygon points="60,40 70,50 50,50 50,30" fill="#FB923C" opacity="0.9" />
        <polygon points="70,30 80,40 60,40 60,20" fill="#F97316" opacity="0.95" />
        <polygon points="80,20 90,30 70,30 70,10" fill="#EA580C" opacity="1" />
        
        {/* Row 2 */}
        <polygon points="60,60 70,70 50,70 50,50" fill="#FED7AA" opacity="0.85" />
        <polygon points="70,50 80,60 60,60 60,40" fill="#FB923C" opacity="0.9" />
        <polygon points="80,40 90,50 70,50 70,30" fill="#F97316" opacity="0.95" />
        
        {/* Row 3 */}
        <polygon points="60,80 70,90 50,90 50,70" fill="#FFEDD5" opacity="0.8" />
        <polygon points="70,70 80,80 60,80 60,60" fill="#FED7AA" opacity="0.85" />
        <polygon points="80,60 90,70 70,70 70,50" fill="#FB923C" opacity="0.9" />
      </g>

      {/* Edge lines for 3D effect */}
      <path
        d="M 20 10 L 60 10 L 80 30 L 80 70 L 60 90 L 20 90 L 10 70 L 10 30 Z"
        fill="none"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.5"
      />
    </svg>
  )
}

