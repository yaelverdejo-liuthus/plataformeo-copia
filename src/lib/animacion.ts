import type { Transition, Variants } from 'framer-motion'

/**
 * Vocabulario de movimiento. Un solo lugar.
 *
 * Antes la curva [0.22, 1, 0.36, 1] estaba copiada en doce archivos con
 * duraciones que iban de 0.18 a 0.35 según quién escribiera el componente.
 * Se nota: dos cosas que aparecen juntas con ritmos distintos se sienten
 * como dos apps pegadas. Aquí se decide una vez y se reusa.
 *
 * OJO: quien de verdad respeta "reducir movimiento" del sistema es el
 * <MotionConfig reducedMotion="user"> de main.tsx. El bloque de CSS en
 * index.css solo alcanza a las animaciones de CSS — framer escribe estilos
 * en línea desde JS y se le escapa por completo.
 */

/** Salida rápida, frenado largo. Se siente ágil sin verse brusca. */
export const SUAVE = [0.22, 1, 0.36, 1] as const

export const DURACION = {
  /** Micro-respuestas: un error que aparece, un color que cambia. */
  rapida: 0.16,
  /** El default para casi todo: entradas de tarjeta, cambios de vista. */
  normal: 0.22,
  /** Recorridos largos: barras que se llenan, el asistente viajando. */
  lenta: 0.42,
} as const

export const transicion = (duracion: number = DURACION.normal): Transition => ({
  duration: duracion,
  ease: SUAVE,
})

/** Para lo que se empuja: hojas, indicadores que se deslizan. */
export const RESORTE: Transition = { type: 'spring', stiffness: 400, damping: 32 }

/** Más blando, para lo que aparece de la nada y no debe asustar. */
export const RESORTE_SUAVE: Transition = { type: 'spring', stiffness: 300, damping: 26 }

/**
 * Retraso escalonado de una lista.
 *
 * Se topa a los 8 elementos: con 40 filas, escalonar todas hace que la
 * última entre casi dos segundos tarde y la lista se sienta trabada.
 */
export const escalonar = (indice: number, paso = 0.03) => Math.min(indice, 8) * paso

/** Entrada estándar: sube un poco al aparecer, se va hacia arriba al salir. */
export const ENTRADA: Variants = {
  oculto: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
  saliendo: { opacity: 0, y: -6, transition: { duration: DURACION.rapida, ease: SUAVE } },
}

/** Solo opacidad, para cruces de contenido donde el desplazamiento estorba. */
export const FUNDIDO: Variants = {
  oculto: { opacity: 0 },
  visible: { opacity: 1 },
  saliendo: { opacity: 0 },
}

/** Lo que se colapsa hacia arriba: mensajes de error, avisos condicionales. */
export const DESPLEGAR: Variants = {
  oculto: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto' },
  saliendo: { opacity: 0, height: 0 },
}
