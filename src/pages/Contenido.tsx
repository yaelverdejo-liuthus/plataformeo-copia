import { useMemo, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Plus, Sparkles, Trash2, Video } from 'lucide-react'
import {
  useContenido,
  useCrearContenido,
  useActualizarContenido,
  useEliminarContenido,
} from '../lib/queries/contenido'
import { useTrabajos } from '../lib/queries/trabajos'
import { useUmbrales } from '../lib/queries/config'
import { useRol } from '../hooks/useRol'
import { useToast } from '../components/ui/Toast'
import { Button, BotonFlotante } from '../components/ui/Button'
import { Input, InputNumero, Select, Switch } from '../components/ui/Campo'
import { Sheet } from '../components/ui/Sheet'
import { Badge } from '../components/ui/Badge'
import { CardAnimada } from '../components/ui/Card'
import { Segmentado } from '../components/ui/Segmentado'
import { SkeletonLista, Vacio, ErrorCarga } from '../components/ui/Estados'
import { BotonCSV } from '../components/BotonCSV'
import { ConfirmarBorrado } from '../components/ConfirmarBorrado'
import { FORMATO, PLATAFORMA } from '../lib/etiquetas'
import { dinero, fechaCorta, hoyISO, numero } from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import type { Contenido as Video_, ContenidoConFiltro } from '../lib/tipos'

const esquema = z.object({
  titulo: z.string().min(1, 'Falta el gancho'),
  plataforma: z.enum(['tiktok', 'instagram', 'facebook']),
  formato: z.preprocess((v) => Number(v), z.number().int().min(1).max(7)),
  trabajo_id: z.string().optional(),
  precio_en_pantalla: z.boolean(),
  fecha: z.string().min(1),
  promocionado: z.boolean(),
  gasto_promocion: z.preprocess(
    (v) => (v === '' || v == null ? 0 : Number(String(v).replace(/[^\d.]/g, ''))),
    z.number().min(0, 'No puede ser negativo'),
  ),
})

type Formulario = z.input<typeof esquema>
type Salida = z.output<typeof esquema>

type Filtro = 'todos' | 'hoy' | 'aptos' | 'pendientes'

/** null = cerrado, 'nuevo' = alta, un video = edición. */
type EnEdicion = ContenidoConFiltro | 'nuevo' | null

