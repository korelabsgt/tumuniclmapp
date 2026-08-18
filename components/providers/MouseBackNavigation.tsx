'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const esRutaDelSistema = (path: string) =>
  path.startsWith('/sigem') ||
  path.startsWith('/login') ||
  path.startsWith('/unauthorized') ||
  path.startsWith('/auth');

export default function MouseBackNavigation() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!esRutaDelSistema(pathname)) return;

    const bloquearNavegacionNativa = (e: MouseEvent) => {
      if (e.button === 3 || e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const manejarBotonMouse = (e: MouseEvent) => {
      if (e.button === 3) {
        e.preventDefault();
        e.stopPropagation();
        router.back();
        return;
      }
      if (e.button === 4) {
        e.preventDefault();
        e.stopPropagation();
        router.forward();
      }
    };

    window.addEventListener('mousedown', bloquearNavegacionNativa, true);
    window.addEventListener('mouseup', manejarBotonMouse, true);
    window.addEventListener('auxclick', bloquearNavegacionNativa, true);

    return () => {
      window.removeEventListener('mousedown', bloquearNavegacionNativa, true);
      window.removeEventListener('mouseup', manejarBotonMouse, true);
      window.removeEventListener('auxclick', bloquearNavegacionNativa, true);
    };
  }, [router, pathname]);

  return null;
}
