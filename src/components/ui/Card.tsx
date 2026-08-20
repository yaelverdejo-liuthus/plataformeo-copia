import type { HTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { DURACION, escalonar, transicion } from '../../lib/animacion'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-surface p-4 shadow-card', className)}
      {...props}
    />
  )
}

/**
 * Card de lista: entra escalonada y sale encogiéndose.
 *
 * Antes solo tenía entrada. Como las listas ya venían envueltas en
 * <AnimatePresence>, borrar un registro lo hacía desaparecer de golpe —
 * se veía como un parpadeo, no como un borrado. `exit` arregla esa mitad.
 *
 * La otra mitad (que las de abajo suban con suavidad al hueco) pedía
 * `layout`, y eso se quitó: obliga a framer a medir la posición real de
 * cada tarjeta y aplicarle un transform. Dentro de una página que a su vez
 * está animándose, la medición salía contra un ancestro en movimiento y
 * dejaba tarjetas desplazadas fuera de la pantalla. Que las filas den un
 * salto seco al reacomodarse es mucho menos grave que no verlas.
 */
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
      exit={{ opacity: 0, scale: 0.97, transition: transicion(DURACION.rapida) }}
      transition={{ ...transicion(), delay: escalonar(indice) }}
      onClick={onClick}
      // Hundirse al tocar es la única confirmación táctil que hay en móvil
      // de que el tap sí registró sobre la tarjeta.
      whileTap={onClick ? { scale: 0.985 } : undefined}
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
