import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type Tono = 'neutro' | 'primario' | 'exito' | 'aviso' | 'peligro' | 'info' | 'acento'

const TONOS: Record<Tono, string> = {
  neutro: 'bg-surface-3 text-fg-muted',
  primario: 'bg-primary/15 text-primary',
  exito: 'bg-success/15 text-success',
  aviso: 'bg-warn/15 text-warn',
  peligro: 'bg-danger/15 text-danger',
  info: 'bg-info/15 text-info',
  acento: 'bg-accent/15 text-accent',
}

export function Badge({
  tono = 'neutro',
  children,
  className,
  punto,
}: {
  tono?: Tono
  children: ReactNode
  className?: string
  punto?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1',
        'text-2xs font-semibold uppercase tracking-wide',
        TONOS[tono],
        className,
      )}
    >
      {punto && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/** Punto de color a secas, para densidad alta en tablas. */
export function Punto({ tono = 'neutro' }: { tono?: Tono }) {
  const color: Record<Tono, string> = {
    neutro: 'bg-fg-subtle',
    primario: 'bg-primary',
    exito: 'bg-success',
    aviso: 'bg-warn',
    peligro: 'bg-danger',
    info: 'bg-info',
    acento: 'bg-accent',
  }
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', color[tono])} />
}
