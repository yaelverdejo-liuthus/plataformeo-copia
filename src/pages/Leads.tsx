import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Briefcase,
  CalendarClock,
  ChevronRight,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useLeads, useActualizarLead, useCrearLead, useEliminarLead } from '../lib/queries/leads'
import { useTrabajos } from '../lib/queries/trabajos'
import { useCatalogo } from '../lib/queries/catalogo'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Input, InputNumero, Select, Textarea } from '../components/ui/Campo'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { CardAnimada } from '../components/ui/Card'
import { Segmentado } from '../components/ui/Segmentado'
import { SkeletonLista, Vacio, ErrorCarga } from '../components/ui/Estados'
import { BotonCSV } from '../components/BotonCSV'
import { ConfirmarBorrado } from '../components/ConfirmarBorrado'
import { WizardEstatusLead } from '../components/WizardEstatusLead'
import { ReprogramarCita } from '../components/ReprogramarCita'
import { LEAD_ESTATUS, EMBUDO_LEAD, ORIGEN, ZONAS } from '../lib/etiquetas'
import {
  cuandoTexto,
  diasDesdeHoy,
  dinero,
  fechaCorta,
  hora12,
  hoyISO,
  telFormateado,
  urlWhatsApp,
} from '../lib/formato'
import { mensajeDeError, esReglaDeNegocio, esDependencia } from '../lib/errores'
import { ENTRADA, transicion } from '../lib/animacion'
import { cn } from '../lib/cn'
import type { Lead, LeadEstatus, Origen } from '../lib/tipos'

const aNumero = (v: unknown) => {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * El alta admite registrar a alguien que YA llega cerrado.
 *
 * Es el caso real del estudio: llegó un conocido, se cotizó de palabra y
 * dejó el anticipo en la misma visita. Obligarlo a pasar por tres pantallas
 * para dejarlo agendado era el retrabajo que se reportó. Las reglas de qué
 * exige cada etapa son las mismas que aplica la base.
 */
const esquema = z
  .object({
    nombre: z.string().min(1, 'Falta el nombre'),
    whatsapp: z
      .string()
      .refine((v) => v.replace(/\D/g, '').length >= 10, 'El WhatsApp debe traer 10 dígitos'),
    origen: z.enum(['tiktok', 'meta', 'organico', 'referido', 'conocido']),
    estatus: z.enum(['nuevo', 'cotizado', 'agendado']),
    que_pidio: z.string().optional(),
    nivel_estimado: z.string().optional(),
    siguiente_accion: z.string().optional(),
    fecha_seguimiento: z.string().optional(),
    monto_cotizado: z.preprocess(aNumero, z.number().positive().nullable()),
    zona: z.string().optional(),
    catalogo_id: z.string().optional(),
    fecha_tatuaje: z.string().optional(),
    hora: z.string().optional(),
    fecha_trazado: z.string().optional(),
    anticipo: z.preprocess(aNumero, z.number().min(0).nullable()),
  })
  .superRefine((d, ctx) => {
    if (d.estatus !== 'nuevo' && !d.monto_cotizado) {
      ctx.addIssue({
        code: 'custom',
        path: ['monto_cotizado'],
        message: 'Para dejarlo cotizado hace falta el monto.',
      })
    }
    if (d.estatus === 'agendado') {
      if (!d.fecha_tatuaje) {
        ctx.addIssue({ code: 'custom', path: ['fecha_tatuaje'], message: 'Falta la fecha.' })
      }
      if (!d.anticipo || d.anticipo <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['anticipo'],
          message: 'Sin anticipo no se agenda. Lo bloquea la base.',
        })
      }
    }
    if (d.monto_cotizado && d.anticipo && d.anticipo > d.monto_cotizado) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipo'],
        message: 'El anticipo no puede ser mayor que lo cotizado.',
      })
    }
  })

type Formulario = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

