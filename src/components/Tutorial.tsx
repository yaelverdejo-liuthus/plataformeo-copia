import { useEffect, useRef, useState } from 'react'
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
  /** Si viene, el tutorial navega ahí para que vean la pantalla de la que habla. */
  ruta?: string
}

/** Lo que le toca a los tres. */
const APERTURA: Paso[] = [
  {
    titulo: 'Hola, soy tu asistente',
    texto:
      'Te voy a enseñar la plataforma en un minuto. No me tardo más, y así no se te escapa nada de lo importante.',
  },
  {
    titulo: 'Esto es un tablero, no un motor',
    texto:
      'La app no consigue clientes ni tatúa. Sirve para decidir: te dice qué está pasando y qué requiere atención hoy. Arriba de todo está el panel de pendientes.',
    ruta: '/',
  },
  {
    titulo: 'Cómo moverte',
    texto:
      'En el celular, la barra de abajo tiene lo del día a día, y en "Más" está el catálogo y tu sesión. En computadora es el menú de la izquierda.',
  },
]

const CIERRE: Paso[] = [
  {
    titulo: 'Eso es todo',
    texto:
      'Si algo no cuadra o la app no te deja hacer algo que crees que sí deberías, dile al admin. Puedes volver a ver esto cuando quieras desde el menú.',
  },
]

const POR_ROL: Record<Rol, Paso[]> = {
  tatuador: [
    {
      titulo: 'Trabajos es tu pantalla',
      texto:
        'Cada pieza tiene su expediente aquí. Puedes verlas como tablero por estatus, o como lista si prefieres el detalle.',
      ruta: '/trabajos',
    },
    {
      titulo: 'Cada trabajo son dos citas',
      texto:
        'La de trazado son 20 minutos: se dibuja con marcador sobre el cuerpo y se fotografía. La de tatuaje es la sesión, ya con el diseño listo. La app las lleva por separado dentro del mismo trabajo.',
    },
    {
      titulo: 'Sin anticipo no hay cita',
      texto:
        'No vas a poder pasar un trabajo a "agendado" ni a "terminado" si no hay anticipo cobrado. No es la pantalla siendo necia: lo bloquea la base de datos, y por eso no se puede saltar ni un martes a las nueve de la noche.',
    },
    {
      titulo: 'Captura los tiempos',
      texto:
        'Anota cuánto tardaste diseñando y cuánto aplicando. De ahí sale la tarifa real por hora, que es lo único que te dice si el nivel 3 de verdad paga mejor. El tiempo de diseño pasa de noche y se siente gratis, pero no lo es.',
    },
    {
      titulo: 'El catálogo',
      texto:
        'Ahí están los diseños con nivel, precio y zona recomendada. Si la zona es mano, el retoque queda incluido a fuerza: esa piel retiene mal la tinta y si no va en el precio, se termina regalando.',
      ruta: '/catalogo',
    },
  ],

  contenido: [
    {
      titulo: 'Contenido es tu pantalla',
      texto:
        'Cada video que publiques se registra aquí. Toma menos de 30 segundos y se puede hacer desde la calle, con el celular.',
      ruta: '/contenido',
    },
    {
      titulo: 'Vuelve a las 4 horas',
      texto:
        'Ese es el dato que importa: vistas y guardados a las 4 horas de publicar. Se editan tocando el número directo en la lista, sin abrir ningún formulario.',
    },
    {
      titulo: 'El badge verde manda',
      texto:
        'Si aparece "PASA FILTRO", ese video ya funcionó solo. Es el único al que vale la pena meterle dinero: promocionar algo en frío cuesta de 3 a 5 veces más.',
    },
    {
      titulo: 'Lo que no vas a poder tocar',
      texto:
        'Leads y Pauta los puedes ver, pero no escribir: son del admin. Si intentas guardar ahí, la base te lo va a rechazar. No está descompuesto, es a propósito.',
    },
  ],

  // El admin no recibe el tutorial automático, pero puede verlo desde el menú.
  admin: [
    {
      titulo: 'Ves y editas todo',
      texto:
        'Eres el único que escribe en Leads, Pauta y Ajustes. El tatuador lleva trabajos y catálogo; el de contenido, los videos.',
    },
    {
      titulo: 'Los 7 umbrales',
      texto:
        'En Ajustes están los números que mueven todo: el filtro de contenido, los umbrales de costo por conversación y la tarifa objetivo. Cambiarlos recalcula los semáforos y los veredictos al instante.',
      ruta: '/config',
    },
  ],
}

