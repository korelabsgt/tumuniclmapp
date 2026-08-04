import React from 'react';

export function PublicContent() {
  return (
    <section className="relative -mt-12 z-20 max-w-5xl mx-auto px-4 pb-24">
      {/* White container with rounded top corners */}
      <div className="bg-white dark:bg-neutral-800 rounded-t-xl shadow-2xl min-h-[500px] p-6 md:p-12 flex flex-col items-center">
         
         <div className="w-full max-w-3xl flex flex-col items-center mt-4">
            {/* EMPTY SPACE FOR FUTURE CONTENT */}
            <div className="mt-16 w-full text-center p-10 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-lg text-gray-400 dark:text-gray-500">
              <p>Aquí irá el resto de la información pública en el futuro.</p>
            </div>

         </div>
      </div>
    </section>
  );
}
