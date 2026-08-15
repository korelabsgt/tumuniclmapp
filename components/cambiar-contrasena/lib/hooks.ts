"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  msHastaVencimiento,
  passwordChangedAtIso,
  passwordEstaVencida,
  timeoutAcotado,
} from "./password-age";

export function useForzarCambioContrasena() {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const limpiarTimer = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const programar = (ms: number, fn: () => void) => {
      limpiarTimer();
      timeoutId = setTimeout(fn, timeoutAcotado(ms));
    };

    const evaluar = (session: Session | null) => {
      if (cancelled) return;
      limpiarTimer();

      if (!session?.user) {
        setMostrar(false);
        return;
      }

      if (!passwordEstaVencida(session.user)) {
        setMostrar(false);
        const restante = msHastaVencimiento(session.user);
        if (restante > 0) {
          programar(restante, () => evaluar(session));
        }
        return;
      }

      setMostrar(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluar(session);
    });

    return () => {
      cancelled = true;
      limpiarTimer();
      subscription.unsubscribe();
    };
  }, []);

  return mostrar;
}

export function usePasswordChangedAt() {
  return useQuery({
    queryKey: ["password-changed-at"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return null;
      return passwordChangedAtIso(data.session.user);
    },
    staleTime: 1000 * 60,
  });
}
