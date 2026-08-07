'use client';

import React, { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';

type TabType = 'tesoreria' | 'servicios' | 'ugam';

export function RequisitosTramites() {
  const [activeTab, setActiveTab] = useState<TabType>('tesoreria');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const tabs = [
    { id: 'tesoreria', label: 'Tesorería' },
    { id: 'servicios', label: 'Servicios Públicos' },
    { id: 'ugam', label: 'UGAM' },
  ];

  const Tes1 = [
    { req1: "Ingresos (Q)", req2: "Pago (Q)" },
    { req1: "De 500.01 a 3,000.00", req2: "10.00" },
    { req1: "De 3,000.01 a 6,000.00", req2: "50.00" },
    { req1: "De 6,000.01 a 9,000.00", req2: "75.00" },
    { req1: "De 9,000.01 a 12,000.00", req2: "100.00" },
    { req1: "De 12,000.01 en adelante", req2: "150.00" },
  ];

  const Tes2 = [
    { req1: "Requisitos de inscripción", req2: "Fotocopia de escritura de propiedad y DPI" },
    { req1: "Pago General", req2: "Q 20.00 Mensual" },
  ];

  const Tes3 = [
    { req1: "Requisitos de inscripción", req2: "Fotocopia de DPI" },
    { req1: "Pago Casco Urbano", req2: "Q 20.00 Mensual" },
    { req1: "Pago Área Rural", req2: "Q 12.00 Mensual" },
  ];

  const Tes4 = [
    { req1: "Requisitos de inscripción de pago de IUSI o actualización de datos", req2: "" },
    { req1: "Fotocopia de Escritura de propiedad", req2: "" },
    { req1: "Fotocopia de Escritura de DPI", req2: "" },
  ];

  const Ugam1 = [
    "Fotografía del Árbol que se va a talar",
    "Original y fotocopia DPI vigente",
    "Pago por cada árbol Q 25.00",
  ];

  const Ugam2 = [
    "Original y Fotocopia de DPI Vigente",
    "Original y fotocopia de Tarjeta de Circulación del Vehículo que se utilizará",
    "Pago de arbitrio Q 15.00",
  ];

  const Ugam3 = [
    "Original y Fotocopia de DPI Vigente",
    "Contrato de Manzanaje del año anterior",
    "Recibo que conste el último pago de contrato de arrendamiento",
    "Boleto de Ornato (Se exceptúan las personas mayores de 65 años)",
    "Pago de solvencia municipal Q25.00",
  ];

  return (
    <section className="w-full max-w-[95%] lg:max-w-[85%] mx-auto px-2 md:px-0 py-16 mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-[#02245b] dark:text-white">
          Requisitos para Trámites de servicios
        </h2>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-neutral-700 overflow-hidden">
        
        {/* Tabs Header */}
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-neutral-700 hide-scrollbar bg-gray-50/50 dark:bg-neutral-900/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setExpandedItem(null); }}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-400 bg-white dark:bg-neutral-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-neutral-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 md:p-8">
          
          {/* TESORERIA */}
          {activeTab === 'tesoreria' && (
            <div className="space-y-3">
              <AccordionItem 
                id="tes1" 
                title="Boleto de Ornato" 
                isOpen={expandedItem === 'tes1'} 
                onToggle={() => toggleAccordion('tes1')}
              >
                <TableTwoCols data={Tes1} />
              </AccordionItem>
              <AccordionItem 
                id="tes2" 
                title="Agua" 
                isOpen={expandedItem === 'tes2'} 
                onToggle={() => toggleAccordion('tes2')}
              >
                <TableTwoCols data={Tes2} />
              </AccordionItem>
              <AccordionItem 
                id="tes3" 
                title="Recolección de basura" 
                isOpen={expandedItem === 'tes3'} 
                onToggle={() => toggleAccordion('tes3')}
              >
                <TableTwoCols data={Tes3} />
              </AccordionItem>
              <AccordionItem 
                id="tes4" 
                title="Inscripción de IUSI" 
                isOpen={expandedItem === 'tes4'} 
                onToggle={() => toggleAccordion('tes4')}
              >
                <div className="space-y-3">
                  <p className="font-bold text-gray-800 dark:text-gray-200">
                    {Tes4[0].req1}
                  </p>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {Tes4.slice(1).map((item, i) => (
                      <li key={i}>{item.req1}</li>
                    ))}
                  </ul>
                </div>
              </AccordionItem>
            </div>
          )}

          {/* SERVICIOS PUBLICOS */}
          {activeTab === 'servicios' && (
            <div className="space-y-3">
              <AccordionItem 
                id="serv1" 
                title="Ver todos los requisitos" 
                isOpen={expandedItem === 'serv1'} 
                onToggle={() => toggleAccordion('serv1')}
              >
                <div className="py-2">
                  <a 
                    href="https://drive.google.com/drive/folders/1Pa0MI7SpwKdSDmeeNdZfk7oesNTVMMfh?usp=sharing" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex justify-center items-center w-full gap-2 px-6 py-3.5 bg-[#02245b] hover:bg-blue-900 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    Ver Requisitos
                  </a>
                </div>
              </AccordionItem>
            </div>
          )}

          {/* UGAM */}
          {activeTab === 'ugam' && (
            <div className="space-y-3">
              <AccordionItem 
                id="ugam1" 
                title="Requisitos para Permiso de Tala de Árboles" 
                isOpen={expandedItem === 'ugam1'} 
                onToggle={() => toggleAccordion('ugam1')}
              >
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {Ugam1.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              </AccordionItem>
              <AccordionItem 
                id="ugam2" 
                title="Requisitos para Permiso de Traslado de Madera" 
                isOpen={expandedItem === 'ugam2'} 
                onToggle={() => toggleAccordion('ugam2')}
              >
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {Ugam2.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              </AccordionItem>
              <AccordionItem 
                id="ugam3" 
                title="Requisitos para Renovación de Contrato de Manzanaje Municipal" 
                isOpen={expandedItem === 'ugam3'} 
                onToggle={() => toggleAccordion('ugam3')}
              >
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {Ugam3.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              </AccordionItem>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

// ── Componentes Auxiliares ──

function AccordionItem({ id, title, isOpen, onToggle, children }: { id: string, title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) {
  return (
    <div className={`border ${isOpen ? 'border-blue-200 dark:border-blue-800 shadow-sm' : 'border-gray-100 dark:border-neutral-700'} rounded-2xl overflow-hidden transition-all duration-300`}>
      <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
          isOpen ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700/50'
        }`}
      >
        <span className={`font-semibold ${isOpen ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
          {title}
        </span>
        <div className={`p-1 rounded-full transition-colors ${isOpen ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-neutral-700'}`}>
          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
        </div>
      </button>
      
      <div 
        className={`grid transition-all duration-300 ease-in-out bg-white dark:bg-neutral-800 ${
          isOpen ? 'grid-rows-[1fr] opacity-100 border-t border-blue-100 dark:border-blue-900/30' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="p-5 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableTwoCols({ data }: { data: {req1: string, req2: string}[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-neutral-700 shadow-sm">
      <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
        <thead className="bg-gray-50 dark:bg-neutral-900/50 text-gray-800 dark:text-gray-200 font-semibold border-b border-gray-100 dark:border-neutral-700">
          <tr>
            <th className="px-5 py-4 w-1/2">{data[0].req1}</th>
            {data[0].req2 && <th className="px-5 py-4 w-1/2 border-l border-gray-100 dark:border-neutral-700">{data[0].req2}</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-neutral-700">
          {data.slice(1).map((row, i) => (
            <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-neutral-800/50 transition-colors">
              <td className="px-5 py-3.5">{row.req1}</td>
              {row.req2 && <td className="px-5 py-3.5 border-l border-gray-100 dark:border-neutral-700">{row.req2}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
