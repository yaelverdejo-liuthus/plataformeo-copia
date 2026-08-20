import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Skeleton animado. Nunca spinner de página completa (§7 de la spec). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function SkeletonLista({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonKPIs({ n = 6 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Estado vacío con acción. Nunca una pantalla en blanco:
 * "Sin leads hoy — Registrar el primero" (§7 de la spec).
 */
export function Vacio({
  icono,
  titulo,
  descripcion,
  accion,
}: {
  icono: ReactNode
  titulo: string
  descripcion?: string
  accion?: ReactNode
}) {
  return (
    // Sin animación de entrada, a propósito. Este componente existe para
    // que nunca haya una pantalla vacía; si para verse dependiera de que
    // arranque una animación, sería justo lo que vino a evitar.
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icono}
      </div>
      <p className="text-lg font-medium text-fg">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-xs text-sm text-fg-muted">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  )
}

/** Error de carga, con reintento. Tampoco se deja en blanco. */
export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    // Tampoco se anima, por lo mismo: si un mensaje de error dependiera de
    // una animación para verse, el peor caso sería una pantalla vacía justo
    // cuando algo ya salió mal.
    <div className="rounded-2xl border border-danger/25 bg-danger/8 p-4">
      <p className="text-base font-medium text-danger">No se pudo cargar</p>
      <p className="mt-1 text-sm text-fg-muted">{mensaje}</p>
      {onReintentar && (
        <button
          onClick={onReintentar}
          className="mt-3 text-sm font-medium text-danger underline underline-offset-4"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
