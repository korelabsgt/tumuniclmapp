"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Session } from "@supabase/supabase-js";
import {
  msHastaLas9HoyGT,
  msHastaVencimiento,
  passwordEstaVencida,
  timeoutAcotado,
  yaEsHoraDeRevisar,
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

      if (yaEsHoraDeRevisar()) {
        setMostrar(true);
        return;
      }

      setMostrar(false);
      programar(msHastaLas9HoyGT(), () => {
        if (!cancelled) setMostrar(true);
      });
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
