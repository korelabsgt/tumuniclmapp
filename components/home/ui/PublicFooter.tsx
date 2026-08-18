'use client';

import React from 'react';
import { MapPin, Mail, Phone, Facebook, Instagram, Youtube } from 'lucide-react';
import Wave from 'react-wavify';

export function PublicFooter() {
  return (
    <footer className="relative mt-24">
      {/* react-wavify Divider */}
      <div className="absolute bottom-full left-0 w-full overflow-hidden leading-none z-0 translate-y-[1px]">
        <div style={{ position: 'relative', height: '10px', width: '100%', padding: '0em', marginTop: '2em' }}>
          <Wave
            fill=""
            paused={false}
            style={{ position: 'absolute', top: -50, left: 0, right: 0, width: '100%' }}
            options={{ height: 3, amplitude: 5, speed: 0.25, points: 5 }}
            className="!fill-[#0cf] dark:!fill-[#023a70]"
          />
          <Wave
            fill=""
            paused={false}
            style={{ position: 'absolute', top: -45, left: 0, right: 0, width: '100%' }}
            options={{ height: 3, amplitude: 20, speed: 0.1, points: 5 }}
            className="!fill-[#06c] dark:!fill-[#011438]"
          />
        </div>
      </div>

      <div className="relative z-10 bg-[#06c] dark:bg-[#011438] pt-12 pb-8 px-6 md:px-12 text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
          
          {/* Contáctanos */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold mb-6">Contáctanos</h3>
            <div className="flex items-center justify-center md:justify-start gap-3 text-blue-100">
              <MapPin className="w-5 h-5 shrink-0" />
              <span>Calle principal, en frente del parque central</span>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3 text-blue-100 hover:text-white transition-colors">
              <Phone className="w-5 h-5 shrink-0" />
              <a href="https://wa.me/50247902524" target="_blank" rel="noreferrer">
                +502 4790 2524
              </a>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3 text-blue-100 hover:text-white transition-colors">
              <Mail className="w-5 h-5 shrink-0" />
              <a href="mailto:info@tumuniclm.com">info@tumuniclm.com</a>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-4 pt-4">
              <a href="https://www.facebook.com/tumuniclm" target="_blank" rel="noreferrer" className="text-white hover:text-blue-400 transition-colors">
                <Facebook className="w-8 h-8" />
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="text-white hover:text-pink-400 transition-colors">
                <Instagram className="w-8 h-8" />
              </a>
              <a href="https://www.youtube.com/@tuMuniCLM" target="_blank" rel="noreferrer" className="text-white hover:text-red-500 transition-colors">
                <Youtube className="w-9 h-9" />
              </a>
            </div>
          </div>

          {/* Horarios */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold mb-6">Horarios</h3>
            <div>
              <p className="text-blue-200">Lunes - Viernes</p>
              <p className="text-xl font-bold">08:00 am - 04:00 pm</p>
            </div>
            <div className="pt-2">
              <p className="text-blue-200">Sábado y Domingo</p>
              <p className="text-xl font-bold">Cerrado</p>
            </div>
          </div>

          {/* Visitas */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold mb-6">Visitas</h3>
            <p className="text-blue-200 mb-4">
              Cuántas personas han visitado nuestro sitio web
            </p>
            <div className="flex justify-center md:justify-start">
              <a target="_blank" rel="noreferrer" href="#">
                <img
                  src="https://hitwebcounter.com/counter/counter.php?page=19857254&style=0006&nbdigits=5&type=page&initCount=3251"
                  title="Counter Widget"
                  alt="Visit counter For Websites"
                  className="rounded bg-white p-1"
                />
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* Copyright */}
      <div className="bg-[#05b] dark:bg-[#000a1c] py-6 text-center px-4">
        <p className="text-blue-200 text-sm md:text-base">
          Todos los derechos reservados © Municipalidad de Concepción Las Minas
        </p>
        <p className="text-blue-300/70 text-xs md:text-sm mt-1">
          Diseñado y desarrollado por el Departamento Municipal de Tecnologías de la Información
        </p>
      </div>
    </footer>
  );
}
