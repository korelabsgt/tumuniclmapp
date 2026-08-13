'use client';

import { useRef, useEffect } from 'react';

interface AnimatedIconProps {
  iconKey: string;
  className?: string;
  trigger?: string;
  delay?: string | number;
  speed?: string | number;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
}

export default function AnimatedIcon({
  iconKey,
  className = 'w-24 h-24',
  trigger = 'hover',
  delay = 0,
  speed = 2,
  primaryColor,
  secondaryColor,
  tertiaryColor,
}: AnimatedIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLElement | null>(null);
  const baseUrl = 'https://cdn.lordicon.com/';

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !iconKey) return;

    const fullUrl = `${baseUrl}${iconKey}.json`;
    const icon = document.createElement('lord-icon');

    icon.setAttribute('src', fullUrl);
    icon.setAttribute('delay', String(delay));
    icon.setAttribute('speed', String(speed));
    icon.style.width = '100%';
    icon.style.height = '100%';

    const colors = [];
    if (primaryColor) colors.push(`primary:${primaryColor}`);
    if (secondaryColor) colors.push(`secondary:${secondaryColor}`);
    if (tertiaryColor) colors.push(`tertiary:${tertiaryColor}`);

    if (colors.length > 0) {
      icon.setAttribute('colors', colors.join(','));
    }

    icon.setAttribute('trigger', trigger ?? 'hover');

    container.innerHTML = '';
    container.appendChild(icon);
    iconRef.current = icon;

    return () => {
      iconRef.current = null;
    };
  }, [iconKey, delay, speed, primaryColor, secondaryColor, tertiaryColor]);

  useEffect(() => {
    const icon = iconRef.current;
    if (!icon) return;
    icon.setAttribute('trigger', trigger ?? 'hover');
  }, [trigger]);

  return <div ref={containerRef} className={`${className} [&_lord-icon]:!h-full [&_lord-icon]:!w-full`} />;
}
