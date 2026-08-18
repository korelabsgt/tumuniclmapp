'use client';

import React, { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

interface VisorImagenProps {
  src: string;
  alt: string;
  className?: string; // Clases para el contenedor de la miniatura
}

export function VisorImagen({ src, alt, className }: VisorImagenProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Cerrar con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      {/* Contenedor de la miniatura */}
      <div 
        className={`relative group cursor-pointer ${className || ''}`}
        onClick={() => setOpen(true)}
      >
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      {/* Modal / Lightbox (renderizado con Portal) */}
      {mounted && open && createPortal(
        <div 
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto"
          onClick={() => {
            if (!isDragging) setOpen(false);
          }}
          onWheel={(e) => {
            setScale(s => Math.min(Math.max(0.5, s - e.deltaY * 0.005), 5));
          }}
        >
          <motion.img 
            drag
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => {
              // Pequeño retardo para que el evento click nativo que ocurre al soltar el mouse
              // siga viendo isDragging como true y no cierre el modal.
              setTimeout(() => setIsDragging(false), 150);
            }}
            src={src} 
            alt={`Vista ampliada de ${alt}`}
            className="max-w-[90vw] max-h-[90vh] object-contain filter drop-shadow-2xl cursor-grab active:cursor-grabbing"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => {
              // Si fue un drag, no queremos que el evento suba al contenedor en absoluto
              if (isDragging) {
                e.stopPropagation();
              }
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
