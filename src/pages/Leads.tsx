import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence } from 'framer-motion'
import { ArrowRight, MessageCircle, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import {
  useLeads,
  useActualizarLead,
  useCrearLead,
  useEliminarLead,
} from '../lib/queries/leads'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Input, InputNumero, Select, Textarea } from '../components/ui/Campo'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { CardAnimada } from '../components/ui/Card'
import { Segmentado } from '../components/ui/Segmentado'
import { SkeletonLista, Vacio, ErrorCarga } from '../components/ui/Estados'
import { FormTrabajo } from '../components/FormTrabajo'
import { BotonCSV } from '../components/BotonCSV'
import { ConfirmarBorrado } from '../components/ConfirmarBorrado'
import { LEAD_ESTATUS, ORIGEN } from '../lib/etiquetas'
import { diasDesdeHoy, fechaCorta, telFormateado, urlWhatsApp } from '../lib/formato'
import { mensajeDeError, esReglaDeNegocio, esDependencia } from '../lib/errores'
import type { Lead, LeadEstatus, Origen } from '../lib/tipos'

const esquema = z.object({
  nombre: z.string().min(1, 'Falta el nombre'),
  whatsapp: z
    .string()
    .min(10, 'Faltan dígitos')
    .refine((v) => v.replace(/\D/g, '').length >= 10, 'El WhatsApp debe traer 10 dígitos'),
  origen: z.enum(['tiktok', 'meta', 'organico', 'referido', 'conocido']),
  que_pidio: z.string().optional(),
  nivel_estimado: z.enum(['1', '2', '3']).optional().or(z.literal('')),
  siguiente_accion: z.string().optional(),
  fecha_seguimiento: z.string().optional(),
})

type Formulario = z.infer<typeof esquema>

type FiltroEstatus = LeadEstatus | 'todos' | 'vencidos'

/** null = cerrado, 'nuevo' = alta, un lead = edición. */
type EnEdicion = Lead | 'nuevo' | null

