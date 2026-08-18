import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Campo'
import { mensajeDeError } from '../lib/errores'

const esquema = z.object({
  email: z.string().email('Escribe un correo válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

type Formulario = z.infer<typeof esquema>

export function Login() {
  const { entrar } = useAuth()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Formulario>({ resolver: zodResolver(esquema) })

  async function alEnviar(datos: Formulario) {
    setErrorGeneral(null)
    try {
      await entrar(datos.email, datos.password)
    } catch (e) {
      setErrorGeneral(mensajeDeError(e as { message?: string }))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-bg px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-sm"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-fg">Estudio</h1>
          <p className="mt-1.5 text-base text-fg-muted">
            Tablero de instrumentos. Sirve para decidir, no para trabajar.
          </p>
        </div>

        <form onSubmit={handleSubmit(alEnviar)} className="space-y-4">
          <Input
            etiqueta="Correo"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="tu@correo.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            etiqueta="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {errorGeneral && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
            >
              {errorGeneral}
            </motion.p>
          )}

          <Button type="submit" tamano="lg" bloque cargando={isSubmitting}>
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-fg-subtle">
          Herramienta interna. El registro está cerrado — las cuentas las crea el admin.
        </p>
      </motion.div>
    </div>
  )
}