type Filtro = 'todos' | 'nuevo' | 'cotizado' | 'agendado' | 'seguimiento' | 'perdido'
type EnEdicion = Lead | 'nuevo' | null

export function Leads() {
  const { data: leads, isPending, error, refetch } = useLeads()
  const { data: trabajos } = useTrabajos()
  const { data: catalogo } = useCatalogo()
  const { puedeEscribir } = useRol()
  const crear = useCrearLead()
  const actualizar = useActualizarLead()
  const eliminar = useEliminarLead()
  const toast = useToast()
  const navegar = useNavigate()

  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [origen, setOrigen] = useState<Origen | 'todos'>('todos')
  const [editando, setEditando] = useState<EnEdicion>(null)
  const [detalle, setDetalle] = useState<Lead | null>(null)
  const [aBorrar, setABorrar] = useState<Lead | null>(null)
  const [reprogramando, setReprogramando] = useState<Lead | null>(null)
  const [wizard, setWizard] = useState<{ lead: Lead; destino: LeadEstatus } | null>(null)

  const puede = puedeEscribir('leads')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: { origen: 'meta', estatus: 'nuevo' },
  })

  const estatusAlta = watch('estatus')
  const esAlta = editando === 'nuevo'

  const seguimientoVencido = (l: Lead) => {
    if (!l.fecha_seguimiento) return false
    if (l.estatus === 'agendado' || l.estatus === 'perdido') return false
    const d = diasDesdeHoy(l.fecha_seguimiento)
    return d != null && d <= 0
  }

  const conteos = useMemo(() => {
    const l = leads ?? []
    return {
      todos: l.length,
      nuevo: l.filter((x) => x.estatus === 'nuevo').length,
      cotizado: l.filter((x) => x.estatus === 'cotizado').length,
      agendado: l.filter((x) => x.estatus === 'agendado').length,
      perdido: l.filter((x) => x.estatus === 'perdido').length,
      seguimiento: l.filter(seguimientoVencido).length,
    }
  }, [leads])

  const filtrados = useMemo(() => {
    let v = leads ?? []
    if (filtro === 'seguimiento') v = v.filter(seguimientoVencido)
    else if (filtro !== 'todos') v = v.filter((l) => l.estatus === filtro)
    if (origen !== 'todos') v = v.filter((l) => l.origen === origen)

    // Agendados: lo que importa es qué se viene, no cuándo se registró.
    if (filtro === 'agendado') {
      return [...v].sort((a, b) => (a.fecha_tatuaje ?? '').localeCompare(b.fecha_tatuaje ?? ''))
    }
    return v
  }, [leads, filtro, origen])

  /** Agenda partida por cercanía: es como se lee entre cliente y cliente. */
  const grupos = useMemo(() => {
    if (filtro !== 'agendado') return null
    const g: { titulo: string; leads: Lead[] }[] = [
      { titulo: 'Pasadas sin cerrar', leads: [] },
      { titulo: 'Hoy', leads: [] },
      { titulo: 'Esta semana', leads: [] },
      { titulo: 'Más adelante', leads: [] },
    ]
    for (const l of filtrados) {
      const d = diasDesdeHoy(l.fecha_tatuaje)
      if (d == null) g[3].leads.push(l)
      else if (d < 0) g[0].leads.push(l)
      else if (d === 0) g[1].leads.push(l)
      else if (d <= 7) g[2].leads.push(l)
      else g[3].leads.push(l)
    }
    return g.filter((x) => x.leads.length > 0)
  }, [filtro, filtrados])

  const trabajoDe = (lead: Lead) => (trabajos ?? []).find((t) => t.lead_id === lead.id) ?? null

  function abrir(destino: EnEdicion) {
    setEditando(destino)
    if (destino === 'nuevo') {
      reset({
        nombre: '',
        whatsapp: '',
        origen: 'meta',
        estatus: 'nuevo',
        que_pidio: '',
        nivel_estimado: '',
        siguiente_accion: '',
        fecha_seguimiento: '',
        monto_cotizado: '' as unknown as number,
        zona: '',
        catalogo_id: '',
        fecha_tatuaje: '',
        hora: '',
        fecha_trazado: '',
        anticipo: '' as unknown as number,
      })
    } else if (destino) {
      reset({
        nombre: destino.nombre,
        whatsapp: destino.whatsapp,
        origen: destino.origen,
        // En edición el estatus no se toca: se mueve con el asistente, que
        // es quien sabe qué datos exige cada etapa.
        estatus: destino.estatus === 'perdido' ? 'nuevo' : destino.estatus,
        que_pidio: destino.que_pidio ?? '',
        nivel_estimado: destino.nivel_estimado ?? '',
        siguiente_accion: destino.siguiente_accion ?? '',
        fecha_seguimiento: destino.fecha_seguimiento ?? '',
        monto_cotizado: (destino.monto_cotizado ?? '') as unknown as number,
        zona: destino.zona ?? '',
        catalogo_id: destino.catalogo_id ?? '',
        fecha_tatuaje: destino.fecha_tatuaje ?? '',
        hora: destino.hora?.slice(0, 5) ?? '',
        fecha_trazado: destino.fecha_trazado ?? '',
        anticipo: (destino.anticipo || '') as unknown as number,
      })
    }
  }

  async function alGuardar(datos: Salida) {
    const campos: Partial<Lead> = {
      nombre: datos.nombre,
      whatsapp: datos.whatsapp.replace(/\D/g, ''),
      origen: datos.origen,
      que_pidio: datos.que_pidio || null,
      nivel_estimado: (datos.nivel_estimado || null) as Lead['nivel_estimado'],
      siguiente_accion: datos.siguiente_accion || null,
      fecha_seguimiento: datos.fecha_seguimiento || null,
      monto_cotizado: datos.monto_cotizado,
      zona: datos.zona || null,
      catalogo_id: datos.catalogo_id || null,
      anticipo: datos.anticipo ?? 0,
    }

    if (datos.monto_cotizado && !(editando !== 'nuevo' && editando?.cotizado_en)) {
      campos.cotizado_en = hoyISO()
    }

    // La cita solo se escribe desde aquí en el alta. Al editar se mueve con
    // "Mover cita", que además deja constancia del motivo.
    if (esAlta) {
      campos.estatus = datos.estatus
      campos.fecha_tatuaje = datos.fecha_tatuaje || null
      campos.hora = datos.hora || null
      campos.fecha_trazado = datos.fecha_trazado || null
    }

    try {
      if (esAlta) {
        await crear.mutateAsync(campos as never)
        toast.exito(
          datos.estatus === 'agendado'
            ? 'Lead agendado. Su expediente ya está en Trabajos.'
            : 'Lead registrado',
        )
      } else if (editando) {
        await actualizar.mutateAsync({ id: editando.id, cambios: campos })
        setDetalle((d) => (d && d.id === editando.id ? { ...d, ...campos } : d))
        toast.exito('Lead actualizado')
      }
      setEditando(null)
    } catch (e) {
      const err = e as { message?: string }
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  async function borrar() {
    if (!aBorrar) return
    try {
      await eliminar.mutateAsync(aBorrar.id)
      toast.exito('Lead eliminado')
      setABorrar(null)
      setDetalle(null)
    } catch (e) {
      const err = e as { message?: string }
      if (esDependencia(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
      throw e
    }
  }

  const pideCotizacion = estatusAlta !== 'nuevo'
  const pideAgenda = estatusAlta === 'agendado'

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Leads</h1>
          <p className="text-sm text-fg-muted">
            {conteos.cotizado > 0
              ? `${conteos.cotizado} cotizados esperando cierre`
              : 'Todo el que escribe entra el mismo día'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BotonCSV
            nombre="leads"
            filas={(leads ?? []).map((l) => ({
              fecha: l.fecha,
              nombre: l.nombre,
              whatsapp: l.whatsapp,
              origen: ORIGEN[l.origen],
              que_pidio: l.que_pidio,
              nivel_estimado: l.nivel_estimado,
              zona: l.zona,
              estatus: LEAD_ESTATUS[l.estatus].texto,
              monto_cotizado: l.monto_cotizado,
              anticipo: l.anticipo,
              fecha_tatuaje: l.fecha_tatuaje,
              hora: l.hora,
              siguiente_accion: l.siguiente_accion,
              fecha_seguimiento: l.fecha_seguimiento,
              motivo_perdida: l.motivo_perdida,
            }))}
          />
          {puede && (
            <Button onClick={() => abrir('nuevo')} className="hidden md:inline-flex">
              <Plus className="h-4 w-4" />
              Nuevo lead
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-2.5">
        <Segmentado
          idGrupo="leads"
          valor={filtro}
          onCambio={setFiltro}
          opciones={[
            { valor: 'todos', etiqueta: 'Todos', conteo: conteos.todos },
            { valor: 'seguimiento', etiqueta: 'Seguir hoy', conteo: conteos.seguimiento },
            { valor: 'nuevo', etiqueta: 'Nuevos', conteo: conteos.nuevo },
            { valor: 'cotizado', etiqueta: 'Por cerrar', conteo: conteos.cotizado },
            { valor: 'agendado', etiqueta: 'Agenda', conteo: conteos.agendado },
            { valor: 'perdido', etiqueta: 'Perdidos', conteo: conteos.perdido },
          ]}
        />

        <select
          value={origen}
          onChange={(e) => setOrigen(e.target.value as Origen | 'todos')}
          className="h-9 rounded-lg border border-line bg-surface-2 px-3 text-sm text-fg-muted"
        >
          <option value="todos">Todos los orígenes</option>
          {Object.entries(ORIGEN).map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
      ) : isPending ? (
        <SkeletonLista />
      ) : filtrados.length === 0 ? (
        <Vacio
          icono={<UserPlus className="h-6 w-6" />}
          titulo={filtro === 'todos' ? 'Sin leads todavía' : 'Nada con este filtro'}
          descripcion={
            filtro === 'todos'
              ? 'Cada persona que escriba por WhatsApp se registra aquí el mismo día.'
              : filtro === 'seguimiento'
                ? 'Nadie con seguimiento vencido. Vas al corriente.'
                : 'Prueba con otro estatus u origen.'
          }
          accion={
            puede && filtro === 'todos' ? (
              <Button onClick={() => abrir('nuevo')}>Registrar el primero</Button>
            ) : undefined
          }
        />
      ) : grupos ? (
        <div className="space-y-5">
          {/* Sin `layout`, por lo mismo que en Trabajos: medir la posición
              mientras un ancestro se está animando dejaba las secciones
              desplazadas fuera de la pantalla. */}
          <AnimatePresence initial={false}>
            {grupos.map((g) => (
              <motion.section
                key={g.titulo}
                variants={ENTRADA}
                initial="oculto"
                animate="visible"
                exit="saliendo"
                transition={transicion()}
              >
                <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                  {g.titulo} · {g.leads.length}
                </h2>
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {g.leads.map((l, i) => (
                      <TarjetaLead
                        key={l.id}
                        lead={l}
                        indice={i}
                        vencido={seguimientoVencido(l)}
                        onAbrir={() => setDetalle(l)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.section>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filtrados.map((l, i) => (
              <TarjetaLead
                key={l.id}
                lead={l}
                indice={i}
                vencido={seguimientoVencido(l)}
                onAbrir={() => setDetalle(l)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {puede && (
        <BotonFlotante data-tour="nuevo-lead" onClick={() => abrir('nuevo')} aria-label="Nuevo lead">
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      {/* ── Alta y edición ───────────────────────────────────────────── */}
      <Sheet
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={esAlta ? 'Nuevo lead' : 'Editar lead'}
        descripcion={
          esAlta
            ? 'Si ya viene cotizado o agendado, márcalo aquí mismo.'
            : 'La etapa y la cita se mueven desde el detalle.'
        }
        pie={
          <Button bloque tamano="lg" cargando={isSubmitting} onClick={handleSubmit(alGuardar)}>
            {esAlta ? 'Guardar lead' : 'Guardar cambios'}
          </Button>
        }
      >
        <form onSubmit={handleSubmit(alGuardar)} className="space-y-4">
          <Input
            etiqueta="Nombre"
            autoFocus
            autoComplete="name"
            placeholder="Cómo se llama"
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <InputNumero
            etiqueta="WhatsApp"
            placeholder="3141234567"
            hint="10 dígitos, sin lada de país"
            error={errors.whatsapp?.message}
            {...register('whatsapp')}
          />
          <Select etiqueta="Origen" error={errors.origen?.message} {...register('origen')}>
            {Object.entries(ORIGEN).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </Select>

          {esAlta && (
            <Select
              etiqueta="¿En qué punto está?"
              hint="Marca hasta dónde llegó ya. Los datos de cada etapa se piden abajo."
              {...register('estatus')}
            >
              {EMBUDO_LEAD.map((e) => (
                <option key={e} value={e}>
                  {LEAD_ESTATUS[e].texto} — {LEAD_ESTATUS[e].descripcion}
                </option>
              ))}
            </Select>
          )}

          <Textarea
            etiqueta="Qué pidió"
            placeholder="Nombre de su hija, antebrazo"
            {...register('que_pidio')}
          />

          {/* Cotización: aparece sola en cuanto la etapa la requiere */}
          {(pideCotizacion || !esAlta) && (
            <fieldset className="space-y-3 rounded-2xl border border-line bg-surface-2/50 p-3.5">
              <legend className="px-1 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                Cotización
              </legend>

              <Select etiqueta="Diseño del catálogo" {...register('catalogo_id')}>
                <option value="">Sin catálogo (personalizado)</option>
                {(catalogo ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id} · {d.nombre} · {dinero(d.precio_base)}
                  </option>
                ))}
              </Select>

              <InputNumero
                etiqueta="Monto cotizado"
                prefijo="$"
                error={errors.monto_cotizado?.message}
                {...register('monto_cotizado')}
              />

              <div className="grid grid-cols-2 gap-3">
                <Select etiqueta="Nivel" {...register('nivel_estimado')}>
                  <option value="">Sin definir</option>
                  <option value="1">Nivel 1</option>
                  <option value="2">Nivel 2</option>
                  <option value="3">Nivel 3</option>
                </Select>
                <Select etiqueta="Zona" {...register('zona')}>
                  <option value="">Sin definir</option>
                  {ZONAS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
              </div>
            </fieldset>
          )}

          {/* Agenda: solo en el alta. Después se mueve con motivo. */}
          {esAlta && pideAgenda && (
            <fieldset className="space-y-3 rounded-2xl border border-line bg-surface-2/50 p-3.5">
              <legend className="px-1 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                Cita y anticipo
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  etiqueta="Fecha del tatuaje"
                  type="date"
                  error={errors.fecha_tatuaje?.message}
                  {...register('fecha_tatuaje')}
                />
                <Input etiqueta="Hora" type="time" {...register('hora')} />
              </div>
              <Input
                etiqueta="Fecha de trazado"
                type="date"
                hint="Opcional, 20 min antes de la sesión"
                {...register('fecha_trazado')}
              />
              <InputNumero
                etiqueta="Anticipo cobrado"
                prefijo="$"
                error={errors.anticipo?.message}
                {...register('anticipo')}
              />
              <p className="rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5 text-sm text-success">
                Al guardar se crea solo su expediente en Trabajos.
              </p>
            </fieldset>
          )}

          {!pideAgenda && (
            <>
              <Input
                etiqueta="Siguiente acción"
                placeholder="Mandar 2 horarios + pedir foto de zona"
                {...register('siguiente_accion')}
              />
              <Input
                etiqueta="Fecha de seguimiento"
                type="date"
                hint="Si llega esta fecha y sigue abierto, aparece en rojo y en el tablero."
                {...register('fecha_seguimiento')}
              />
            </>
          )}
        </form>
      </Sheet>

      {/* ── Detalle ──────────────────────────────────────────────────── */}
      <Sheet
        abierto={Boolean(detalle)}
        onCerrar={() => setDetalle(null)}
        titulo={detalle?.nombre ?? ''}
        descripcion={detalle ? `${ORIGEN[detalle.origen]} · ${telFormateado(detalle.whatsapp)}` : ''}
      >
        {detalle && (
          <div className="space-y-5">
            <a
              href={urlWhatsApp(detalle.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-success/12 text-base font-medium text-success"
            >
              <MessageCircle className="h-5 w-5" />
              Abrir WhatsApp
            </a>

            <div className="space-y-3 text-sm">
              <Dato titulo="Etapa" valor={LEAD_ESTATUS[detalle.estatus].texto} />
              <Dato titulo="Qué pidió" valor={detalle.que_pidio} />
              <Dato titulo="Cotizado" valor={detalle.monto_cotizado ? dinero(detalle.monto_cotizado) : null} />
              <Dato titulo="Zona" valor={detalle.zona} />
              <Dato
                titulo="Nivel"
                valor={detalle.nivel_estimado ? `Nivel ${detalle.nivel_estimado}` : null}
              />
              {detalle.estatus === 'agendado' && (
                <>
                  <Dato
                    titulo="Cita"
                    valor={`${fechaCorta(detalle.fecha_tatuaje)}${detalle.hora ? ` · ${hora12(detalle.hora)}` : ''}`}
                  />
                  <Dato titulo="Trazado" valor={fechaCorta(detalle.fecha_trazado)} />
                  <Dato titulo="Anticipo" valor={dinero(detalle.anticipo)} />
                  <Dato
                    titulo="Saldo"
                    valor={
                      detalle.monto_cotizado
                        ? dinero(detalle.monto_cotizado - detalle.anticipo)
                        : null
                    }
                  />
                </>
              )}
              {detalle.estatus !== 'agendado' && (
                <>
                  <Dato titulo="Siguiente acción" valor={detalle.siguiente_accion} />
                  <Dato titulo="Seguimiento" valor={fechaCorta(detalle.fecha_seguimiento)} />
                </>
              )}
              {detalle.motivo_perdida && (
                <Dato titulo="Motivo de pérdida" valor={detalle.motivo_perdida} />
              )}
              <Dato titulo="Registrado" valor={fechaCorta(detalle.fecha)} />
            </div>

            {/* El expediente que salió de este lead */}
            {trabajoDe(detalle) && (
              <button
                onClick={() => navegar(`/trabajos/${trabajoDe(detalle)!.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left transition-colors hover:border-line-strong"
              >
                <Briefcase className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-base text-fg">Ver su trabajo</p>
                  <p className="text-sm text-fg-subtle">
                    {trabajoDe(detalle)!.id} · {trabajoDe(detalle)!.diseno}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
              </button>
            )}

            {puede && (
              <>
                {detalle.estatus === 'agendado' && (
                  <Button
                    variante="secundario"
                    bloque
                    onClick={() => {
                      setReprogramando(detalle)
                      setDetalle(null)
                    }}
                  >
                    <CalendarClock className="h-4 w-4" />
                    Mover la cita
                  </Button>
                )}

                <div>
                  <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                    Mover a
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(LEAD_ESTATUS) as LeadEstatus[]).map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          setWizard({ lead: detalle, destino: e })
                          setDetalle(null)
                        }}
                        disabled={detalle.estatus === e}
                        className="rounded-xl border border-line px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:border-primary/40 disabled:bg-primary/10 disabled:text-primary"
                      >
                        {LEAD_ESTATUS[e].texto}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-line pt-4">
                  <Button
                    variante="secundario"
                    className="flex-1"
                    onClick={() => {
                      abrir(detalle)
                      setDetalle(null)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variante="peligro" onClick={() => setABorrar(detalle)}>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Sheet>

      <WizardEstatusLead
        lead={wizard?.lead ?? null}
        destino={wizard?.destino ?? null}
        abierto={Boolean(wizard)}
        onCerrar={() => setWizard(null)}
      />

      <ReprogramarCita
        lead={reprogramando}
        abierto={Boolean(reprogramando)}
        onCerrar={() => setReprogramando(null)}
      />

      <ConfirmarBorrado
        abierto={Boolean(aBorrar)}
        onCerrar={() => setABorrar(null)}
        onConfirmar={borrar}
        titulo="¿Eliminar este lead?"
        descripcion={
          <>
            Se borra <span className="text-fg">{aBorrar?.nombre}</span> con su cotización y su
            seguimiento. Deja de contar como conversación en el tablero.
          </>
        }
      />
    </div>
  )
}

function TarjetaLead({
  lead,
  indice,
  vencido,
  onAbrir,
}: {
  lead: Lead
  indice: number
  vencido: boolean
  onAbrir: () => void
}) {
  const agendado = lead.estatus === 'agendado'
  const dias = diasDesdeHoy(lead.fecha_tatuaje)

  return (
    <CardAnimada indice={indice} onClick={onAbrir}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-medium text-fg">{lead.nombre}</p>
            {vencido && (
              <Badge tono="peligro" punto>
                Seguir hoy
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-fg-muted">
            {lead.que_pidio || 'Sin detalle de lo que pidió'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
            <span>{ORIGEN[lead.origen]}</span>
            <span className="tabular">{telFormateado(lead.whatsapp)}</span>
            {lead.zona && <span>{lead.zona}</span>}
            {!agendado && lead.fecha_seguimiento && (
              <span className={vencido ? 'text-danger' : undefined}>
                Seguir {fechaCorta(lead.fecha_seguimiento)}
              </span>
            )}
          </div>

          {agendado && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
              <span
                className={cn(
                  'font-medium',
                  dias != null && dias < 0
                    ? 'text-danger'
                    : dias === 0
                      ? 'text-success'
                      : 'text-fg',
                )}
              >
                {cuandoTexto(lead.fecha_tatuaje)}
              </span>
              <span className="text-fg-subtle">
                {fechaCorta(lead.fecha_tatuaje)}
                {lead.hora ? ` · ${hora12(lead.hora)}` : ''}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge tono={LEAD_ESTATUS[lead.estatus].tono}>{LEAD_ESTATUS[lead.estatus].texto}</Badge>
          {lead.monto_cotizado != null && (
            <span className="tabular text-sm text-fg">{dinero(lead.monto_cotizado)}</span>
          )}
          {agendado && lead.monto_cotizado != null && lead.monto_cotizado - lead.anticipo > 0 && (
            <span className="tabular text-xs text-warn">
              Debe {dinero(lead.monto_cotizado - lead.anticipo)}
            </span>
          )}
          <a
            href={urlWhatsApp(lead.whatsapp)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Abrir WhatsApp de ${lead.nombre}`}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/12 text-success transition-colors hover:bg-success/20"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
      </div>
    </CardAnimada>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string | null | undefined }) {
  return (
    <div className="flex gap-4 border-b border-line pb-3 last:border-0">
      <span className="w-32 shrink-0 text-fg-subtle">{titulo}</span>
      <span className="min-w-0 flex-1 text-fg">{valor || '—'}</span>
    </div>
  )
}
