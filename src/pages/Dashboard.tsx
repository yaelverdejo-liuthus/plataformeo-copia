import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { AlertCircle, ChevronRight, PartyPopper } from 'lucide-react'
import { useDashboard, derivar } from '../lib/queries/dashboard'
import { useLeads } from '../lib/queries/leads'
import { useTrabajos } from '../lib/queries/trabajos'
import { useContenido } from '../lib/queries/contenido'
import { useAds } from '../lib/queries/ads'
import { useUmbrales } from '../lib/queries/config'
import { Card, TituloSeccion } from '../components/ui/Card'
import { SkeletonKPIs, ErrorCarga } from '../components/ui/Estados'
import {
  dinero,
  diasDesdeHoy,
  horas,
  minutosAHoras,
  multiplo,
  numero,
  porcentaje,
} from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import { cn } from '../lib/cn'

type Luz = 'verde' | 'ambar' | 'rojo' | 'sin_datos'

const CLASE_LUZ: Record<Luz, string> = {
  verde: 'text-success',
  ambar: 'text-warn',
  rojo: 'text-danger',
  sin_datos: 'text-fg-subtle',
}

/** Semáforo donde MENOS es mejor (costo por conversación). */
function luzInversa(valor: number | null, bueno: number, malo: number): Luz {
  if (valor == null) return 'sin_datos'
  if (valor < bueno) return 'verde'
  if (valor > malo) return 'rojo'
  return 'ambar'
}

/** Semáforo donde MÁS es mejor (ROAS, tasa de cierre, tarifa…). */
function luzDirecta(valor: number | null, bueno: number, malo: number): Luz {
  if (valor == null) return 'sin_datos'
  if (valor > bueno) return 'verde'
  if (valor < malo) return 'rojo'
  return 'ambar'
}

