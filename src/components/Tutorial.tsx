import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useMisPreferencias, useGuardarPreferencias } from '../lib/queries/preferencias'
import { useRol } from '../hooks/useRol'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'
import { cn } from '../lib/cn'
import type { Rol } from '../lib/tipos'

interface Paso {
  titulo: string
  texto: string
  /** Ruta a la que se mueve la app antes de hablar de esto. */
  ruta?: string
  /** Valor de data-tour del elemento que se ilumina. Sin esto, va al centro. */
  objetivo?: string
}

const APERTURA: Paso[] = [
  {
    titulo: 'Hola, soy tu asistente',
    texto:
      'Te voy a dar un recorrido por la plataforma. Me tardo un minuto, y así no se te escapa nada de lo importante.',
  },
  {
    titulo: 'Empieza siempre por aquí',
    texto:
      'Este panel te dice qué requiere atención hoy: seguimientos vencidos, trabajos sin anticipo, videos que ya merecen presupuesto. Si está vacío, vas al corriente.',
    ruta: '/',
    objetivo: 'atencion',
  },
  {
    titulo: 'Así te mueves',
    texto:
      'Desde aquí llegas a todo. En el celular es la barra de abajo, y lo que no cabe está en "Más". En computadora es este menú.',
    objetivo: 'nav',
  },
]

/** El cierre cambia según quién pregunta: al admin no se le dice "dile al admin". */
function cierrePara(rol: Rol): Paso[] {
  return [
    {
      titulo: 'Eso es todo',
      texto:
        rol === 'admin'
          ? 'Tú tienes acceso a todo. Si a alguien del equipo le falta algo, no está descompuesto: es su rol. Y si quieres volver a ver esto, está en "Ver tutorial", aquí mismo en el menú.'
          : 'Si la app no te deja hacer algo que crees que sí deberías, dile al admin. Y si quieres volver a ver esto, está en "Ver tutorial", aquí mismo en el menú.',
      objetivo: 'nav',
    },
  ]
}

