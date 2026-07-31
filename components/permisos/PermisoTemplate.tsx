"use client";

import React from 'react';
import { getRemuneradoBadgeClass, getRemuneradoEtiqueta } from './categorias';
import { PermisoEmpleado } from './types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  permiso: PermisoEmpleado;
}

const PermisoTemplate = React.forwardRef<HTMLDivElement, Props>(({ permiso }, ref) => {
  if (!permiso) return null;

  const fechaInicio = parseISO(permiso.inicio);
  const fechaFin = parseISO(permiso.fin);
  
  return (
    <div 
      ref={ref}
      className="p-8 bg-white text-neutral-900 border border-neutral-200 rounded-lg relative overflow-hidden"
      style={{
        width: '850px',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >

        <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-blue-600 relative z-10">
            <div className="flex items-center gap-4">
                <img src="/images/logo-muni.png" alt="Logo Municipalidad" className="h-16 object-contain" crossOrigin="anonymous" />
                <div>
                     <h2 className="text-xs font-bold text-neutral-500 tracking-wider">MUNICIPALIDAD DE CONCEPCIÓN LAS MINAS</h2>
                     <h3 className="text-[10px] text-neutral-400">Chiquimula, Guatemala</h3>
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-xl font-black text-blue-900 leading-tight">CONSTANCIA</h1>
                <h2 className="text-sm font-bold text-blue-600 uppercase">SOLICITUD DE PERMISO</h2>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1 block">Datos del Funcionario</label>
                <p className="text-base font-bold text-neutral-800 uppercase leading-none">{permiso.usuario?.nombre}</p>
                <p className="text-xs font-semibold text-blue-600 uppercase">{permiso.usuario?.puesto_nombre || 'Sin puesto asignado'}</p>
                <p className="text-xs text-neutral-500 font-medium italic">{permiso.usuario?.oficina_nombre || 'General'}</p>
            </div>
            <div className="text-center flex flex-col justify-center bg-blue-50/30 rounded-xl border border-blue-100/50 p-4">
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 block">Permiso:</label>
                <p className="text-sm font-black text-blue-800 capitalize tracking-tight">
                    {permiso.tipo.replace(/_/g, ' ')}
                </p>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-10 mb-8 relative z-10 p-6 bg-slate-50/50 border border-slate-100 rounded-2xl">
            <div className="relative pl-6 border-l-4 border-emerald-500">
                <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 block">Fecha de Inicio</label>
                <p className="text-base font-bold text-neutral-800 capitalize">
                  {format(fechaInicio, "eee dd/MMM/yy", { locale: es }).replace('.', '')}
                </p>
                <p className="text-sm text-neutral-500 font-medium">{format(fechaInicio, "h:mm a", { locale: es })}</p>
            </div>
            <div className="relative pl-6 border-l-4 border-orange-500">
                <label className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1 block">Fecha de Finalización</label>
                <p className="text-base font-bold text-neutral-800 capitalize">
                  {format(fechaFin, "eee dd/MMM/yy", { locale: es }).replace('.', '')}
                </p>
                <p className="text-sm text-neutral-500 font-medium">{format(fechaFin, "h:mm a", { locale: es })}</p>
            </div>
            <div className="col-span-2 mt-1">
                <p className="text-[10px] text-neutral-500 font-medium italic">
                  Solicitado: {format(parseISO(permiso.created_at), "eee dd/MMM/yy, h:mm a", { locale: es }).replace('.', '')}
                </p>
            </div>
        </div>

        {permiso.descripcion && (
            <div className="mb-8 relative z-10">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 block text-center">Motivo de la Solicitud</label>
                <div className="px-10 py-4 bg-neutral-50 rounded-xl text-neutral-600 text-sm leading-relaxed text-center italic border border-neutral-100">
                    "{permiso.descripcion}"
                </div>
            </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-8 relative z-10">
            <div className="flex flex-col gap-1 px-5 py-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Aprobado Jefe</label>
              <p className="text-sm font-bold text-neutral-800">
                {permiso.aprobado_jefe_nombre || "--"}
              </p>
              {permiso.aprobado_jefe_at ? (
                <p className="text-[10px] text-neutral-400 italic font-medium mt-0.5">
                  {format(parseISO(permiso.aprobado_jefe_at), "eee dd/MM/yy, h:mm a", { locale: es })}
                </p>
              ) : (
                <p className="text-[10px] text-neutral-400 italic font-medium mt-0.5">--</p>
              )}
            </div>
            <div className="flex flex-col gap-1 px-5 py-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Aprobado RRHH</label>
              <p className="text-sm font-bold text-neutral-800">
                {permiso.aprobado_rrhh_nombre || "--"}
              </p>
              {permiso.aprobado_rrhh_at ? (
                <p className="text-[10px] text-neutral-400 italic font-medium mt-0.5">
                  {format(parseISO(permiso.aprobado_rrhh_at), "eee dd/MM/yy, h:mm a", { locale: es })}
                </p>
              ) : (
                <p className="text-[10px] text-neutral-400 italic font-medium mt-0.5">--</p>
              )}
            </div>
        </div>

        <div className="flex justify-between items-end border-t border-neutral-100 pt-8 relative z-10">
            <div className="flex flex-col gap-3">
                 <div>

                    <div className="flex items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            permiso.estado === 'aprobado' 
                            ? 'bg-emerald-600 text-white' 
                            : permiso.estado.includes('rechazado')
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}>
                            {permiso.estado.replace(/_/g, ' ')}
                        </span>
                        
                        {permiso.remunerado !== null && (
                             <span className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider border ${getRemuneradoBadgeClass(permiso.remunerado)}`}>
                                {getRemuneradoEtiqueta(permiso.remunerado)}
                             </span>
                        )}
                    </div>
                 </div>
            </div>
            
            <div className="text-right">
                <div className="mb-2">
                    <p className="text-[10px] font-bold text-neutral-400 mb-0.5 tracking-wider">CÓDIGO DE VERIFICACIÓN</p>
                    <p className="text-sm font-mono text-neutral-400 font-black uppercase tracking-widest">{`${permiso.id.substring(0, 3)}-${permiso.id.substring(3, 6)}`}</p>
                </div>
            </div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1.5 flex">
            <div className="flex-1 bg-blue-900"></div>
            <div className="flex-1 bg-blue-600"></div>
            <div className="flex-1 bg-blue-400"></div>
            <div className="flex-1 bg-blue-200"></div>
        </div>
    </div>
  );
});

PermisoTemplate.displayName = 'PermisoTemplate';

export default PermisoTemplate;
