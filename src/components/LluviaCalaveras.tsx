import { useMemo } from 'react'

/**
 * Lluvia de calaveras del login.
 *
 * Va en CSS y no en framer a propósito: son animaciones infinitas y de
 * duración larga, y framer las recalcularía en JS en cada frame para
 * siempre. En CSS las mueve el compositor y no cuestan hilo principal —
 * importa porque el login es lo primero que abre un teléfono de gama baja.
 *
 * Cada calavera son dos capas anidadas con animaciones independientes: la
 * de fuera cae y gira, la de dentro se mece de lado a lado. Combinarlas en
 * un solo `transform` obligaría a sincronizar ambos ritmos, y es justo el
 * desfase entre los dos lo que hace que se vea como una pluma cayendo y no
 * como algo que baja en línea recta.
 */

const CANTIDAD = 14

interface Calavera {
  id: number
  izquierda: number
  tamano: number
  caida: number
  retraso: number
  vaiven: number
  deriva: number
  giro: number
  brillo: number
  calida: boolean
}

const entre = (min: number, max: number) => min + Math.random() * (max - min)

function generar(): Calavera[] {
  return Array.from({ length: CANTIDAD }, (_, id) => {
    // La profundidad manda sobre todo lo demás: las de atrás son chicas,
    // pálidas y lentas; las de adelante grandes, nítidas y rápidas. Sin esa
    // correlación se ve como calcomanías en un solo plano.
    const profundidad = Math.random()
    const tamano = 13 + profundidad * 26

    return {
      id,
      izquierda: entre(-4, 100),
      tamano,
      caida: 46 - profundidad * 18,
      // Retraso NEGATIVO: la animación arranca a media caída, así que la
      // pantalla ya aparece poblada. Con retrasos positivos el login se ve
      // vacío los primeros veinte segundos, que es justo cuando alguien lo
      // está mirando.
      retraso: -entre(0, 46),
      vaiven: entre(3.5, 7),
      deriva: 10 + profundidad * 22,
      giro: entre(-150, 150),
      brillo: 0.05 + profundidad * 0.09,
      calida: id % 4 === 0,
    }
  })
}

export function LluviaCalaveras() {
  // Se siembran una sola vez: si se regeneraran en cada render, cada
  // pulsación en el formulario reiniciaría toda la lluvia desde arriba.
  const calaveras = useMemo(() => generar(), [])

  return (
    <div className="lluvia" aria-hidden>
      {calaveras.map((c) => (
        <div
          key={c.id}
          className="calavera-carril"
          style={{
            left: `${c.izquierda}%`,
            animationDuration: `${c.caida}s`,
            animationDelay: `${c.retraso}s`,
            ['--giro' as string]: `${c.giro}deg`,
            ['--brillo' as string]: c.brillo,
          }}
        >
          <div
            className="calavera-vaiven"
            style={{
              animationDuration: `${c.vaiven}s`,
              animationDelay: `${c.retraso}s`,
              ['--deriva' as string]: `${c.deriva}px`,
            }}
          >
            <Calavera tamano={c.tamano} calida={c.calida} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Calavera de una sola pieza.
 *
 * Cuencas y nariz son huecos de verdad (fill-rule evenodd) y no formas
 * pintadas del color del fondo: así funciona igual en claro y en oscuro sin
 * tener que saber qué hay detrás.
 */
function Calavera({ tamano, calida }: { tamano: number; calida: boolean }) {
  return (
    <svg
      width={tamano}
      height={tamano * 1.25}
      viewBox="0 0 32 40"
      fill="currentColor"
      className={calida ? 'text-accent' : 'text-fg'}
    >
      <path
        fillRule="evenodd"
        d="M16 2C8.3 2 3 7.6 3 15c0 4.2 1.6 7 3.9 9.1.8.7 1.3 1.5 1.4 2.5l.3 2.9c.1 1.1 1 1.9 2.1 1.9h.9v3c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-3h2.8v3c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5v-3h.9c1.1 0 2-.8 2.1-1.9l.3-2.9c.1-1 .6-1.8 1.4-2.5C27.4 22 29 19.2 29 15 29 7.6 23.7 2 16 2Zm-9.1 13.5a3.7 4.3 0 1 1 7.4 0 3.7 4.3 0 0 1-7.4 0Zm10.8 0a3.7 4.3 0 1 1 7.4 0 3.7 4.3 0 0 1-7.4 0ZM16 20.4l2.2 4.4h-4.4L16 20.4Z"
      />
    </svg>
  )
}