const POR_ROL: Record<Rol, Paso[]> = {
  tatuador: [
    {
      titulo: 'Trabajos es tu pantalla',
      texto:
        'Aquí vive el expediente de cada pieza. Con este par de botones cambias entre tablero por estatus y lista con detalle.',
      ruta: '/trabajos',
      objetivo: 'vistas-trabajos',
    },
    {
      titulo: 'Desde aquí das de alta',
      texto:
        'Este botón abre el formulario. Ahí adentro vas a ver las dos citas por separado: la de trazado, que son 20 minutos con marcador sobre el cuerpo, y la de tatuaje, que es la sesión.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Sin anticipo no hay cita',
      texto:
        'En ese mismo formulario no vas a poder marcar "agendado" ni "terminado" si no hay anticipo cobrado. No es la pantalla siendo necia: lo bloquea la base de datos, por eso no se puede saltar ni un martes a las nueve de la noche.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Captura los tiempos',
      texto:
        'Anota cuánto tardaste diseñando y cuánto aplicando. De ahí sale la tarifa real por hora, que es lo único que te dice si el nivel 3 de verdad paga mejor. El diseño pasa de noche y se siente gratis, pero no lo es.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'De aquí sale la cotización',
      texto:
        'Los diseños con su nivel, precio y zona. Si la zona es mano, el retoque va incluido a fuerza: esa piel retiene mal la tinta y si no está en el precio desde el principio, se termina regalando.',
      ruta: '/catalogo',
      objetivo: 'catalogo',
    },
  ],

  contenido: [
    {
      titulo: 'Contenido es tu pantalla',
      texto:
        'Con este botón registras cada video que publiques. Toma menos de 30 segundos y se puede hacer desde la calle.',
      ruta: '/contenido',
      objetivo: 'nuevo-video',
    },
    {
      titulo: 'Vuelve a las 4 horas',
      texto:
        'Ese es el dato que importa: vistas y guardados a las 4 horas de publicar. Se editan tocando el número directo en la tarjeta, sin abrir ningún formulario.',
      objetivo: 'nuevo-video',
    },
    {
      titulo: 'El filtro decide, no el gusto',
      texto:
        'Con estos filtros ves cuáles ya pasaron. Si un video trae el badge verde, funcionó solo — y es el único al que vale la pena meterle dinero. Promocionar algo en frío cuesta de 3 a 5 veces más.',
      objetivo: 'filtros-contenido',
    },
    {
      titulo: 'Lo que no vas a poder tocar',
      texto:
        'Leads y Pauta los puedes ver, pero no escribir: son del admin. Si intentas guardar aquí, la base te lo va a rechazar. No está descompuesto, es a propósito.',
      ruta: '/ads',
    },
  ],

  /*
   * El admin ve el recorrido completo, no un resumen: es el rol de quien
   * más usa la plataforma, así que necesita tanto lo del taller (trabajos,
   * catálogo) como lo que solo él puede tocar (leads, pauta, umbrales).
   */
  admin: [
    {
      titulo: 'Trabajos es tu pantalla',
      texto:
        'Aquí vive el expediente de cada pieza. Con este par de botones cambias entre tablero por estatus y lista con detalle.',
      ruta: '/trabajos',
      objetivo: 'vistas-trabajos',
    },
    {
      titulo: 'Desde aquí das de alta',
      texto:
        'Este botón abre el formulario. Ahí adentro vas a ver las dos citas por separado: la de trazado, que son 20 minutos con marcador sobre el cuerpo, y la de tatuaje, que es la sesión.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Sin anticipo no hay cita',
      texto:
        'No vas a poder marcar "agendado" ni "terminado" si no hay anticipo cobrado. Y ojo: ser admin no te salta esta regla. No es un permiso, es un candado de la base de datos — aplica igual para todos, incluido tú. Justo por eso sirve.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'Captura los tiempos',
      texto:
        'Anota cuánto tardaste diseñando y cuánto aplicando. De ahí sale la tarifa real por hora, que es lo único que te dice si el nivel 3 de verdad paga mejor. El diseño pasa de noche y se siente gratis, pero no lo es.',
      objetivo: 'nuevo-trabajo',
    },
    {
      titulo: 'De aquí sale la cotización',
      texto:
        'Los diseños con su nivel, precio y zona. Si la zona es mano, el retoque va incluido a fuerza: esa piel retiene mal la tinta y si no está en el precio desde el principio, se termina regalando.',
      ruta: '/catalogo',
      objetivo: 'catalogo',
    },
    {
      titulo: 'Todo el que escribe, entra aquí',
      texto:
        'Cada persona que manda WhatsApp se registra el mismo día, con de dónde llegó y qué pidió. Ponle fecha de seguimiento: si llega el día y sigue abierto, te sale en rojo y en el tablero.',
      ruta: '/leads',
      objetivo: 'nuevo-lead',
    },
    {
      titulo: 'La pauta se mide, no se adivina',
      texto:
        'Una fila por anuncio por día: gasto real y conversaciones. La app te dice sola si escalar o matar el creativo. Sin esto, en tres semanas cada quien tiene su teoría y ninguna es verificable.',
      ruta: '/ads',
      objetivo: 'nueva-pauta',
    },
    {
      titulo: 'Los 7 umbrales',
      texto:
        'Estos números mueven todo lo demás: el filtro de contenido, los umbrales de costo por conversación y la tarifa objetivo. Cambiarlos recalcula los semáforos y los veredictos al instante. Son supuestos de arranque — ajústalos cuando tengas datos reales.',
      ruta: '/config',
      objetivo: 'umbrales',
    },
  ],
}

function pasosPara(rol: Rol): Paso[] {
  return [...APERTURA, ...POR_ROL[rol], ...cierrePara(rol)]
}

