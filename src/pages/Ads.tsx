import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence } from 'framer-motion'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAds, useCrearAd, useActualizarAd, useEliminarAd } from '../lib/queries/ads'
import { useUmbrales } from '../lib/queries/config'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Input, InputNumero, Select } from '../components/ui/Campo'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { Card, CardAnimada } from '../components/ui/Card'
import { SkeletonLista, Vacio, ErrorCarga } from '../components/ui/Estados'
import { BotonCSV } from '../components/BotonCSV'
import { ConfirmarBorrado } from '../components/ConfirmarBorrado'
import { PLATAFORMA, VEREDICTO } from '../lib/etiquetas'
import { dinero, dineroExacto, fechaCorta, hoyISO, numero } from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import type { Ad, AdConVeredicto } from '../lib/tipos'

const esquema = z.object({
  fecha: z.string().min(1),
  plataforma: z.enum(['tiktok', 'instagram', 'facebook']),
  creativo: z.string().min(1, 'Falta el creativo'),
  objetivo: z.string().min(1, 'Falta el objetivo'),
  presupuesto: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(String(v).replace(/[^\d.]/g, ''))),
    z.number().min(0, 'No puede ser negativo'),
  ),
  gasto_real: z.preprocess(
    (v) => (v === '' || v == null ? 0 : Number(String(v).replace(/[^\d.]/g, ''))),
    z.number().min(0, 'No puede ser negativo'),
  ),
  conversaciones: z.preprocess(
    (v) => (v === '' || v == null ? 0 : Number(String(v).replace(/\D/g, ''))),
    z.number().int().min(0),
  ),
})

type Formulario = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

/** Colores de serie: propios de la paleta, no los default de Recharts. */
const SERIES = ['rgb(139 109 255)', 'rgb(224 176 128)', 'rgb(86 168 245)', 'rgb(63 191 127)']

/** null = cerrado, 'nuevo' = alta, una fila = edición. */
type EnEdicion = AdConVeredicto | 'nuevo' | null

