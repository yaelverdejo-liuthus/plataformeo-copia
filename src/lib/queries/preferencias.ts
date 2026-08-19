import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Preferencias } from '../tipos'

export const llavesPreferencias = { mias: ['preferencias'] as const }

/**
 * Preferencias del usuario que está en sesión.
 *
 * Viven en la base y no en localStorage a propósito: "no volver a
 * preguntar" tiene que valer también cuando entren desde otro teléfono.
 */
export function useMisPreferencias() {
  return useQuery({
    queryKey: llavesPreferencias.mias,
    queryFn: async () => {
      const { data: sesion } = await supabase.auth.getUser()
      const id = sesion.user?.id
      if (!id) return null

      const { data, error } = await supabase
        .from('preferencias')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error

      // Todavía no tiene fila: por defecto sí se le ofrece el tutorial.
      return (data ?? {
        id,
        mostrar_tutorial: true,
        tutorial_visto_en: null,
        updated_at: new Date().toISOString(),
      }) as Preferencias
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useGuardarPreferencias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cambios: Partial<Omit<Preferencias, 'id'>>) => {
      const { data: sesion } = await supabase.auth.getUser()
      const id = sesion.user?.id
      if (!id) throw new Error('Sin sesión')

      const { error } = await supabase.from('preferencias').upsert({ id, ...cambios })
      if (error) throw error
    },
    onMutate: async (cambios) => {
      await qc.cancelQueries({ queryKey: llavesPreferencias.mias })
      const previo = qc.getQueryData<Preferencias>(llavesPreferencias.mias)
      qc.setQueryData<Preferencias | null>(llavesPreferencias.mias, (p) =>
        p ? { ...p, ...cambios } : p,
      )
      return { previo }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previo) qc.setQueryData(llavesPreferencias.mias, ctx.previo)
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: llavesPreferencias.mias }),
  })
}
