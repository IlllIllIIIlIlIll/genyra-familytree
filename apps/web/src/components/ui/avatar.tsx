import { cn } from '@/lib/utils'
import Image from 'next/image'

interface AvatarProps {
  src?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

const pixelMap = { sm: 32, md: 40, lg: 56, xl: 80 }

function getInitials(name: string): string {
  const parts = name.trim().split(' ')
  const first = parts[0]?.[0] ?? ''
  const last = parts[parts.length - 1]?.[0] ?? ''
  return (first + (parts.length > 1 ? last : '')).toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const px = pixelMap[size]

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-brand-100 text-brand-600 font-semibold shrink-0 ring-2 ring-white',
        sizeMap[size],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt={name} width={px} height={px} className="object-cover w-full h-full" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  )
}