export function Dashboard() {
  const { data: d, isPending, error, refetch } = useDashboard()
  const { data: leads } = useLeads()
  const { data: trabajos } = useTrabajos()
  const { data: contenido } = useContenido()
  const { data: ads } = useAds()
  const { umbrales } = useUmbrales()

  const dv = derivar(d)

  const cpcBueno = umbrales.umbral_cpc_bueno ?? 40
  const cpcMalo = umbrales.umbral_cpc_malo ?? 80
  const tarifaObjetivo = umbrales.tarifa_objetivo_hora ?? 400

  // ── Panel "Requiere tu atención" ─────────────────────────────────
  const atencion = useMemo(() => {
    const items: { texto: string; detalle: string; ruta: string; tono: 'peligro' | 'aviso' }[] = []

    const vencidos = (leads ?? []).filter((l) => {
      if (!l.fecha_seguimiento) return false
      if (l.estatus === 'agendado' || l.estatus === 'perdido') return false
      const dd = diasDesdeHoy(l.fecha_seguimiento)
      return dd != null && dd <= 0
    })
    if (vencidos.length) {
      items.push({
        texto: `${vencidos.length} ${vencidos.length === 1 ? 'lead con seguimiento vencido' : 'leads con seguimiento vencido'}`,
        detalle: vencidos.map((l) => l.nombre).slice(0, 3).join(', '),
        ruta: '/leads',
        tono: 'peligro',
      })
    }

    const sinAnticipo = (trabajos ?? []).filter(
      (t) => t.estatus !== 'cancelado' && t.estatus !== 'terminado' && Number(t.anticipo) <= 0,
    )
    if (sinAnticipo.length) {
      items.push({
        texto: `${sinAnticipo.length} ${sinAnticipo.length === 1 ? 'trabajo sin anticipo' : 'trabajos sin anticipo'}`,
        detalle: 'No se pueden agendar hasta cobrarlo',
        ruta: '/trabajos',
        tono: 'peligro',
      })
    }

    const aMatar = (ads ?? []).filter((a) => a.veredicto === 'matar')
    if (aMatar.length) {
      items.push({
        texto: `${aMatar.length} ${aMatar.length === 1 ? 'creativo para matar' : 'creativos para matar'}`,
        detalle: [...new Set(aMatar.map((a) => a.creativo))].slice(0, 2).join(', '),
        ruta: '/ads',
        tono: 'peligro',
      })
    }

    const porPromocionar = (contenido ?? []).filter((c) => c.pasa_filtro === true && !c.promocionado)
    if (porPromocionar.length) {
      items.push({
        texto: `${porPromocionar.length} ${porPromocionar.length === 1 ? 'video pasa filtro y no se ha promocionado' : 'videos pasan filtro y no se han promocionado'}`,
        detalle: 'Ya funcionaron orgánico — es dinero bien puesto',
        ruta: '/contenido',
        tono: 'aviso',
      })
    }

    const retoques = (trabajos ?? []).filter(
      (t) => t.retoque_pendiente && t.estatus !== 'cancelado',
    )
    if (retoques.length) {
      items.push({
        texto: `${retoques.length} ${retoques.length === 1 ? 'retoque pendiente' : 'retoques pendientes'}`,
        detalle: retoques.map((t) => t.cliente).slice(0, 3).join(', '),
        ruta: '/trabajos',
        tono: 'aviso',
      })
    }

    return items
  }, [leads, trabajos, contenido, ads])

  const mezcla = useMemo(
    () =>
      d
        ? [
            { nivel: 'Nivel 1', valor: d.nivel_1, color: 'rgb(var(--fg-subtle))' },
            { nivel: 'Nivel 2', valor: d.nivel_2, color: 'rgb(var(--primary))' },
            { nivel: 'Nivel 3', valor: d.nivel_3, color: 'rgb(var(--accent))' },
          ]
        : [],
    [d],
  )

  if (error) {
    return <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Tablero</h1>
        <p className="text-sm text-fg-muted">
          Todo sale de Leads, Trabajos, Contenido y Pauta. Aquí no se captura nada.
        </p>
      </header>

      {/* ── Requiere tu atención ─────────────────────────────────────── */}
      <section>
        <TituloSeccion>Requiere tu atención</TituloSeccion>
        {atencion.length === 0 ? (
          <Card className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/12 text-success">
              <PartyPopper className="h-4.5 w-4.5" />
            </div>
            <p className="text-base text-fg-muted">Nada pendiente. Todo al corriente.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {atencion.map((a, i) => (
              <motion.div
                key={a.texto}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              >
                <Link
                  to={a.ruta}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-3.5 transition-colors',
                    a.tono === 'peligro'
                      ? 'border-danger/25 bg-danger/8 hover:bg-danger/12'
                      : 'border-warn/25 bg-warn/8 hover:bg-warn/12',
                  )}
                >
                  <AlertCircle
                    className={cn(
                      'h-5 w-5 shrink-0',
                      a.tono === 'peligro' ? 'text-danger' : 'text-warn',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-fg">{a.texto}</p>
                    <p className="truncate text-sm text-fg-muted">{a.detalle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Dinero ──────────────────────────────────────────────────── */}
      <section>
        <TituloSeccion>Dinero</TituloSeccion>
        {isPending || !d || !dv ? (
          <SkeletonKPIs n={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPI titulo="Ingreso cobrado" valor={dinero(d.ingreso_cobrado)} />
            <KPI
              titulo="Margen neto"
              valor={dinero(dv.margenNeto)}
              luz={dv.margenNeto > 0 ? 'verde' : dv.margenNeto < 0 ? 'rojo' : 'sin_datos'}
            />
            <KPI titulo="Costo de insumos" valor={dinero(d.costo_insumos)} />
            <KPI titulo="Gasto en pauta" valor={dinero(d.gasto_pauta)} />
          </div>
        )}
      </section>

      {/* ── Reglas de decisión, con semáforo ────────────────────────── */}
      <section>
        <TituloSeccion>Reglas de decisión</TituloSeccion>
        {isPending || !d || !dv ? (
          <SkeletonKPIs n={6} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KPI
              titulo="Costo por conversación"
              valor={dv.costoPorConversacion == null ? '—' : dinero(dv.costoPorConversacion)}
              luz={luzInversa(dv.costoPorConversacion, cpcBueno, cpcMalo)}
              pie={
                dv.costoPorConversacion == null
                  ? 'Sin conversaciones registradas'
                  : `Verde < ${dinero(cpcBueno)} · Rojo > ${dinero(cpcMalo)}`
              }
            />
            <KPI
              titulo="Tasa de cierre"
              valor={porcentaje(dv.tasaCierre, 1)}
              luz={luzDirecta(dv.tasaCierre, 0.25, 0.2)}
              pie={
                dv.tasaCierre != null && dv.tasaCierre < 0.2
                  ? 'El problema está en WhatsApp, no en la pauta'
                  : 'Verde > 25% · Rojo < 20%'
              }
            />
            <KPI
              titulo="ROAS"
              valor={multiplo(dv.roas)}
              luz={luzDirecta(dv.roas, 2.5, 2.0)}
              pie={dv.roas == null ? 'Sin gasto en pauta' : 'Verde > 2.5x · Rojo < 2.0x'}
            />
            <KPI
              titulo="% en nivel 2 o 3"
              valor={porcentaje(dv.porcentajeNivel23)}
              luz={luzDirecta(dv.porcentajeNivel23, 0.6, 0.5)}
              pie={
                dv.porcentajeNivel23 != null && dv.porcentajeNivel23 < 0.5
                  ? 'El precio del nivel 1 está demasiado bajo'
                  : 'Verde > 60% · Rojo < 50%'
              }
            />
            <KPI
              titulo="Tarifa real por hora"
              valor={dv.tarifaRealHora == null ? '—' : `${dinero(dv.tarifaRealHora)}/h`}
              luz={luzDirecta(dv.tarifaRealHora, tarifaObjetivo * 1.5, tarifaObjetivo)}
              pie={
                dv.tarifaRealHora == null
                  ? 'Falta capturar tiempos en trabajos terminados'
                  : `Piso de sostenibilidad: ${dinero(tarifaObjetivo)}/h`
              }
            />
            <KPI
              titulo="% del tiempo que es diseño"
              valor={porcentaje(dv.porcentajeDiseno)}
              luz={luzInversa(dv.porcentajeDiseno, 0.4, 0.5)}
              pie={
                dv.porcentajeDiseno != null && dv.porcentajeDiseno > 0.4
                  ? 'Estás regalando horas. Sube el precio del nivel 3.'
                  : 'El diseño pasa de noche y se siente gratis'
              }
            />
          </div>
        )}
      </section>

      {/* ── Embudo y mezcla ─────────────────────────────────────────── */}
      <section className="grid gap-3 lg:grid-cols-2">
        <Card>
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">Embudo</p>
          {isPending || !d || !dv ? (
            <div className="mt-3 space-y-2">
              <div className="skeleton h-6 w-full rounded-lg" />
              <div className="skeleton h-6 w-4/5 rounded-lg" />
              <div className="skeleton h-6 w-3/5 rounded-lg" />
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <PasoEmbudo etiqueta="Conversaciones" valor={d.conversaciones} maximo={d.conversaciones} />
              <PasoEmbudo etiqueta="Agendados" valor={d.agendados} maximo={d.conversaciones} />
              <PasoEmbudo etiqueta="Terminados" valor={d.terminados} maximo={d.conversaciones} />
              <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-sm text-fg-muted">
                <span>
                  CAC <span className="tabular text-fg">{dv.cac == null ? '—' : dinero(dv.cac)}</span>
                </span>
                <span>
                  Ticket{' '}
                  <span className="tabular text-fg">
                    {dv.ticketPromedio == null ? '—' : dinero(dv.ticketPromedio)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
            Mezcla de niveles
          </p>
          {isPending || !d ? (
            <div className="skeleton mt-3 h-40 rounded-xl" />
          ) : d.nivel_1 + d.nivel_2 + d.nivel_3 === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">
              Sin trabajos todavía. Aquí se ve si el negocio vive del nivel 1 barato.
            </p>
          ) : (
            <div className="mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mezcla} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="nivel"
                    stroke="rgb(var(--fg-subtle))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgb(var(--surface-2))' }}
                    contentStyle={{
                      background: 'rgb(var(--surface))',
                      border: '1px solid rgb(var(--border))',
                      borderRadius: 12,
                      fontSize: 13,
                      color: 'rgb(var(--fg))',
                    }}
                  />
                  <Bar dataKey="valor" name="Trabajos" radius={[8, 8, 0, 0]}>
                    {mezcla.map((m) => (
                      <Cell key={m.nivel} fill={m.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </section>

      {/* ── Tiempo y contenido ──────────────────────────────────────── */}
      <section>
        <TituloSeccion>Tiempo y contenido</TituloSeccion>
        {isPending || !d ? (
          <SkeletonKPIs n={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KPI titulo="Horas invertidas" valor={horas(d.horas_invertidas)} pie="Solo trabajos terminados" />
            <KPI titulo="Tiempo de diseño" valor={minutosAHoras(d.min_diseno)} />
            <KPI titulo="Videos publicados" valor={numero(d.videos_publicados)} />
            <KPI
              titulo="Videos que pasan filtro"
              valor={numero(d.videos_aptos)}
              pie={`${numero(d.vistas_totales)} vistas acumuladas`}
            />
          </div>
        )}
      </section>
    </div>
  )
}

function KPI({
  titulo,
  valor,
  luz = 'sin_datos',
  pie,
}: {
  titulo: string
  valor: string
  luz?: Luz
  pie?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-line bg-surface p-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-2xs font-semibold uppercase tracking-wider text-fg-subtle">{titulo}</p>
        {luz !== 'sin_datos' && (
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              luz === 'verde' && 'bg-success',
              luz === 'ambar' && 'bg-warn',
              luz === 'rojo' && 'bg-danger',
            )}
          />
        )}
      </div>
      <p className={cn('tabular mt-1.5 text-2xl font-semibold', CLASE_LUZ[luz], luz === 'sin_datos' && 'text-fg')}>
        {valor}
      </p>
      {pie && <p className="mt-1 text-xs leading-snug text-fg-subtle">{pie}</p>}
    </motion.div>
  )
}

function PasoEmbudo({
  etiqueta,
  valor,
  maximo,
}: {
  etiqueta: string
  valor: number
  maximo: number
}) {
  const ancho = maximo > 0 ? (valor / maximo) * 100 : 0
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-fg-muted">{etiqueta}</span>
        <span className="tabular font-medium text-fg">{numero(valor)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${ancho}%` }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-primary"
        />
      </div>
    </div>
  )
}
