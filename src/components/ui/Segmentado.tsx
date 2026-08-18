import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

export interface Opcion<T extends string> {
  valor: T
  etiqueta: string
  conteo?: number
}

/**
 * Filtro segmentado con indicador deslizante. Scrollea horizontal en móvil
 * en vez de apretujar las opciones.
 */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
  idGrupo,
}: {
  opciones: Opcion<T>[]
  valor: T
  onCambio: (v: T) => void
  idGrupo: string
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex gap-1 rounded-xl bg-surface-2 p-1">
        {opciones.map((o) => {
          const activo = o.valor === valor
          return (
            <button
              key={o.valor}
              onClick={() => onCambio(o.valor)}
              className={cn(
                'relative whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
                activo ? 'text-primary-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {activo && (
                <motion.span
                  layoutId={`segmentado-${idGrupo}`}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-lg bg-primary"
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {o.etiqueta}
                {o.conteo != null && (
                  <span
                    className={cn(
                      'tabular text-2xs',
                      activo ? 'text-primary-fg/70' : 'text-fg-subtle',
                    )}
                  >
                    {o.conteo}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
