import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/80" onClick={() => onOpenChange?.(false)} />
      {children}
    </div>
  )
}

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('z-50 relative bg-surface rounded-lg shadow-lg max-w-lg w-full mx-4', className)}
      {...props}
    />
  )
)
DialogContent.displayName = 'DialogContent'

export interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)
DialogHeader.displayName = 'DialogHeader'

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-white', className)}
      {...props}
    />
  )
)
DialogTitle.displayName = 'DialogTitle'

export interface DialogTriggerProps extends React.HTMLAttributes<HTMLButtonElement> {}

export const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('', className)}
      {...props}
    />
  )
)
DialogTrigger.displayName = 'DialogTrigger'

export interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex justify-end gap-2 p-6 pt-0', className)}
      {...props}
    />
  )
)
DialogFooter.displayName = 'DialogFooter'