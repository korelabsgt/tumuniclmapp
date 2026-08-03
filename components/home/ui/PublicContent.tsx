import React from 'react';

export function PublicContent() {
  return (
    <section className="relative -mt-12 z-20 max-w-5xl mx-auto px-4 pb-24">
      {/* White container with rounded top corners */}
      <div className="bg-white rounded-t-xl shadow-2xl min-h-[500px] p-6 md:p-12 flex flex-col items-center">
         
         <div className="w-full max-w-3xl flex flex-col items-center mt-4">
            <p className="text-[#0070F3] font-bold text-lg md:text-xl text-center mb-6">
              Haz click en la siguiente imagen para ver la Memoria de Labores 2025
            </p>
            
            {/* Fake Blue Box representing the document link */}
            <div className="w-full relative bg-[#82B3FF] rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1 group">
              <div className="aspect-[16/10] md:aspect-[21/9] flex flex-col justify-center items-center text-center p-8 relative z-10 text-white">
                <h4 className="text-3xl md:text-5xl font-bold uppercase tracking-wider mb-2 drop-shadow-md">
                  Memoria de Labores
                </h4>
                <h5 className="text-xl md:text-3xl font-semibold drop-shadow-md">
                  Municipalidad de
                </h5>
                <h6 
                  className="text-2xl md:text-4xl mt-2 drop-shadow-md"
                  style={{ fontFamily: "'Brush Script MT', cursive, serif" }}
                >
                  Concepción Las Minas
                </h6>
                
                {/* Large 2025 watermark/text */}
                <div className="absolute right-4 bottom-0 md:right-8 lg:text-[140px] text-[100px] font-black opacity-40 leading-none">
                  20<br className="hidden md:block"/>25
                </div>
              </div>
            </div>
            
            {/* EMPTY SPACE FOR FUTURE CONTENT */}
            <div className="mt-16 w-full text-center p-10 border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
              <p>Aquí irá el resto de la información pública en el futuro.</p>
            </div>

         </div>
      </div>
    </section>
  );
}
