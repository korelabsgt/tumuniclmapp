'use client';

import { DotLottieReact, type DotLottie } from '@lottiefiles/dotlottie-react';
import { useCallback, useEffect, useRef } from 'react';

type HoverLottieIconProps = {
  src: string;
  speed?: number;
  target?: string;
  loop?: boolean;
  onListo?: () => void;
};

export function HoverLottieIcon({
  src,
  speed = 1,
  target,
  loop = false,
  onListo,
}: HoverLottieIconProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<DotLottie | null>(null);
  const listoRef = useRef(false);
  const hoverActivoRef = useRef(false);
  const speedRef = useRef(speed);
  const loopRef = useRef(loop);
  const colaRef = useRef<Array<(player: DotLottie) => void>>([]);
  const ocupadoRef = useRef(false);

  speedRef.current = speed;
  loopRef.current = loop;

  const encolar = useCallback((accion: (player: DotLottie) => void) => {
    colaRef.current.push(accion);
    if (ocupadoRef.current) return;

    const correr = () => {
      const player = playerRef.current;
      const siguiente = colaRef.current.shift();
      if (!player || !siguiente) {
        ocupadoRef.current = false;
        return;
      }

      ocupadoRef.current = true;
      window.setTimeout(() => {
        try {
          if (playerRef.current) {
            siguiente(playerRef.current);
          }
        } catch {
          // Ignorar reentrancia WASM.
        } finally {
          ocupadoRef.current = false;
          if (colaRef.current.length > 0) {
            correr();
          }
        }
      }, 0);
    };

    correr();
  }, []);

  const irAlInicio = useCallback(() => {
    encolar((p) => {
      p.setLoop(false);
      p.setSpeed(speedRef.current);
      p.stop();
    });
  }, [encolar]);

  const reproducirDesdeInicio = useCallback(() => {
    encolar((p) => {
      p.setSpeed(speedRef.current);
      p.setLoop(false);
      p.stop();
    });
    encolar((p) => {
      p.play();
    });
  }, [encolar]);

  const handlePlayerRef = useCallback(
    (instance: DotLottie | null) => {
      playerRef.current = instance;
      if (!instance) {
        listoRef.current = false;
        return;
      }

      const onReady = () => {
        if (listoRef.current) return;
        listoRef.current = true;
        encolar((p) => {
          p.setSpeed(speedRef.current);
          p.setLoop(false);
          if (loopRef.current) {
            p.play();
          } else {
            p.stop();
          }
          onListo?.();
        });
      };

      const onComplete = () => {
        if (loopRef.current || hoverActivoRef.current) {
          reproducirDesdeInicio();
          return;
        }
        irAlInicio();
      };

      instance.addEventListener('ready', onReady);
      instance.addEventListener('complete', onComplete);
      if (instance.isReady) {
        onReady();
      }
    },
    [encolar, irAlInicio, onListo, reproducirDesdeInicio],
  );

  useEffect(() => {
    if (loop) return;

    const onEnter = () => {
      hoverActivoRef.current = true;
      reproducirDesdeInicio();
    };
    const onLeave = () => {
      hoverActivoRef.current = false;
    };

    const element = target ? document.querySelector(target) : outerRef.current;
    if (!element) return;

    element.addEventListener('mouseenter', onEnter);
    element.addEventListener('mouseleave', onLeave);
    return () => {
      element.removeEventListener('mouseenter', onEnter);
      element.removeEventListener('mouseleave', onLeave);
    };
  }, [target, loop, reproducirDesdeInicio]);

  return (
    <div ref={outerRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <DotLottieReact
        src={src}
        loop={false}
        autoplay={false}
        layout={{ fit: 'cover', align: [0.5, 0.5] }}
        renderConfig={{ autoResize: false }}
        dotLottieRefCallback={handlePlayerRef}
        className="pointer-events-none absolute inset-0 block"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}
