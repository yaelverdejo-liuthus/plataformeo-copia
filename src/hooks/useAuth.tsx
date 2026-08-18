import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Perfil, Rol } from '../lib/tipos'

interface AuthCtx {
  session: Session | null
  perfil: Perfil | null
  rol: Rol | null
  cargando: boolean
  entrar: (email: string, password: string) => Promise<void>
  salir: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let vivo = true

    async function cargarPerfil(s: Session | null) {
      if (!s) {
        if (vivo) setPerfil(null)
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .maybeSingle()
      if (vivo) setPerfil(data ?? null)
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      setSession(data.session)
      await cargarPerfil(data.session)
      if (vivo) setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSession(s)
      void cargarPerfil(s)
    })

    return () => {
      vivo = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function entrar(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function salir() {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  return (
    <Ctx.Provider
      value={{ session, perfil, rol: perfil?.rol ?? null, cargando, entrar, salir }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