interface Caja {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Entre duplicados responsive (sidebar y barra inferior), gana el visible.
 *
 * Se mide con offsetWidth y no con getBoundingClientRect: el botón flotante
 * entra animándose desde scale 0, y el rect de un elemento a media escala
 * da ancho 0 — lo descartaría justo cuando acaba de aparecer. offsetWidth
 * ignora los transforms; display:none sigue dando 0, que es lo que sí
 * queremos filtrar. Nada de offsetParent: da null en elementos position
 * fixed, y tanto el sidebar como el botón flotante lo son.
 */
function buscarVisible(objetivo: string): HTMLElement | null {
  const todos = [...document.querySelectorAll<HTMLElement>(`[data-tour="${objetivo}"]`)]
  return todos.find((el) => el.offsetWidth > 0) ?? null
}

const MARGEN = 12
const SEPARACION = 14

export function Tutorial({
  solicitado,
  onCerrarSolicitado,
}: {
  solicitado: boolean
  onCerrarSolicitado: () => void
}) {
  const { rol } = useRol()
  const { perfil } = useAuth()
  const { data: prefs, isPending } = useMisPreferencias()
  const guardar = useGuardarPreferencias()
  const navegar = useNavigate()

  const [fase, setFase] = useState<'oculto' | 'pregunta' | 'pasos' | 'fin'>('oculto')
  const [i, setI] = useState(0)
  const [caja, setCaja] = useState<Caja | null>(null)
  const [alto, setAlto] = useState(260)
  const yaPreguntado = useRef(false)
  const refUnidad = useRef<HTMLDivElement>(null)

  const pasos = rol ? pasosPara(rol) : []
  const paso = pasos[i]
  const enRecorrido = fase === 'pasos'

  /*
   * Se ofrece una vez por apertura de la app, a cualquier rol — el admin
   * incluido, que antes quedaba fuera y nunca llegaba a verlo.
   *
   * Se dispara al abrir y no solo al escribir la contraseña: la sesión dura
   * días, así que casi nadie pasa por el formulario de login. Atarlo a eso
   * era garantizar que no saliera nunca.
   *
   * La única forma de silenciarlo es "No volver a preguntar", que apaga
   * `mostrar_tutorial` en la base. Un "No" suelto solo lo cierra por hoy.
   */
  useEffect(() => {
    if (isPending || yaPreguntado.current) return
    // La marca se pone solo cuando de verdad se ofrece. Si se pusiera antes
    // de mirar `prefs`, un render con las preferencias todavía en camino
    // gastaría el único disparo y el asistente no saldría nunca.
    if (!prefs?.mostrar_tutorial) return
    yaPreguntado.current = true
    setFase('pregunta')
  }, [isPending, prefs?.mostrar_tutorial])

  useEffect(() => {
    if (solicitado) {
      setI(0)
      setFase('pasos')
    }
  }, [solicitado])

  // Mover la app a la pantalla de la que toca hablar.
  useEffect(() => {
    if (enRecorrido && paso?.ruta) navegar(paso.ruta)
  }, [enRecorrido, paso?.ruta, navegar])

  const medir = useCallback(() => {
    if (!enRecorrido || !paso?.objetivo) {
      setCaja(null)
      return
    }
    const el = buscarVisible(paso.objetivo)
    if (!el) {
      setCaja(null)
      return
    }
    const r = el.getBoundingClientRect()
    setCaja({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [enRecorrido, paso?.objetivo])

  /*
   * El elemento puede no existir todavía si acabamos de cambiar de ruta:
   * se le da un respiro para que pinte, se acerca a la vista, y recién
   * entonces se mide. Si aun así no aparece, `caja` queda en null y el
   * asistente se planta en el centro en vez de apuntar a la nada.
   */
  useEffect(() => {
    if (!enRecorrido) return
    let vivo = true

    const t1 = window.setTimeout(() => {
      if (!vivo) return
      const el = paso?.objetivo ? buscarVisible(paso.objetivo) : null
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      window.setTimeout(() => {
        if (vivo) medir()
      }, 380)
    }, 140)

    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      vivo = false
      window.clearTimeout(t1)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
  }, [enRecorrido, i, paso?.objetivo, medir])

  useLayoutEffect(() => {
    const el = refUnidad.current
    if (el) setAlto(el.getBoundingClientRect().height)
  }, [fase, i])

  function cerrar() {
    setFase('oculto')
    setI(0)
    setCaja(null)
    onCerrarSolicitado()
  }

  const visible = fase !== 'oculto' && pasos.length > 0

  // ── Dónde se para el asistente ──────────────────────────────────────
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const ancho = Math.min(vw - MARGEN * 2, 430)

  let x = (vw - ancho) / 2
  let y = (vh - alto) / 2
  let flecha: 'arriba' | 'abajo' | null = null

  if (enRecorrido && caja) {
    const centro = caja.left + caja.width / 2
    x = Math.min(Math.max(centro - ancho / 2, MARGEN), vw - ancho - MARGEN)

    const debajo = caja.top + caja.height + SEPARACION
    if (debajo + alto + MARGEN <= vh) {
      y = debajo
      flecha = 'arriba'
    } else {
      y = Math.max(MARGEN, caja.top - alto - SEPARACION)
      flecha = 'abajo'
    }
  }

  return createPortal(
    <AnimatePresence>
      {visible && (
        <Fragment key="tutorial">
          {/* Bloquea la app de abajo. Cuando hay reflector, el oscurecido lo
              pone la sombra del reflector, no esta capa. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70]"
            style={{ background: caja ? 'transparent' : 'rgb(0 0 0 / 0.72)' }}
          />

          {/* Reflector: el "hueco" lo hace una sombra enorme alrededor. */}
          {caja && (
            <div
              className="pointer-events-none fixed z-[71] rounded-2xl ring-2 ring-primary/70"
              style={{
                top: caja.top - 6,
                left: caja.left - 6,
                width: caja.width + 12,
                height: caja.height + 12,
                boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.72)',
                transition:
                  'top 480ms cubic-bezier(0.22,1,0.36,1), left 480ms cubic-bezier(0.22,1,0.36,1), width 480ms cubic-bezier(0.22,1,0.36,1), height 480ms cubic-bezier(0.22,1,0.36,1)',
              }}
            />
          )}

          {/* El asistente y su globo, viajando de un elemento a otro */}
          <motion.div
            ref={refUnidad}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            /* El desplazamiento va por CSS y no por framer: framer solo
               escribe transform cuando anima x/y/scale, y aquí necesitamos
               que el translate mande sin pelearse con la animación de
               entrada. */
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: ancho,
              transform: `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`,
              transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
            className="z-[72]"
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial"
          >
            <div className="flex items-end gap-1.5">
              <div className="relative min-w-0 flex-1 rounded-2xl border border-line bg-surface p-4 shadow-raised">
                {/* Piquito del globo, apuntando al elemento iluminado */}
                {flecha && caja && (
                  <span
                    className={cn(
                      'absolute h-3 w-3 rotate-45 bg-surface',
                      flecha === 'arriba'
                        ? '-top-1.5 border-l border-t border-line'
                        : '-bottom-1.5 border-b border-r border-line',
                    )}
                    style={{
                      left: Math.min(
                        Math.max(caja.left + caja.width / 2 - x - 6, 20),
                        ancho - 130,
                      ),
                    }}
                  />
                )}

                {fase === 'pregunta' && (
                  <>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-primary">
                      {perfil?.nombre ? `Hola, ${perfil.nombre.split(' ')[0]}` : 'Bienvenido'}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-fg">
                      ¿Deseas tener un tutorial?
                    </h2>
                    <p className="mt-1.5 text-sm text-fg-muted">
                      Te doy un recorrido por la plataforma. Menos de dos minutos, y solo lo que
                      te toca a ti.
                    </p>

                    <div className="mt-4 flex flex-col gap-2">
                      <Button bloque onClick={() => setFase('pasos')}>
                        Sí
                      </Button>
                      <Button bloque variante="secundario" onClick={cerrar}>
                        No
                      </Button>
                      <Button
                        bloque
                        variante="fantasma"
                        onClick={() => {
                          guardar.mutate({ mostrar_tutorial: false })
                          cerrar()
                        }}
                      >
                        No volver a preguntar
                      </Button>
                    </div>
                  </>
                )}

                {fase === 'pasos' && paso && (
                  <>
                    <div className="flex items-center gap-1.5">
                      {pasos.map((_, n) => (
                        <span
                          key={n}
                          className={cn(
                            'h-1 rounded-full transition-all duration-300',
                            n === i ? 'w-5 bg-primary' : 'w-1.5 bg-line-strong',
                          )}
                        />
                      ))}
                    </div>

                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-3"
                    >
                      <h2 className="text-lg font-semibold tracking-tight text-fg">
                        {paso.titulo}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{paso.texto}</p>
                    </motion.div>

                    <div className="mt-4 flex items-center gap-2">
                      {i > 0 && (
                        <Button
                          tamano="sm"
                          variante="secundario"
                          onClick={() => setI((n) => n - 1)}
                        >
                          Atrás
                        </Button>
                      )}
                      <Button
                        tamano="sm"
                        className="flex-1"
                        onClick={() =>
                          i < pasos.length - 1 ? setI((n) => n + 1) : setFase('fin')
                        }
                      >
                        {i < pasos.length - 1 ? 'Siguiente' : 'Terminar'}
                      </Button>
                      <button
                        onClick={cerrar}
                        className="shrink-0 px-1 text-xs text-fg-subtle underline underline-offset-4 hover:text-fg-muted"
                      >
                        Saltar
                      </button>
                    </div>
                  </>
                )}

                {fase === 'fin' && (
                  <>
                    <h2 className="text-xl font-semibold tracking-tight text-fg">
                      ¿Deseas repetir el tutorial?
                    </h2>
                    <p className="mt-1.5 text-sm text-fg-muted">
                      Sin prisa. Es mejor repetirlo ahora que quedarte con la duda.
                    </p>

                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        bloque
                        variante="secundario"
                        onClick={() => {
                          setI(0)
                          setFase('pasos')
                        }}
                      >
                        Sí, repetir.
                      </Button>
                      {/* Cierra por hoy, pero se le vuelve a ofrecer la
                          próxima vez que entre: el único apagador es el de
                          abajo, y dice exactamente lo que hace. */}
                      <Button
                        bloque
                        onClick={() => {
                          guardar.mutate({ tutorial_visto_en: new Date().toISOString() })
                          cerrar()
                        }}
                      >
                        No, lo he entendido todo.
                      </Button>
                      <Button
                        bloque
                        variante="fantasma"
                        onClick={() => {
                          guardar.mutate({
                            mostrar_tutorial: false,
                            tutorial_visto_en: new Date().toISOString(),
                          })
                          cerrar()
                        }}
                      >
                        No volver a preguntar
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Él va a la derecha: en la imagen ya señala hacia la izquierda,
                  o sea hacia su propio globo de texto. */}
              <motion.img
                src="/asistente.webp"
                alt=""
                aria-hidden
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                className="h-24 w-auto shrink-0 select-none object-contain sm:h-32"
                draggable={false}
              />
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body,
  )
}
