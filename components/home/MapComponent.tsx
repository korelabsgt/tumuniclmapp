import React from 'react';

export function MapComponent() {
  return (
    <section className="w-full max-w-[95%] lg:max-w-[85%] mx-auto px-2 md:px-0 mb-16">
      <div className="text-center mb-8">
        <p className="text-sm font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase mb-2">
          Nuestra Ubicación
        </p>
        <h2 className="text-3xl md:text-4xl font-light text-[#02245b] dark:text-white">
          Ubicación
        </h2>
      </div>
      <div className="bg-white dark:bg-neutral-800 rounded-3xl p-2 shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <iframe
          className="w-full rounded-2xl"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d241.3967745159026!2d-89.45672343466474!3d14.522053728057578!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8f624d3d52890885%3A0xf4beba09512961ec!2sMunicipalidad%20de%20Concepci%C3%B3n%20Las%20Minas!5e0!3m2!1ses!2sgt!4v1681314354945!5m2!1ses!2sgt"
          style={{ minHeight: '450px', border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </section>
  );
}
