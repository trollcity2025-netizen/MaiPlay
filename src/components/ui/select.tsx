import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select
    className={cn(
      'flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-white',
      'focus:outline-none focus:ring-2 focus:ring-primary-red',
      className
    )}
    ref={ref}
    {...props}
  />
))
Select.displayName = 'Select'

export { Select }
