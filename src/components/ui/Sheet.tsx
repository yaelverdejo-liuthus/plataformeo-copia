import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/**
 * Bottom sheet. Los formularios van aquí, nunca en un modal centrado de
 * escritorio metido a fuerza en una pantalla chica (§3.1 del brief).
 *
 * En desktop se convierte en un panel lateral derecho, que aprovecha mejor
 * el espacio que un sheet abajo.
 */
export function Sheet({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  children,
  pie,
}: {
  abierto: boolean
  onCerrar: () => void
  titulo: string
  descripcion?: string
  children: ReactNode
  pie?: ReactNode
}) {
  useEffect(() => {
    if (!abierto) return
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alEscape = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alEscape)
    return () => {
      document.body.style.overflow = previo
      window.removeEventListener('keydown', alEscape)
    }
  }, [abierto, onCerrar])

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onCerrar}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onCerrar()
            }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col',
              'rounded-t-3xl border border-line bg-surface shadow-sheet',
              'md:max-h-none md:w-[26rem] md:rounded-none md:rounded-l-3xl md:border-y-0 md:border-r-0',
            )}
          >
            {/* agarradera: señal de que se puede arrastrar para cerrar */}
            <div className="flex justify-center pt-2.5 md:hidden">
              <div className="h-1 w-9 rounded-full bg-line-strong" />
            </div>

            <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-3 md:pt-5">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-fg">{titulo}</h2>
                {descripcion && (
                  <p className="mt-0.5 text-sm text-fg-muted">{descripcion}</p>
                )}
              </div>
              <button
                onClick={onCerrar}
                aria-label="Cerrar"
                className="-mr-1.5 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>

            {pie && (
              <footer className="safe-bottom border-t border-line bg-surface px-5 py-3.5">
                {pie}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
