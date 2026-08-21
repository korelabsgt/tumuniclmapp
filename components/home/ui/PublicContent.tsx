import React from 'react';
import { ListPublicaciones } from '@/components/home/ListPublicaciones';
import { getPoliticas, getPublicaciones } from '@/components/home/lib/actions';

export async function PublicContent() {
  // Carga de datos en el servidor para hidratación inicial
  const [publicaciones, politicas] = await Promise.all([
    getPublicaciones(),
    getPoliticas(),
  ]);

  return (
    <section className="relative -mt-[250px] z-30 w-full md:w-[95%] lg:w-[85%] mx-auto pb-8">
      {/* Contenedor principal con borde redondeado y sombra */}
      <div className="bg-white dark:bg-neutral-800 md:rounded-3xl shadow-[0_0_5em_rgba(0,0,0,0.3)] min-h-[500px] p-4 sm:p-6 md:p-12">



        {/* Lista de publicaciones con filtros */}
        <ListPublicaciones
          publicacionesIniciales={publicaciones}
          politicas={politicas}
        />

      </div>
    </section>
  );
}
