'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Settings, FileText, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedIcon from '@/components/ui/AnimatedIcon';

interface ConfigProps {
  onShowHorario: () => void;
}

export default function Config({ onShowHorario }: ConfigProps) {
  const router = useRouter();
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const configRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configRef.current && !configRef.current.contains(event.target as Node)) {
        setMostrarOpciones(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative md:col-span-2 order-3 md:order-1" ref={configRef}>
      <Button 
        onClick={() => setMostrarOpciones(p => !p)} 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-full h-14 text-base md:text-lg font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-sm border border-slate-200 gap-2"
      >
        <AnimatedIcon 
          iconKey="byicyhmi" 
          trigger={isHovered ? 'loop' : undefined} 
          className="w-7 h-7"
        />
        Configs.
      </Button>
      {mostrarOpciones && (
        <motion.div 
          className="absolute top-full mt-2 left-0 z-10 bg-white dark:bg-gray-900 shadow-xl rounded-lg border dark:border-gray-700 p-2 flex flex-col items-start gap-2 w-full min-w-[200px]" 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.2 }}
        >
          <Button variant="ghost" className="w-full justify-center gap-2 text-base" onClick={() => router.push('/sigem/admin/configs/roles')}> <Users size={20} /> Roles </Button>
          <Button variant="ghost" className="w-full justify-center gap-2 text-base" onClick={() => router.push('/sigem/admin/configs/modulos')}> <Settings size={20} /> Módulos </Button>
          <Button variant="ghost" className="w-full justify-center gap-2 text-base" onClick={() => router.push('/sigem/admin/logs')}> <FileText size={20} /> Logs </Button>
          <Button variant="ghost" className="w-full justify-center gap-2 text-base" onClick={() => { onShowHorario(); setMostrarOpciones(false); }}> <Clock size={20} /> Horario Sistema </Button>
        </motion.div>
      )}
    </div>
  );
}