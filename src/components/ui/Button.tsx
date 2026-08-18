import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'
type Tamano = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario:
    'bg-primary text-primary-fg hover:bg-primary-hover shadow-sm disabled:bg-primary/40',
  secundario:
    'bg-surface-2 text-fg border border-line hover:bg-surface-3 hover:border-line-strong',
  fantasma: 'text-fg-muted hover:text-fg hover:bg-surface-2',
  peligro: 'bg-danger/12 text-danger border border-danger/25 hover:bg-danger/20',
}

// 44px mínimo de área táctil en md y lg (§3.1 del brief)
const TAMANOS: Record<Tamano, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-4 text-base rounded-xl gap-2',
  lg: 'h-12 px-5 text-base rounded-xl gap-2 font-medium',
}

// children se re-declara: HTMLMotionProps lo tipa incluyendo MotionValue,
// que no es un ReactNode válido para renderizar.
interface Props extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children?: ReactNode
  variante?: Variante
  tamano?: Tamano
  cargando?: boolean
  bloque?: boolean
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variante = 'primario',
    tamano = 'md',
    cargando,
    bloque,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      disabled={disabled || cargando}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-colors duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTES[variante],
        TAMANOS[tamano],
        bloque && 'w-full',
        className,
      )}
      {...props}
    >
      {cargando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  )
})

/** Botón redondo flotante para el alta rápida en móvil. */
export function BotonFlotante({
  className,
  children,
  ...props
}: Omit<HTMLMotionProps<'button'>, 'children'> & { children?: ReactNode }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
      className={cn(
        'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] right-4 z-30',
        'flex h-14 w-14 items-center justify-center rounded-2xl',
        'bg-primary text-primary-fg shadow-raised',
        'md:bottom-6 md:right-6',
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}
