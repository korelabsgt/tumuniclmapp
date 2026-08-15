'use client';

import { useState } from 'react';
import AnimatedIcon from '@/components/ui/AnimatedIcon';
import { HoverLottieIcon } from '@/components/ui/HoverLottieIcon';

type ModuleIconProps = {
  iconoKey: string;
  iconoLottie?: string;
  lottieSpeed?: number;
  className?: string;
  trigger?: string;
  target?: string;
  delay?: string | number;
  speed?: string | number;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
};

export function ModuleIcon({
  iconoKey,
  iconoLottie,
  lottieSpeed,
  className = 'h-full w-full',
  trigger = 'hover',
  target,
  delay = 0,
  speed = 2,
  primaryColor,
  secondaryColor,
  tertiaryColor,
}: ModuleIconProps) {
  const [lottieListo, setLottieListo] = useState(false);

  if (iconoLottie) {
    const esLoop = trigger === 'loop';

    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!lottieListo ? (
          <AnimatedIcon
            iconKey={iconoKey}
            className="absolute inset-0 z-0 h-full w-full"
            trigger={trigger}
            target={target}
            delay={delay}
            speed={speed}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            tertiaryColor={tertiaryColor}
          />
        ) : null}
        <HoverLottieIcon
          src={iconoLottie}
          target={esLoop ? undefined : target}
          loop={esLoop}
          speed={lottieSpeed ?? 1.2}
          onListo={() => setLottieListo(true)}
        />
      </div>
    );
  }

  return (
    <AnimatedIcon
      iconKey={iconoKey}
      className={className}
      trigger={trigger}
      target={target}
      delay={delay}
      speed={speed}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
      tertiaryColor={tertiaryColor}
    />
  );
}