export function Contenido() {
  const { data: contenido, isPending, error, refetch } = useContenido()
  const { data: trabajos } = useTrabajos()
  const { umbrales } = useUmbrales()
  const { puedeEscribir } = useRol()
  const crear = useCrearContenido()
  const actualizar = useActualizarContenido()
  const eliminar = useEliminarContenido()
  const toast = useToast()

  const [filtro, setFiltro] = useState<Filtro>('hoy')
  const [editando, setEditando] = useState<EnEdicion>(null)
  const [aBorrar, setABorrar] = useState<ContenidoConFiltro | null>(null)

  const puede = puedeEscribir('contenido')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Formulario, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: {
      plataforma: 'tiktok',
      formato: 1,
      precio_en_pantalla: false,
      fecha: hoyISO(),
      promocionado: false,
      gasto_promocion: 0,
    },
  })

  /** Apto para promoción: pasa el filtro y todavía no se promociona. */
  const esPendiente = (c: ContenidoConFiltro) => c.pasa_filtro === true && !c.promocionado

  const conteos = useMemo(() => {
    const l = contenido ?? []
    return {
      todos: l.length,
      hoy: l.filter((c) => c.fecha === hoyISO()).length,
      aptos: l.filter((c) => c.pasa_filtro === true).length,
      pendientes: l.filter(esPendiente).length,
    }
  }, [contenido])

  const filtrados = useMemo(() => {
    const l = contenido ?? []
    if (filtro === 'hoy') return l.filter((c) => c.fecha === hoyISO())
    if (filtro === 'aptos') return l.filter((c) => c.pasa_filtro === true)
    if (filtro === 'pendientes') return l.filter(esPendiente)
    return l
  }, [contenido, filtro])

  function abrir(destino: EnEdicion) {
    setEditando(destino)
    if (destino === 'nuevo') {
      reset({
        titulo: '',
        plataforma: 'tiktok',
        formato: 1,
        trabajo_id: '',
        precio_en_pantalla: false,
        fecha: hoyISO(),
        promocionado: false,
        gasto_promocion: 0,
      })
    } else if (destino) {
      reset({
        titulo: destino.titulo,
        plataforma: destino.plataforma,
        formato: destino.formato,
        trabajo_id: destino.trabajo_id ?? '',
        precio_en_pantalla: destino.precio_en_pantalla,
        fecha: destino.fecha,
        promocionado: destino.promocionado,
        gasto_promocion: Number(destino.gasto_promocion),
      })
    }
  }

  async function alGuardar(datos: Salida) {
    const campos = {
      titulo: datos.titulo,
      plataforma: datos.plataforma,
      formato: datos.formato,
      trabajo_id: datos.trabajo_id || null,
      precio_en_pantalla: datos.precio_en_pantalla,
      fecha: datos.fecha,
      promocionado: datos.promocionado,
      gasto_promocion: datos.gasto_promocion,
    }

    try {
      if (editando === 'nuevo') {
        await crear.mutateAsync(campos)
        toast.exito('Video registrado. Vuelve a las 4 h por las métricas.')
      } else if (editando) {
        await actualizar.mutateAsync({ id: editando.id, cambios: campos })
        toast.exito('Video actualizado')
      }
      setEditando(null)
    } catch (e) {
      toast.error(mensajeDeError(e as { message?: string }))
    }
  }

  /**
   * Las métricas se guardan al salir del campo, sin await. Si la base las
   * rechaza hay que decirlo: antes el valor se revertía solo y se veía
   * idéntico a "la app no me deja editar".
   */
  function guardarMetrica(id: string, cambios: Partial<Video_>) {
    actualizar.mutate(
      { id, cambios },
      { onError: (e) => toast.error(mensajeDeError(e as { message?: string })) },
    )
  }

  async function borrar() {
    if (!aBorrar) return
    try {
      await eliminar.mutateAsync(aBorrar.id)
      toast.exito('Video eliminado')
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
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Contenido</h1>
          <p className="text-sm text-fg-muted">
            Métricas a las 4 h · filtro: {numero(umbrales.filtro_vistas_4h)} vistas y{' '}
            {numero(umbrales.filtro_guardados_4h)} guardados
          </p>
        </div>
        <div className="flex items-center gap-1">
          <BotonCSV
            nombre="contenido"
            filas={(contenido ?? []).map((c) => ({
              fecha: c.fecha,
              titulo: c.titulo,
              plataforma: PLATAFORMA[c.plataforma],
              formato: FORMATO[c.formato],
              trabajo_id: c.trabajo_id,
              precio_en_pantalla: c.precio_en_pantalla ? 'Sí' : 'No',
              vistas_4h: c.vistas_4h,
              guardados_4h: c.guardados_4h,
              comentarios: c.comentarios,
              pasa_filtro: c.pasa_filtro === true ? 'SI' : c.pasa_filtro === false ? 'NO' : '',
              promocionado: c.promocionado ? 'Sí' : 'No',
              gasto_promocion: c.gasto_promocion,
            }))}
          />
          {puede && (
            <Button onClick={() => abrir('nuevo')} className="hidden md:inline-flex">
              <Plus className="h-4 w-4" />
              Nuevo video
            </Button>
          )}
        </div>
      </header>

      <div data-tour="filtros-contenido">
      <Segmentado
        idGrupo="contenido"
        valor={filtro}
        onCambio={setFiltro}
        opciones={[
          { valor: 'hoy', etiqueta: 'Hoy', conteo: conteos.hoy },
          { valor: 'pendientes', etiqueta: 'Por promocionar', conteo: conteos.pendientes },
          { valor: 'aptos', etiqueta: 'Pasan filtro', conteo: conteos.aptos },
          { valor: 'todos', etiqueta: 'Todos', conteo: conteos.todos },
        ]}
      />
      </div>

      {error ? (
        <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
      ) : isPending ? (
        <SkeletonLista />
      ) : filtrados.length === 0 ? (
        <Vacio
          icono={<Video className="h-6 w-6" />}
          titulo={filtro === 'hoy' ? 'Sin videos hoy' : 'Nada con este filtro'}
          descripcion={
            filtro === 'hoy'
              ? 'Cada video se registra al publicarlo, y sus métricas a las 4 horas.'
              : 'Prueba con otro filtro.'
          }
          accion={
            puede && filtro === 'hoy' ? (
              <Button onClick={() => abrir('nuevo')}>Registrar el primero</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {filtrados.map((c, i) => (
              <CardAnimada key={c.id} indice={i}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-fg">{c.titulo}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-fg-subtle">
                      <span>{PLATAFORMA[c.plataforma]}</span>
                      <span>{FORMATO[c.formato]}</span>
                      <span>{fechaCorta(c.fecha)}</span>
                      {c.precio_en_pantalla && <span>Con precio</span>}
                    </div>
                  </div>

                  {puede && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <BotonIcono
                        etiqueta={`Editar ${c.titulo}`}
                        onClick={() => abrir(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </BotonIcono>
                      <BotonIcono
                        etiqueta={`Eliminar ${c.titulo}`}
                        peligro
                        onClick={() => setABorrar(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </BotonIcono>
                    </div>
                  )}
                </div>

                {(c.pasa_filtro === true || c.promocionado) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {c.pasa_filtro === true && (
                      <motion.span
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                      >
                        <Badge tono="exito" punto>
                          Pasa filtro
                        </Badge>
                      </motion.span>
                    )}
                    {c.promocionado && (
                      <Badge tono="primario">Promocionado {dinero(c.gasto_promocion)}</Badge>
                    )}
                  </div>
                )}

                {/* Edición inline: es lo que se captura a las 4 h, tiene que
                    ser un tap y escribir, no abrir un formulario. */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MetricaInline
                    etiqueta="Vistas 4h"
                    valor={c.vistas_4h}
                    editable={puede}
                    onGuardar={(v) => guardarMetrica(c.id, { vistas_4h: v })}
                  />
                  <MetricaInline
                    etiqueta="Guardados"
                    valor={c.guardados_4h}
                    editable={puede}
                    onGuardar={(v) => guardarMetrica(c.id, { guardados_4h: v })}
                  />
                  <MetricaInline
                    etiqueta="Comentarios"
                    valor={c.comentarios}
                    editable={puede}
                    onGuardar={(v) => guardarMetrica(c.id, { comentarios: v })}
                  />
                </div>

                {esPendiente(c) && puede && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 rounded-xl border border-success/25 bg-success/10 px-3.5 py-2.5">
                      <Sparkles className="h-4 w-4 shrink-0 text-success" />
                      <p className="min-w-0 flex-1 text-sm text-success">
                        Ya funcionó orgánico. Este sí merece presupuesto.
                      </p>
                      <button
                        onClick={() => guardarMetrica(c.id, { promocionado: true })}
                        className="shrink-0 text-sm font-medium text-success underline underline-offset-4"
                      >
                        Marcar promocionado
                      </button>
                    </div>
                  </motion.div>
                )}
              </CardAnimada>
            ))}
          </AnimatePresence>
        </div>
      )}

      {puede && (
        <BotonFlotante
          data-tour="nuevo-video"
          onClick={() => abrir('nuevo')}
          aria-label="Nuevo video"
        >
          <Plus className="h-6 w-6" />
        </BotonFlotante>
      )}

      <Sheet
        abierto={Boolean(editando)}
        onCerrar={() => setEditando(null)}
        titulo={esAlta ? 'Nuevo video' : 'Editar video'}
        descripcion={
          esAlta
            ? 'Solo lo que sabes al publicar. Las métricas van a las 4 h.'
            : 'Las métricas se editan en la tarjeta, tocando el número.'
        }
        pie={
          <Button bloque tamano="lg" cargando={isSubmitting} onClick={handleSubmit(alGuardar)}>
            {esAlta ? 'Guardar video' : 'Guardar cambios'}
          </Button>
        }
      >
        <form onSubmit={handleSubmit(alGuardar)} className="space-y-4">
          <Input
            etiqueta="Título / gancho"
            autoFocus
            placeholder="Cuánto cuesta el nombre de tu hija"
            error={errors.titulo?.message}
            {...register('titulo')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select etiqueta="Plataforma" {...register('plataforma')}>
              {Object.entries(PLATAFORMA).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Select>
            <Input etiqueta="Fecha" type="date" {...register('fecha')} />
          </div>

          <Select etiqueta="Formato" error={errors.formato?.message} {...register('formato')}>
            {Object.entries(FORMATO).map(([v, t]) => (
              <option key={v} value={v}>
                {v} · {t}
              </option>
            ))}
          </Select>

          <Select etiqueta="Trabajo relacionado" {...register('trabajo_id')}>
            <option value="">Ninguno</option>
            {(trabajos ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} · {t.cliente} · {t.diseno}
              </option>
            ))}
          </Select>

          <div className="rounded-2xl border border-line bg-surface-2/50 px-3.5 py-1">
            <Switch
              activo={Boolean(watch('precio_en_pantalla'))}
              onCambio={(v) => setValue('precio_en_pantalla', v)}
              etiqueta="Precio en pantalla"
              descripcion="Si el video muestra el precio"
            />
          </div>

          {/* La promoción solo tiene sentido sobre un video que ya corrió:
              en el alta sería preguntar por dinero gastado en algo que
              acaba de publicarse. */}
          {!esAlta && (
            <>
              <div className="rounded-2xl border border-line bg-surface-2/50 px-3.5 py-1">
                <Switch
                  activo={Boolean(watch('promocionado'))}
                  onCambio={(v) => setValue('promocionado', v)}
                  etiqueta="Promocionado"
                  descripcion="Si ya se le metió presupuesto"
                />
              </div>

              {Boolean(watch('promocionado')) && (
                <InputNumero
                  etiqueta="Gasto en promoción"
                  prefijo="$"
                  hint="Lo que llevas gastado en este video"
                  error={errors.gasto_promocion?.message}
                  {...register('gasto_promocion')}
                />
              )}
            </>
          )}
        </form>
      </Sheet>

      <ConfirmarBorrado
        abierto={Boolean(aBorrar)}
        onCerrar={() => setABorrar(null)}
        onConfirmar={borrar}
        titulo="¿Eliminar este video?"
        descripcion={
          <>
            Se borra <span className="text-fg">{aBorrar?.titulo}</span> con sus vistas, guardados y
            comentarios. El conteo del tablero baja.
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

function MetricaInline({
  etiqueta,
  valor,
  editable,
  onGuardar,
}: {
  etiqueta: string
  valor: number | null
  editable: boolean
  onGuardar: (v: number | null) => void
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const mostrado = texto ?? (valor == null ? '' : String(valor))

  return (
    <label className="block rounded-xl bg-surface-2 px-2.5 py-2">
      <span className="block text-2xs font-semibold uppercase tracking-wide text-fg-subtle">
        {etiqueta}
      </span>
      <input
        type="text"
        inputMode="numeric"
        disabled={!editable}
        value={mostrado}
        placeholder="—"
        onChange={(e) => setTexto(e.target.value.replace(/\D/g, ''))}
        onBlur={() => {
          if (texto == null) return
          const n = texto === '' ? null : Number(texto)
          if (n !== valor) onGuardar(n)
          setTexto(null)
        }}
        className="tabular w-full bg-transparent text-lg font-semibold text-fg outline-none placeholder:text-fg-subtle disabled:text-fg-muted"
      />
    </label>
  )
}
