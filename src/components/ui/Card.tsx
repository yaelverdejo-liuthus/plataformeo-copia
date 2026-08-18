import type { HTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-surface p-4 shadow-card', className)}
      {...props}
    />
  )
}

/** Card que aparece con entrada escalonada dentro de una lista. */
export function CardAnimada({
  indice = 0,
  className,
  children,
  onClick,
}: {
  indice?: number
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        delay: Math.min(indice, 8) * 0.03,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-line bg-surface p-4 shadow-card',
        onClick && 'cursor-pointer transition-colors duration-150 hover:border-line-strong hover:bg-surface-2',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}

export function TituloSeccion({
  children,
  accion,
}: {
  children: ReactNode
  accion?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
        {children}
      </h2>
      {accion}
    </div>
  )
}
