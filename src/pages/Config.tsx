import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, MessageCircle } from 'lucide-react'
import { useConfig, useGuardarConfig } from '../lib/queries/config'
import { useToast } from '../components/ui/Toast'
import { Card } from '../components/ui/Card'
import { Skeleton, ErrorCarga } from '../components/ui/Estados'
import { CLAVES_CONFIG_ORDEN, ETIQUETA_CONFIG } from '../lib/etiquetas'
import { telFormateado, urlWhatsApp } from '../lib/formato'
import { mensajeDeError } from '../lib/errores'
import type { ConfigFila } from '../lib/tipos'

/** A dónde llegan los comentarios sobre la plataforma. */
const WHATSAPP_SOPORTE = '2291628709'

/* El mensaje va precargado para que nadie tenga que pensar cómo empezar:
   quien toca el botón ya tiene la primera línea escrita y solo continúa. */
const SALUDO_SOPORTE = 'Hola, quiero contarte mi experiencia usando la plataforma: '

export function Config() {
  const { data: config, isPending, error, refetch } = useConfig()
  const guardar = useGuardarConfig()
  const toast = useToast()

  if (error) {
    return <ErrorCarga mensaje={mensajeDeError(error as { message?: string })} onReintentar={refetch} />
  }

  // Los 7 en el orden que tiene sentido leerlos, no en orden alfabético.
  const ordenadas = CLAVES_CONFIG_ORDEN.map((c) => (config ?? []).find((f) => f.clave === c)).filter(
    (f): f is ConfigFila => Boolean(f),
  )

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Ajustes</h1>
        <p className="text-sm text-fg-muted">
          Los 7 umbrales que usa todo el sistema. Cambiarlos recalcula el filtro de contenido, el
          veredicto de pauta y los semáforos del tablero.
        </p>
      </header>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div data-tour="umbrales" className="space-y-3">
          {ordenadas.map((fila, i) => (
            <FilaConfig
              key={fila.clave}
              fila={fila}
              indice={i}
              onGuardar={async (valor) => {
                try {
                  await guardar.mutateAsync({ clave: fila.clave, valor })
                  toast.exito('Umbral actualizado')
                } catch (e) {
                  toast.error(mensajeDeError(e as { message?: string }))
                }
              }}
            />
          ))}
        </div>
      )}

      <p className="pt-2 text-sm text-fg-subtle">
        Estos valores son supuestos de arranque acordados en la planeación, no datos de mercado
        medidos. Reemplázalos con datos reales después de la primera semana de operación.
      </p>

      {/* ── Comentarios sobre la plataforma ──────────────────────────────
          Hasta el fondo de Ajustes a propósito: no es una tarea del día,
          es el lugar al que se llega cuando ya se anduvo por todo lo
          demás. Ajustes además es la única pantalla que no cambia con el
          trabajo diario, así que aquí no le quita el sitio a nada. */}
      <Card className="mt-2 border-primary/25 bg-primary/[0.06]">
        <p className="font-display text-lg font-semibold tracking-tight text-fg">
          ¡Cuéntanos tu experiencia en la plataforma!
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          ¿Deseas agregar algo? Lo que te estorbe, lo que te falte o lo que no se entienda — todo
          sirve.
        </p>

        <a
          href={`${urlWhatsApp(WHATSAPP_SOPORTE)}?text=${encodeURIComponent(SALUDO_SOPORTE)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-success/12 text-base font-medium text-success transition-colors hover:bg-success/20"
        >
          <MessageCircle className="anim-repicar h-5 w-5" />
          WhatsApp · {telFormateado(WHATSAPP_SOPORTE)}
        </a>
      </Card>
    </div>
  )
}

function FilaConfig({
  fila,
  indice,
  onGuardar,
}: {
  fila: ConfigFila
  indice: number
  onGuardar: (valor: number) => Promise<void>
}) {
  const [texto, setTexto] = useState(String(Number(fila.valor)))
  const [guardado, setGuardado] = useState(false)

  const valorActual = Number(fila.valor)
  const parseado = Number(texto)
  const cambiado = texto !== '' && Number.isFinite(parseado) && parseado !== valorActual

  async function confirmar() {
    if (!cambiado) {
      setTexto(String(valorActual))
      return
    }
    await onGuardar(parseado)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 1600)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(indice, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-fg">
              {ETIQUETA_CONFIG[fila.clave] ?? fila.clave}
            </p>
            {/* La descripción va visible siempre: en 3 meses nadie va a
                recordar por qué el umbral es 800. */}
            <p className="mt-0.5 text-sm text-fg-muted">{fila.descripcion}</p>
            <p className="mt-1.5 font-mono text-xs text-fg-subtle">{fila.clave}</p>
          </div>

          <div className="relative w-32 shrink-0">
            <input
              type="text"
              inputMode="decimal"
              value={texto}
              onChange={(e) => setTexto(e.target.value.replace(/[^\d.]/g, ''))}
              onBlur={() => void confirmar()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
              }}
              className="tabular h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-right text-lg font-semibold text-fg transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            {guardado && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </motion.span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
