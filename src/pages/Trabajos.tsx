import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Columns3, List, Plus, Wrench } from 'lucide-react'
import { useTrabajos } from '../lib/queries/trabajos'
import { useRol } from '../hooks/useRol'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { CardAnimada } from '../components/ui/Card'
import { SkeletonLista, Vacio, ErrorCarga } from '../components/ui/Estados'
import { FormTrabajo } from '../components/FormTrabajo'
import { BotonCSV } from '../components/BotonCSV'
import { COLUMNAS_KANBAN, TRABAJO_ESTATUS } from '../lib/etiquetas'
import { dinero, dividir, fechaCorta, hora12, minutosAHoras } from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import { cn } from '../lib/cn'
import type { Trabajo } from '../lib/tipos'

type Vista = 'kanban' | 'lista'

export function Trabajos() {
  const { data: trabajos, isPending, error, refetch } = useTrabajos()
  const { puedeEscribir } = useRol()
  const navegar = useNavigate()
  const [vista, setVista] = useState<Vista>('kanban')
  const [altaAbierta, setAltaAbierta] = useState(false)

  const puede = puedeEscribir('trabajos')

  const porColumna = useMemo(() => {
    const mapa = Object.fromEntries(COLUMNAS_KANBAN.map((c) => [c, [] as Trabajo[]]))
    for (const t of trabajos ?? []) {
      if (t.estatus === 'cancelado') continue
      mapa[t.estatus]?.push(t)
    }
    return mapa
  }, [trabajos])

  const activos = (trabajos ?? []).filter((t) => t.estatus !== 'cancelado')
  const porCobrar = activos.reduce((s, t) => s + Number(t.saldo ?? 0), 0)

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Trabajos</h1>
          <p className="text-sm text-fg-muted">
            {activos.length} activos · <span className="tabular">{dinero(porCobrar)}</span> por
            cobrar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonCSV
            nombre="trabajos"
            filas={(trabajos ?? []).map((t) => ({
              id: t.id,
              cliente: t.cliente,
              whatsapp: t.whatsapp,
              diseno: t.diseno,
              catalogo_id: t.catalogo_id,
              nivel: t.nivel,
              zona: t.zona,
              fecha_trazado: t.fecha_trazado,
              fecha_tatuaje: t.fecha_tatuaje,
              hora: t.hora,
              precio_total: t.precio_total,
              anticipo: t.anticipo,
              saldo: t.saldo,
              tiempo_diseno_min: t.tiempo_diseno_min,
              tiempo_aplicacion_min: t.tiempo_aplicacion_min,
              minutos_totales: t.minutos_totales,
              estatus: TRABAJO_ESTATUS[t.estatus].texto,
              origen: t.origen,
              retoque_pendiente: t.retoque_pendiente ? 'Sí' : 'No',
            }))}
          />
          <div className="flex rounded-xl bg-surface-2 p-1">
            <BotonVista activo={vista === 'kanban'} onClick={() => setVista('kanban')}>
              <Columns3 className="h-4 w-4" />
            </BotonVista>
            <BotonVista activo={vista === 'lista'} onClick={() => setVista('lista')}>
              <List className="h-4 w-4" />
            </BotonVista>
          </div>
          {puede && (
            <Button onClick={() => setAltaAbierta(true)} className="hidden md:inline-flex">
              <Plus className="h-4 w-4" />
              Nuevo
            </Button>
          )}
        </div>
      </header>

      {error ? (
        <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
      ) : isPending ? (
        <SkeletonLista />
      ) : activos.length === 0 ? (
        <Vacio
          icono={<Wrench className="h-6 w-6" />}
          titulo="Sin trabajos todavía"
          descripcion="Un trabajo es el expediente de una pieza: del trazado hasta terminado."
          accion={puede ? <Button onClick={() => setAltaAbierta(true)}>Crear el primero</Button> : undefined}
        />
      ) : vista === 'kanban' ? (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {COLUMNAS_KANBAN.map((col) => (
            <section key={col} className="w-[78vw] shrink-0 md:w-auto">
              <div className="mb-2.5 flex items-center justify-between px-1">
                <h2 className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                  {TRABAJO_ESTATUS[col].texto}
                </h2>
                <span className="tabular text-2xs text-fg-subtle">{porColumna[col].length}</span>
              </div>

              <div className="space-y-2.5 rounded-2xl bg-surface-2/40 p-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {porColumna[col].map((t, i) => (
                    <motion.div
                      key={t.id}
                      layout
                      layoutId={`trabajo-${t.id}`}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{
                        duration: 0.2,
                        delay: Math.min(i, 6) * 0.025,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      onClick={() => navegar(`/trabajos/${t.id}`)}
                      className="cursor-pointer rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-strong"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-base font-medium text-fg">{t.cliente}</p>
                        <span className="tabular shrink-0 text-2xs text-fg-subtle">{t.id}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-fg-muted">{t.diseno}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-subtle">
                        <span className="tabular">{dinero(t.precio_total)}</span>
                        {Number(t.saldo) > 0 && (
                          <span className="tabular text-warn">Debe {dinero(Number(t.saldo))}</span>
                        )}
                        {t.fecha_tatuaje && <span>{fechaCorta(t.fecha_tatuaje)}</span>}
                        {t.retoque_pendiente && <Badge tono="acento">Retoque</Badge>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {porColumna[col].length === 0 && (
                  <p className="px-2 py-6 text-center text-sm text-fg-subtle">Vacío</p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {activos.map((t, i) => {
            const tarifa = dividir(Number(t.precio_total), Number(t.minutos_totales) / 60)
            return (
              <CardAnimada key={t.id} indice={i} onClick={() => navegar(`/trabajos/${t.id}`)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="truncate text-base font-medium text-fg">{t.cliente}</p>
                      <span className="tabular shrink-0 text-2xs text-fg-subtle">{t.id}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-fg-muted">{t.diseno}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                      <span>Nivel {t.nivel}</span>
                      <span>{t.zona}</span>
                      {t.fecha_tatuaje && (
                        <span>
                          {fechaCorta(t.fecha_tatuaje)}
                          {t.hora ? ` · ${hora12(t.hora)}` : ''}
                        </span>
                      )}
                      {t.minutos_totales > 0 && <span>{minutosAHoras(t.minutos_totales)}</span>}
                      {tarifa != null && <span className="tabular">{dinero(tarifa)}/h</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge tono={TRABAJO_ESTATUS[t.estatus].tono}>
                      {TRABAJO_ESTATUS[t.estatus].texto}
                    </Badge>
                    <span className="tabular text-sm text-fg">{dinero(t.precio_total)}</span>
                    {Number(t.saldo) > 0 && (
                      <span className="tabular text-xs text-warn">
                        Debe {dinero(Number(t.saldo))}
                      </span>
                    )}
                  </div>
                </div>
              </CardAnimada>
            )
          })}
        </div>
      )}

      {puede && (
        <BotonFlotante onClick={() => setAltaAbierta(true)} aria-label="Nuevo trabajo">
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      <Sheet
        abierto={altaAbierta}
        onCerrar={() => setAltaAbierta(false)}
        titulo="Nuevo trabajo"
        descripcion="El folio se asigna solo."
      >
        <FormTrabajo alGuardar={() => setAltaAbierta(false)} />
      </Sheet>
    </div>
  )
}

function BotonVista({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-9 w-10 items-center justify-center rounded-lg transition-colors duration-150',
        activo ? 'bg-surface text-fg shadow-sm' : 'text-fg-subtle hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
