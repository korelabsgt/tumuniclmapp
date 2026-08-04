'use client';

import { useState } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Power, LogOut } from 'lucide-react';
import useUserData from '@/hooks/sesion/useUserData';
import Swal from 'sweetalert2';
import { Typewriter } from 'react-simple-typewriter';
import { signOutAction } from "@/app/actions";
import AnimatedIcon from '@/components/ui/AnimatedIcon';

export default function AuthButton() {
  const { userId, nombre, email, rol, cargando } = useUserData();
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const esAdmin = rol === 'SUPER' || rol === 'ADMINISTRADOR';
  const rutaInicio = esAdmin ? '/sigem/admin' : '/sigem/';
  const esInicio = pathname === '/sigem/';
  const linkStyles = "inline-flex items-center justify-end text-xs lg:text-lg transition-colors hover:underline focus-visible:outline-none";

  const handleSignOut = async () => {
    Swal.fire({
      title: '¿Está seguro?',
      text: "Se cerrará su sesión actual.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
      customClass: {
        popup: 'bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-xl',
        title: 'text-gray-900 dark:text-white text-xl font-bold',
        htmlContainer: 'text-gray-600 dark:text-gray-300',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg',
        cancelButton: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg',
        actions: 'gap-3'
      },
      buttonsStyling: false,
      background: undefined,
      color: undefined       
    }).then((result) => {
      if (result.isConfirmed) {
        signOutAction();
      }
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  if (cargando) {
    return <div className="w-40 mr-10" />;
  }

  return userId ? (
    <div className="flex flex-col items-end gap-6 mr-2 md:mr-10">
      <div className="text-right">
        <span className="text-xs font-bold block text-gray-900 dark:text-gray-100">
          <Typewriter
            words={[
              '¡Hoy! Concepción Avanza',
              nombre || ''
            ]}
            loop={1}
            cursor
            cursorStyle="|"
            typeSpeed={50}
            deleteSpeed={50}
            delaySpeed={1000}
          />
        </span>
        <div className="text-[#06c] dark:text-blue-400 text-xs font-medium mt-1">
          {email}
        </div>
      </div>

      <div className="flex flex-row items-center gap-4 mt-auto">
        
        <div className="flex flex-col items-end gap-4"> 
          <button
            type="button"
            onClick={handleSignOut}
            className={`${linkStyles} text-red-500 hover:text-red-600`}
          >
            Cerrar Sesión
            <Power className="h-4 w-4 ml-2" />
          </button>
          
          {!esInicio && (
            <Link href={rutaInicio} className={`${linkStyles} text-blue-600 hover:text-blue-700`}>
              Volver a Inicio
              <LogOut className="h-4 w-4 ml-2 rotate-180" />
            </Link>
          )}
        </div>

        <div className="border-l border-gray-300 dark:border-neutral-700 pl-4">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex flex-col items-center justify-center text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-gray-200 transition-colors gap-0.5"
          >
            <div className="w-10 h-10">
              <AnimatedIcon 
                iconKey="qzorewvq" 
                trigger={isRefreshing ? 'loop' : 'hover'}
                className="w-full h-full"
              />
            </div>
            <span className="mt-1 text-[10px] font-medium leading-none">Actualizar</span>
          </button>
        </div>

      </div>
    </div>
  ) : null;
}