export function Leads() {
  const { data: leads, isPending, error, refetch } = useLeads()
  const { puedeEscribir } = useRol()
  const crear = useCrearLead()
  const actualizar = useActualizarLead()
  const eliminar = useEliminarLead()
  const toast = useToast()

  const [filtro, setFiltro] = useState<FiltroEstatus>('todos')
  const [origen, setOrigen] = useState<Origen | 'todos'>('todos')
  const [editando, setEditando] = useState<EnEdicion>(null)
  const [detalle, setDetalle] = useState<Lead | null>(null)
  const [convertir, setConvertir] = useState<Lead | null>(null)
  const [aBorrar, setABorrar] = useState<Lead | null>(null)

  const puede = puedeEscribir('leads')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { origen: 'meta' },
  })

  const vencido = (l: Lead) => {
    if (!l.fecha_seguimiento) return false
    if (l.estatus === 'agendado' || l.estatus === 'perdido') return false
    const d = diasDesdeHoy(l.fecha_seguimiento)
    return d != null && d <= 0
  }

  const filtrados = useMemo(() => {
    let v = leads ?? []
    if (filtro === 'vencidos') v = v.filter(vencido)
    else if (filtro !== 'todos') v = v.filter((l) => l.estatus === filtro)
    if (origen !== 'todos') v = v.filter((l) => l.origen === origen)
    return v
  }, [leads, filtro, origen])

  const conteos = useMemo(() => {
    const l = leads ?? []
    return {
      todos: l.length,
      vencidos: l.filter(vencido).length,
      nuevo: l.filter((x) => x.estatus === 'nuevo').length,
      cotizado: l.filter((x) => x.estatus === 'cotizado').length,
      agendado: l.filter((x) => x.estatus === 'agendado').length,
      perdido: l.filter((x) => x.estatus === 'perdido').length,
    }
  }, [leads])

  function abrir(destino: EnEdicion) {
    setEditando(destino)
    if (destino === 'nuevo') {
      reset({
        nombre: '',
        whatsapp: '',
        origen: 'meta',
        que_pidio: '',
        nivel_estimado: '',
        siguiente_accion: '',
        fecha_seguimiento: '',
      })
    } else if (destino) {
      reset({
        nombre: destino.nombre,
        whatsapp: destino.whatsapp,
        origen: destino.origen,
        que_pidio: destino.que_pidio ?? '',
        nivel_estimado: destino.nivel_estimado ?? '',
        siguiente_accion: destino.siguiente_accion ?? '',
        fecha_seguimiento: destino.fecha_seguimiento ?? '',
      })
    }
  }

  async function alGuardar(datos: Formulario) {
    const campos = {
      nombre: datos.nombre,
      whatsapp: datos.whatsapp.replace(/\D/g, ''),
      origen: datos.origen,
      que_pidio: datos.que_pidio || null,
      nivel_estimado: datos.nivel_estimado ? datos.nivel_estimado : null,
      siguiente_accion: datos.siguiente_accion || null,
      fecha_seguimiento: datos.fecha_seguimiento || null,
    }

    try {
      if (editando === 'nuevo') {
        await crear.mutateAsync(campos)
        toast.exito('Lead registrado')
      } else if (editando) {
        await actualizar.mutateAsync({ id: editando.id, cambios: campos })
        // El detalle puede estar mostrando la versión vieja detrás.
        setDetalle((d) => (d && d.id === editando.id ? { ...d, ...campos } : d))
        toast.exito('Lead actualizado')
      }
      setEditando(null)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
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
      // "Ya es un trabajo" no es un fallo: es la base cuidando el expediente.
      if (esDependencia(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
      throw e
    }
  }

  const esAlta = editando === 'nuevo'

  async function cambiarEstatus(lead: Lead, estatus: LeadEstatus) {
    try {
      await actualizar.mutateAsync({ id: lead.id, cambios: { estatus } })
      setDetalle((d) => (d ? { ...d, estatus } : d))
    } catch (e) {
      const err = e as { message?: string }
      if (esReglaDeNegocio(err)) toast.regla(mensajeDeError(err))
      else toast.error(mensajeDeError(err))
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Leads</h1>
          <p className="text-sm text-fg-muted">
            {conteos.vencidos > 0
              ? `${conteos.vencidos} con seguimiento vencido`
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
              estatus: LEAD_ESTATUS[l.estatus].texto,
              siguiente_accion: l.siguiente_accion,
              fecha_seguimiento: l.fecha_seguimiento,
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
            { valor: 'vencidos', etiqueta: 'Vencidos', conteo: conteos.vencidos },
            { valor: 'nuevo', etiqueta: 'Nuevos', conteo: conteos.nuevo },
            { valor: 'cotizado', etiqueta: 'Cotizados', conteo: conteos.cotizado },
            { valor: 'agendado', etiqueta: 'Agendados', conteo: conteos.agendado },
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
              : 'Prueba con otro estatus u origen.'
          }
          accion={
            puede && filtro === 'todos' ? (
              <Button onClick={() => abrir('nuevo')}>Registrar el primero</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filtrados.map((l, i) => (
              <CardAnimada key={l.id} indice={i} onClick={() => setDetalle(l)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-medium text-fg">{l.nombre}</p>
                      {vencido(l) && (
                        <Badge tono="peligro" punto>
                          Vencido
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-fg-muted">
                      {l.que_pidio || 'Sin detalle de lo que pidió'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
                      <span>{ORIGEN[l.origen]}</span>
                      <span className="tabular">{telFormateado(l.whatsapp)}</span>
                      {l.fecha_seguimiento && (
                        <span className={vencido(l) ? 'text-danger' : undefined}>
                          Seguir {fechaCorta(l.fecha_seguimiento)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge tono={LEAD_ESTATUS[l.estatus].tono}>
                      {LEAD_ESTATUS[l.estatus].texto}
                    </Badge>
                    <a
                      href={urlWhatsApp(l.whatsapp)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Abrir WhatsApp de ${l.nombre}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/12 text-success transition-colors hover:bg-success/20"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </CardAnimada>
            ))}
          </AnimatePresence>
        </div>
      )}

      {puede && (
        <BotonFlotante
          data-tour="nuevo-lead"
          onClick={() => abrir('nuevo')}
          aria-label="Nuevo lead"
        >
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      {/* ── Alta rápida: la meta es menos de 15 segundos ──────────────── */}
      <Sheet
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={esAlta ? 'Nuevo lead' : 'Editar lead'}
        descripcion={
          esAlta
            ? 'Lo mínimo para no perderlo. El resto se llena después.'
            : 'El estatus se cambia desde el detalle, no aquí.'
        }
        pie={
          <Button
            bloque
            tamano="lg"
            cargando={isSubmitting}
            onClick={handleSubmit(alGuardar)}
          >
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
          <Textarea
            etiqueta="Qué pidió"
            placeholder="Nombre de su hija, antebrazo"
            {...register('que_pidio')}
          />
          <Select etiqueta="Nivel estimado" {...register('nivel_estimado')}>
            <option value="">Todavía no sé</option>
            <option value="1">Nivel 1</option>
            <option value="2">Nivel 2</option>
            <option value="3">Nivel 3</option>
          </Select>
          <Input
            etiqueta="Siguiente acción"
            placeholder="Mandar 2 horarios + pedir foto de zona"
            {...register('siguiente_accion')}
          />
          <Input
            etiqueta="Fecha de seguimiento"
            type="date"
            hint="Si llega esta fecha y sigue abierto, aparece en rojo."
            {...register('fecha_seguimiento')}
          />
        </form>
      </Sheet>

      {/* ── Detalle del lead ─────────────────────────────────────────── */}
      <Sheet
        abierto={Boolean(detalle)}
        onCerrar={() => setDetalle(null)}
        titulo={detalle?.nombre ?? ''}
        descripcion={detalle ? `${ORIGEN[detalle.origen]} · ${telFormateado(detalle.whatsapp)}` : ''}
        pie={
          detalle && puede ? (
            <Button
              bloque
              tamano="lg"
              onClick={() => {
                setConvertir(detalle)
                setDetalle(null)
              }}
            >
              Convertir en trabajo
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : undefined
        }
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
              <Dato titulo="Qué pidió" valor={detalle.que_pidio} />
              <Dato titulo="Siguiente acción" valor={detalle.siguiente_accion} />
              <Dato titulo="Seguimiento" valor={fechaCorta(detalle.fecha_seguimiento)} />
              <Dato
                titulo="Nivel estimado"
                valor={detalle.nivel_estimado ? `Nivel ${detalle.nivel_estimado}` : null}
              />
              <Dato titulo="Registrado" valor={fechaCorta(detalle.fecha)} />
            </div>

            {puede && (
              <div>
                <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Mover a
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(LEAD_ESTATUS) as LeadEstatus[]).map((e) => (
                    <button
                      key={e}
                      onClick={() => void cambiarEstatus(detalle, e)}
                      disabled={detalle.estatus === e}
                      className="rounded-xl border border-line px-3 py-2.5 text-sm text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:border-primary/40 disabled:bg-primary/10 disabled:text-primary"
                    >
                      {LEAD_ESTATUS[e].texto}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {puede && (
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
            )}
          </div>
        )}
      </Sheet>

      {/* ── Convertir lead → trabajo, con datos precargados ──────────── */}
      <Sheet
        abierto={Boolean(convertir)}
        onCerrar={() => setConvertir(null)}
        titulo="Nuevo trabajo"
        descripcion={convertir ? `Desde el lead de ${convertir.nombre}` : ''}
      >
        {convertir && (
          <FormTrabajo
            inicial={{
              lead_id: convertir.id,
              cliente: convertir.nombre,
              whatsapp: convertir.whatsapp,
              diseno: convertir.que_pidio ?? '',
              nivel: convertir.nivel_estimado ?? '1',
              origen: convertir.origen,
            }}
            alGuardar={async () => {
              await actualizar.mutateAsync({
                id: convertir.id,
                cambios: { estatus: 'trazado_agendado' },
              })
              setConvertir(null)
            }}
          />
        )}
      </Sheet>

      <ConfirmarBorrado
        abierto={Boolean(aBorrar)}
        onCerrar={() => setABorrar(null)}
        onConfirmar={borrar}
        titulo="¿Eliminar este lead?"
        descripcion={
          <>
            Se borra <span className="text-fg">{aBorrar?.nombre}</span> con su WhatsApp, su origen y
            su seguimiento. Deja de contar como conversación en el tablero.
          </>
        }
      />
    </div>
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
