import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.ComponentProps<'div'> {
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

const sizeClasses = {
  xs: 'size-6',
  sm: 'size-8',
  default: 'size-10',
  lg: 'size-12',
  xl: 'size-16',
}

function Avatar({ className, size = 'default', ...props }: AvatarProps) {
  return (
    <div
      data-slot="avatar"
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

interface AvatarImageProps extends React.ComponentProps<'img'> {}

function AvatarImage({ className, src, alt, ...props }: AvatarImageProps) {
  const [hasError, setHasError] = React.useState(false)

  if (hasError || !src) {
    return null
  }

  return (
    <img
      data-slot="avatar-image"
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  )
}

interface AvatarFallbackProps extends React.ComponentProps<'div'> {}

function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        'bg-muted text-muted-foreground flex size-full items-center justify-center rounded-full font-medium',
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }


