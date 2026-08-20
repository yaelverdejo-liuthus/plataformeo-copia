import { useMemo } from 'react'

/**
 * Lluvia de billetes de fondo para los KPI con semáforo.
 *
 * El color lo manda el estado del cuadro: verde si va bien, ámbar si hay
 * que mirarlo, rojo si va mal, y gris cuando todavía no hay con qué juzgar.
 * Así el estado se percibe antes de leer el número — el punto de la esquina
 * y el color de la cifra ya lo decían, esto lo dice con el rabillo del ojo.
 *
 * Va en CSS y no en framer, igual que la lluvia del login: son animaciones
 * infinitas y largas, y framer las recalcularía en JS en cada frame para
 * siempre. En CSS las mueve el compositor.
 *
 * Es DECORACIÓN y se comporta como tal: detrás del contenido, sin robar
 * taps, y bajo "reducir movimiento" desaparece por completo (index.css).
 * Ningún dato del tablero depende de que esto se vea.
 */

type Luz = 'verde' | 'ambar' | 'rojo' | 'sin_datos'

/** El tono de cada estado. Gris cuando no hay color que tomar. */
const COLOR: Record<Luz, string> = {
  verde: 'var(--success)',
  ambar: 'var(--warn)',
  rojo: 'var(--danger)',
  sin_datos: 'var(--fg-subtle)',
}

/* Seis alcanza para que se lea como lluvia y no como cuatro billetes
   sueltos. Son siete tarjetas con semáforo en el tablero, así que cada
   billete de más se paga siete veces en un teléfono de gama baja. */
const CANTIDAD = 6

const entre = (min: number, max: number) => min + Math.random() * (max - min)

function sembrar() {
  return Array.from({ length: CANTIDAD }, (_, id) => {
    // La profundidad manda sobre todo lo demás, como en las calaveras: los
    // de atrás chicos, pálidos y lentos; los de adelante grandes y nítidos.
    // Sin esa correlación se ven como calcomanías en un solo plano.
    const profundidad = Math.random()

    return {
      id,
      izquierda: entre(-6, 92),
      ancho: 15 + profundidad * 13,
      // Lento a propósito: es fondo de una tarjeta que se lee, no un
      // protector de pantalla.
      caida: entre(15, 24) - profundidad * 4,
      // Retraso NEGATIVO: la animación arranca a media caída y la tarjeta
      // ya aparece poblada. Con retrasos positivos el tablero se ve vacío
      // los primeros veinte segundos, justo cuando lo están mirando.
      retraso: -entre(0, 22),
      vaiven: entre(3, 6),
      deriva: 4 + profundidad * 9,
      giro: entre(-70, 70),
      brillo: 0.1 + profundidad * 0.12,
    }
  })
}

export function LluviaBilletes({ luz }: { luz: Luz }) {
  // Se siembran una sola vez. Si se regeneraran en cada render, cualquier
  // refresco de datos reiniciaría la lluvia desde arriba de golpe.
  const billetes = useMemo(() => sembrar(), [])

  return (
    <div className="lluvia-billetes" style={{ color: `rgb(${COLOR[luz]})` }} aria-hidden>
      {billetes.map((b) => (
        <div
          key={b.id}
          className="billete-carril"
          style={{
            left: `${b.izquierda}%`,
            animationDuration: `${b.caida}s`,
            animationDelay: `${b.retraso}s`,
            ['--giro' as string]: `${b.giro}deg`,
            ['--brillo' as string]: b.brillo,
          }}
        >
          <div
            className="billete-vaiven"
            style={{
              animationDuration: `${b.vaiven}s`,
              animationDelay: `${b.retraso}s`,
              ['--deriva' as string]: `${b.deriva}px`,
            }}
          >
            <Billete ancho={b.ancho} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Un billete de una sola pieza.
 *
 * El óvalo del centro y las dos marcas de los lados son huecos de verdad
 * (fill-rule evenodd), no formas pintadas del color del fondo: así el
 * billete funciona igual en tema claro y oscuro sin saber qué hay detrás.
 */
function Billete({ ancho }: { ancho: number }) {
  return (
    <svg
      width={ancho}
      height={ancho * 0.56}
      viewBox="0 0 32 18"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M3 1h26a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2Zm13 4.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2ZM5.7 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm20.6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
      />
    </svg>
  )
}
