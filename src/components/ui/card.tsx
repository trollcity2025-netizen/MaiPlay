import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-lg border border-border bg-surface', className)}
    {...props}
  />
))
Card.displayName = 'Card'

export { Card }