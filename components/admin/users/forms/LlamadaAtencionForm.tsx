"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { crearLlamadaAtencion, actualizarLlamadaAtencion } from "./llamadaAtencionActions";
import Swal from "sweetalert2";

interface LlamadaAtencionFormProps {
  id: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function LlamadaAtencionForm({ id, initialData, onSuccess, onCancel }: LlamadaAtencionFormProps) {
  const [tipo, setTipo] = useState(initialData?.tipo || "");
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || "");
  const [loading, setLoading] = useState(false);

  const isEditing = !!initialData;

  const handleSubmit = async () => {
    if (!tipo || !descripcion) {
      Swal.fire({
        title: "Error",
        text: "Por favor llena todos los campos",
        icon: "error",
        background: '#18181b',
        color: '#ffffff'
      });
      return;
    }

    setLoading(true);
    let result;
    if (isEditing) {
      result = await actualizarLlamadaAtencion(initialData.id, tipo, descripcion);
    } else {
      result = await crearLlamadaAtencion(id, tipo, descripcion);
    }
    setLoading(false);

    if (result.success) {
      Swal.fire({
        title: "Éxito",
        text: isEditing ? "Llamada de atención actualizada" : "Llamada de atención registrada correctamente",
        icon: "success",
        background: '#18181b',
        color: '#ffffff'
      });
      onSuccess();
    } else {
      Swal.fire({
        title: "Error",
        text: "No se pudo guardar: " + result.error,
        icon: "error",
        background: '#18181b',
        color: '#ffffff'
      });
    }
  };

  return (
    <div className="flex flex-col w-full bg-white dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-neutral-800">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/images/logo-muni.png"
            alt="Logo"
            className="h-10 sm:h-12 object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-black text-neutral-600 dark:text-neutral-400 tracking-widest uppercase leading-tight">
              Municipalidad de Concepción Las Minas
            </p>
            <p className="text-[9px] sm:text-[10px] font-bold text-neutral-500/80 tracking-wide mt-0.5">
              Chiquimula, Guatemala
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 p-2 rounded-lg text-[#1a95d3] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 sm:px-6 pt-5 pb-1 text-center border-b border-slate-100 dark:border-neutral-800">
        <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
          {isEditing ? "Editar Llamada de Atención" : "Nueva Llamada de Atención"}
        </h2>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
            Tipo de Llamada de Atención <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full bg-gray-50 dark:bg-neutral-800/50 border-2 border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white outline-none appearance-none pr-10 cursor-pointer"
            >
              <option className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-white" value="" disabled>Seleccione un tipo...</option>
              <option className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-white" value="Verbal">Verbal</option>
              <option className="bg-white dark:bg-neutral-800 text-gray-900 dark:text-white" value="Escrita">Escrita</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
            Descripción <span className="text-red-500">*</span>
          </label>
          <textarea
            id="descripcion"
            placeholder="Describe el motivo de la llamada de atención..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={5}
            className="w-full bg-gray-50 dark:bg-neutral-800/50 border-2 border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white outline-none resize-none"
          />
        </div>
      </div>

      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-blue-900" />
        <div className="flex-1 bg-blue-600" />
        <div className="flex-1 bg-blue-400" />
        <div className="flex-1 bg-blue-200" />
      </div>

      <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-neutral-800 flex justify-center">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-10 py-2.5 text-sm font-bold bg-slate-900 dark:bg-blue-600 text-white rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[10rem]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            'Guardar Registro'
          )}
        </button>
      </div>
    </div>
  );
}