export function Ads() {
  const { data: ads, isPending, error, refetch } = useAds()
  const { umbrales } = useUmbrales()
  const { puedeEscribir } = useRol()
  const crear = useCrearAd()
  const actualizar = useActualizarAd()
  const eliminar = useEliminarAd()
  const toast = useToast()
  const [editando, setEditando] = useState<EnEdicion>(null)
  const [aBorrar, setABorrar] = useState<AdConVeredicto | null>(null)

  const puede = puedeEscribir('ads')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Salida>({
    resolver: zodResolver(esquema),
    // 'meta' no existe en plataforma_tipo (§3.5 spec): Meta se registra como
    // facebook o instagram, que es donde realmente corre el creativo.
    defaultValues: { fecha: hoyISO(), plataforma: 'facebook', objetivo: 'Mensajes a WhatsApp' },
  })

  /** Serie por creativo, ordenada por fecha, para la gráfica. */
  const { datos, creativos } = useMemo(() => {
    const filas = ads ?? []
    const nombres = [...new Set(filas.map((a) => a.creativo))].slice(0, 4)
    const fechas = [...new Set(filas.map((a) => a.fecha))].sort()

    const datos = fechas.map((f) => {
      const punto: Record<string, string | number | null> = { fecha: fechaCorta(f) }
      for (const c of nombres) {
        const fila = filas.find((a) => a.fecha === f && a.creativo === c)
        // null (no 0) cuando no hubo conversaciones: la línea se corta,
        // no cae a cero fingiendo que costó $0.
        punto[c] = fila?.costo_por_conversacion != null ? Number(fila.costo_por_conversacion) : null
      }
      return punto
    })

    return { datos, creativos: nombres }
  }, [ads])

  const totales = useMemo(() => {
    const filas = ads ?? []
    return {
      gasto: filas.reduce((s, a) => s + Number(a.gasto_real), 0),
      conversaciones: filas.reduce((s, a) => s + a.conversaciones, 0),
      aMatar: filas.filter((a) => a.veredicto === 'matar').length,
    }
  }, [ads])

  function abrir(destino: EnEdicion) {
    setEditando(destino)
    if (destino === 'nuevo') {
      reset({
        fecha: hoyISO(),
        plataforma: 'facebook',
        creativo: '',
        objetivo: 'Mensajes a WhatsApp',
        presupuesto: '' as unknown as number,
        gasto_real: '' as unknown as number,
        conversaciones: '' as unknown as number,
      })
    } else if (destino) {
      reset({
        fecha: destino.fecha,
        plataforma: destino.plataforma,
        creativo: destino.creativo,
        objetivo: destino.objetivo,
        presupuesto: Number(destino.presupuesto),
        gasto_real: Number(destino.gasto_real),
        conversaciones: destino.conversaciones,
      })
    }
  }

  async function alGuardar(datos: Salida) {
    try {
      if (editando === 'nuevo') {
        await crear.mutateAsync(datos)
        toast.exito('Registro de pauta guardado')
      } else if (editando) {
        await actualizar.mutateAsync({ id: editando.id, cambios: datos })
        toast.exito('Registro actualizado')
      }
      setEditando(null)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    }
  }

  /** Igual que en Contenido: un rechazo silencioso se ve como app rota. */
  function guardarCampo(id: string, cambios: Partial<Ad>) {
    actualizar.mutate(
      { id, cambios },
      { onError: (e) => toast.error(mensajeDeError(e as { message?: string })) },
    )
  }

  async function borrar() {
    if (!aBorrar) return
    try {
      await eliminar.mutateAsync(aBorrar.id)
      toast.exito('Registro de pauta eliminado')
      setABorrar(null)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
      throw e
    }
  }

  const esAlta = editando === 'nuevo'

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Pauta</h1>
          <p className="text-sm text-fg-muted">
            <span className="tabular">{dinero(totales.gasto)}</span> gastados ·{' '}
            {numero(totales.conversaciones)} conversaciones
            {totales.aMatar > 0 && (
              <span className="text-danger"> · {totales.aMatar} para matar</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BotonCSV
            nombre="pauta"
            filas={(ads ?? []).map((a) => ({
              fecha: a.fecha,
              plataforma: PLATAFORMA[a.plataforma],
              creativo: a.creativo,
              objetivo: a.objetivo,
              presupuesto: a.presupuesto,
              gasto_real: a.gasto_real,
              conversaciones: a.conversaciones,
              costo_por_conversacion: a.costo_por_conversacion ?? '',
              veredicto: VEREDICTO[a.veredicto].texto,
            }))}
          />
          {puede && (
            <Button onClick={() => abrir('nuevo')} className="hidden md:inline-flex">
              <Plus className="h-4 w-4" />
              Registrar día
            </Button>
          )}
        </div>
      </header>

      {/* ── Costo por conversación en el tiempo, por creativo ─────────── */}
      {creativos.length > 0 && datos.length > 1 && (
        <Card>
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Costo por conversación
          </p>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datos} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="rgb(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  stroke="rgb(var(--fg-subtle))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgb(var(--fg-subtle))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: 12,
                    fontSize: 13,
                    color: 'rgb(var(--fg))',
                  }}
                  formatter={(v) => dineroExacto(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: 'rgb(var(--fg-muted))' }} />

                {/* Las dos líneas de decisión: debajo escalar, arriba matar */}
                <ReferenceLine
                  y={umbrales.umbral_cpc_bueno}
                  stroke="rgb(var(--success))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                />
                <ReferenceLine
                  y={umbrales.umbral_cpc_malo}
                  stroke="rgb(var(--danger))"
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                />

                {creativos.map((c, i) => (
                  <Line
                    key={c}
                    type="monotone"
                    dataKey={c}
                    stroke={SERIES[i % SERIES.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-fg-subtle">
            Línea verde {dinero(umbrales.umbral_cpc_bueno)}: debajo, sube presupuesto. Línea roja{' '}
            {dinero(umbrales.umbral_cpc_malo)}: arriba, mata el creativo.
          </p>
        </Card>
      )}

      {error ? (
        <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
      ) : isPending ? (
        <SkeletonLista />
      ) : (ads ?? []).length === 0 ? (
        <Vacio
          icono={<Megaphone className="h-6 w-6" />}
          titulo="Sin registros de pauta"
          descripcion="Una fila por anuncio por día. Sin esto, en tres semanas cada quien tiene su teoría y ninguna es verificable."
          accion={puede ? <Button onClick={() => abrir('nuevo')}>Registrar el primero</Button> : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {(ads ?? []).map((a, i) => {
              const v = VEREDICTO[a.veredicto]
              return (
                <CardAnimada key={a.id} indice={i}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-fg">{a.creativo}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-subtle">
                        <span>{PLATAFORMA[a.plataforma]}</span>
                        <span>{a.objetivo}</span>
                        <span>{fechaCorta(a.fecha)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge tono={v.tono} punto>
                        {v.texto}
                      </Badge>
                      {puede && (
                        <div className="flex items-center gap-0.5">
                          <BotonIcono
                            etiqueta={`Editar ${a.creativo}`}
                            onClick={() => abrir(a)}
                          >
                            <Pencil className="h-4 w-4" />
                          </BotonIcono>
                          <BotonIcono
                            etiqueta={`Eliminar ${a.creativo}`}
                            peligro
                            onClick={() => setABorrar(a)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </BotonIcono>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <Mini titulo="Presup." valor={dinero(a.presupuesto)} />
                    <MiniEditable
                      titulo="Gasto"
                      valor={Number(a.gasto_real)}
                      editable={puede}
                      onGuardar={(n) => guardarCampo(a.id, { gasto_real: n ?? 0 })}
                    />
                    <MiniEditable
                      titulo="Convs."
                      valor={a.conversaciones}
                      editable={puede}
                      entero
                      onGuardar={(n) => guardarCampo(a.id, { conversaciones: n ?? 0 })}
                    />
                    <Mini
                      titulo="Costo/conv."
                      valor={
                        a.costo_por_conversacion == null
                          ? '—'
                          : dineroExacto(Number(a.costo_por_conversacion))
                      }
                    />
                  </div>

                  <p className="mt-2.5 text-sm text-fg-muted">{v.accion}</p>
                </CardAnimada>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {puede && (
        <BotonFlotante
          data-tour="nueva-pauta"
          onClick={() => abrir('nuevo')}
          aria-label="Registrar día de pauta"
        >
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      <Sheet
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={esAlta ? 'Registrar día de pauta' : 'Editar registro'}
        descripcion={
          esAlta ? 'Una fila por anuncio por día.' : 'Corrige lo que se capturó mal ese día.'
        }
        pie={
          <Button bloque tamano="lg" cargando={isSubmitting} onClick={handleSubmit(alGuardar)}>
            {esAlta ? 'Guardar' : 'Guardar cambios'}
          </Button>
        }
      >
        <form onSubmit={handleSubmit(alGuardar)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input etiqueta="Fecha" type="date" {...register('fecha')} />
            <Select etiqueta="Plataforma" {...register('plataforma')}>
              {Object.entries(PLATAFORMA).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <Input
            etiqueta="Creativo"
            autoFocus
            placeholder="Creativo A - gótico mano"
            error={errors.creativo?.message}
            {...register('creativo')}
          />
          <Input
            etiqueta="Objetivo"
            placeholder="Mensajes a WhatsApp"
            error={errors.objetivo?.message}
            {...register('objetivo')}
          />

          <div className="grid grid-cols-2 gap-3">
            <InputNumero
              etiqueta="Presupuesto"
              prefijo="$"
              error={errors.presupuesto?.message}
              {...register('presupuesto')}
            />
            <InputNumero
              etiqueta="Gasto real"
              prefijo="$"
              error={errors.gasto_real?.message}
              {...register('gasto_real')}
            />
          </div>

          <InputNumero
            etiqueta="Conversaciones generadas"
            hint="Las que sí escribieron por WhatsApp"
            error={errors.conversaciones?.message}
            {...register('conversaciones')}
          />
        </form>
      </Sheet>

      <ConfirmarBorrado
        abierto={Boolean(aBorrar)}
        onCerrar={() => setABorrar(null)}
        onConfirmar={borrar}
        titulo="¿Eliminar este registro?"
        descripcion={
          <>
            Se borra el día <span className="text-fg">{fechaCorta(aBorrar?.fecha)}</span> de{' '}
            <span className="text-fg">{aBorrar?.creativo}</span>. El gasto deja de contar en el
            tablero y la línea del creativo pierde ese punto.
          </>
        }
      />
    </div>
  )
}

/** Acción compacta de tarjeta. 44px de área táctil aunque el icono sea de 16. */
function BotonIcono({
  children,
  etiqueta,
  peligro,
  onClick,
}: {
  children: ReactNode
  etiqueta: string
  peligro?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      className={
        'flex h-11 w-11 items-center justify-center rounded-xl transition-colors ' +
        (peligro
          ? 'text-fg-subtle hover:bg-danger/12 hover:text-danger'
          : 'text-fg-subtle hover:bg-surface-2 hover:text-fg')
      }
    >
      {children}
    </button>
  )
}

function Mini({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2.5 py-2">
      <span className="block text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
        {titulo}
      </span>
      <span className="tabular block truncate text-base font-semibold text-fg">{valor}</span>
    </div>
  )
}

function MiniEditable({
  titulo,
  valor,
  editable,
  entero,
  onGuardar,
}: {
  titulo: string
  valor: number
  editable: boolean
  entero?: boolean
  onGuardar: (v: number | null) => void
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const mostrado = texto ?? String(valor ?? '')

  return (
    <label className="block rounded-xl bg-surface-2 px-2.5 py-2">
      <span className="block text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
        {titulo}
      </span>
      <input
        type="text"
        inputMode={entero ? 'numeric' : 'decimal'}
        disabled={!editable}
        value={mostrado}
        onChange={(e) =>
          setTexto(e.target.value.replace(entero ? /\D/g : /[^\d.]/g, ''))
        }
        onBlur={() => {
          if (texto == null) return
          const n = texto === '' ? 0 : Number(texto)
          if (Number.isFinite(n) && n !== valor) onGuardar(n)
          setTexto(null)
        }}
        className="tabular w-full bg-transparent text-base font-semibold text-fg outline-none disabled:text-fg-muted"
      />
    </label>
  )
}
