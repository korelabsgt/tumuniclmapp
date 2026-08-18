'use client';

import React, { useEffect } from 'react';

export function ClimaWidget() {
  useEffect(() => {
    // Only inject the script if it doesn't already exist
    if (!document.getElementById('weatherwidget-io-js')) {
      const script = document.createElement('script');
      script.id = 'weatherwidget-io-js';
      script.src = 'https://weatherwidget.io/js/widget.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <section className="w-full max-w-[95%] lg:max-w-[85%] mx-auto px-2 md:px-0 mb-12">
      <div className="bg-white dark:bg-neutral-800 rounded-3xl p-4 md:p-6 shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-neutral-700">
        <a
          className="weatherwidget-io"
          href="https://forecast7.com/en/14d52n89d46/concepcion-las-minas/"
          data-label_1="Clima de"
          data-label_2="Concepción Las Minas"
          data-font="Arial"
          data-icons="Climacons Animated"
          data-theme="weather_one"
          style={{ borderRadius: '10px' }}
        >
          Clima de Concepción Las Minas
        </a>
      </div>
    </section>
  );
}