function pasosPara(rol: Rol): Paso[] {
  return [...APERTURA, ...POR_ROL[rol], ...CIERRE]
}

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
  const yaPreguntado = useRef(false)

  const pasos = rol ? pasosPara(rol) : []
  const paso = pasos[i]

  // Se ofrece solo a quien no es admin: el admin construyó esto.
  const leToca = rol === 'tatuador' || rol === 'contenido'

  useEffect(() => {
    if (isPending || !leToca || yaPreguntado.current) return
    if (prefs?.mostrar_tutorial) {
      yaPreguntado.current = true
      setFase('pregunta')
    }
  }, [isPending, leToca, prefs?.mostrar_tutorial])

  useEffect(() => {
    if (solicitado) {
      setI(0)
      setFase('pasos')
    }
  }, [solicitado])

  // Al entrar a un paso con ruta, se navega para que vean la pantalla real
  // detrás del tutorial, no una descripción en abstracto.
  useEffect(() => {
    if (fase === 'pasos' && paso?.ruta) navegar(paso.ruta)
  }, [fase, paso?.ruta, navegar])

  function cerrar() {
    setFase('oculto')
    setI(0)
    onCerrarSolicitado()
  }

  function noVolverAPreguntar() {
    guardar.mutate({ mostrar_tutorial: false })
    cerrar()
  }

  function terminar() {
    guardar.mutate({ mostrar_tutorial: false, tutorial_visto_en: new Date().toISOString() })
    cerrar()
  }

  // Sin rol no hay pasos que mostrar: mejor no abrir un diálogo vacío.
  const visible = fase !== 'oculto' && pasos.length > 0

  return createPortal(
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            key={fase}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Tutorial"
            className={cn(
              'relative w-full max-w-2xl overflow-hidden rounded-3xl',
              'border border-line bg-surface shadow-raised',
            )}
          >
            <div className="flex flex-col-reverse sm:flex-row sm:items-stretch">
              {/* Texto — a la izquierda, que es hacia donde él señala */}
              <div className="flex min-w-0 flex-1 flex-col justify-center p-6 sm:p-7">
                {fase === 'pregunta' && (
                  <>
                    <p className="text-2xs font-semibold uppercase tracking-wider text-primary">
                      {perfil?.nombre ? `Hola, ${perfil.nombre.split(' ')[0]}` : 'Bienvenido'}
                    </p>
                    <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-fg">
                      ¿Deseas tener un tutorial?
                    </h2>
                    <p className="mt-2 text-base text-fg-muted">
                      Son menos de dos minutos y te enseño solo lo que te toca a ti.
                    </p>

                    <div className="mt-6 flex flex-col gap-2">
                      <Button tamano="lg" bloque onClick={() => setFase('pasos')}>
                        Sí
                      </Button>
                      <Button tamano="lg" bloque variante="secundario" onClick={cerrar}>
                        No
                      </Button>
                      <Button
                        tamano="lg"
                        bloque
                        variante="fantasma"
                        onClick={noVolverAPreguntar}
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
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4"
                    >
                      <h2 className="text-2xl font-semibold tracking-tight text-fg">
                        {paso.titulo}
                      </h2>
                      <p className="mt-2 text-base leading-relaxed text-fg-muted">
                        {paso.texto}
                      </p>
                    </motion.div>

                    <div className="mt-6 flex items-center gap-2">
                      {i > 0 && (
                        <Button variante="secundario" onClick={() => setI((n) => n - 1)}>
                          Atrás
                        </Button>
                      )}
                      <Button
                        className="flex-1"
                        onClick={() =>
                          i < pasos.length - 1 ? setI((n) => n + 1) : setFase('fin')
                        }
                      >
                        {i < pasos.length - 1 ? 'Siguiente' : 'Terminar'}
                      </Button>
                    </div>

                    <button
                      onClick={cerrar}
                      className="mt-3 self-start text-sm text-fg-subtle underline underline-offset-4 hover:text-fg-muted"
                    >
                      Saltar el tutorial
                    </button>
                  </>
                )}

                {fase === 'fin' && (
                  <>
                    <h2 className="text-2xl font-semibold tracking-tight text-fg">
                      ¿Deseas repetir el tutorial?
                    </h2>
                    <p className="mt-2 text-base text-fg-muted">
                      Sin prisa. Es mejor repetirlo ahora que quedarte con la duda.
                    </p>

                    <div className="mt-6 flex flex-col gap-2">
                      <Button
                        tamano="lg"
                        bloque
                        variante="secundario"
                        onClick={() => {
                          setI(0)
                          setFase('pasos')
                        }}
                      >
                        Sí, repetir.
                      </Button>
                      <Button tamano="lg" bloque onClick={terminar}>
                        No, lo he entendido todo.
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* El asistente — a la derecha, señalando hacia el texto */}
              <div className="relative flex shrink-0 items-end justify-center bg-gradient-to-b from-primary/15 to-primary/5 sm:w-56">
                <motion.img
                  src="/asistente.webp"
                  alt=""
                  aria-hidden
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  /* Sin espejo: en la imagen original ya señala hacia la
                     izquierda del que mira, que es donde está el texto. */
                  className="h-36 w-auto max-w-full object-contain object-bottom sm:h-auto sm:w-full"
                />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
