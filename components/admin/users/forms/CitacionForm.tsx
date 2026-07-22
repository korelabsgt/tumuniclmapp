"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { crearCitacion, actualizarCitacion } from "./citacionActions";
import Swal from "sweetalert2";

interface CitacionFormProps {
  id: string;
  initialData?: any;
  nombreEmpleado?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function CitacionForm({
  id,
  initialData,
  nombreEmpleado,
  onSuccess,
  onCancel,
}: CitacionFormProps) {
  const [motivo, setMotivo] = useState("");
  const [fechaCita, setFechaCita] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setMotivo(initialData.motivo || "");
      if (initialData.fecha_cita) {
        const date = new Date(initialData.fecha_cita);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        setFechaCita(`${year}-${month}-${day}T${hours}:${minutes}`);
      }
    }
  }, [initialData]);

  const sendPushNotification = async (titulo: string, mensaje: string, targetId: string) => {
    try {
      await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titulo,
          message: mensaje,
          url: '/protected/admin/citaciones',
          targetIds: [targetId]
        }),
      });
    } catch (error) {
      console.error('Error enviando notificación push:', error);
    }
  };

  const handleSubmit = async () => {
    if (!motivo || !fechaCita) {
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
    if (initialData) {
      result = await actualizarCitacion(
        initialData.id,
        motivo,
        new Date(fechaCita).toISOString()
      );
    } else {
      result = await crearCitacion(
        id,
        motivo,
        new Date(fechaCita).toISOString()
      );
    }

    setLoading(false);

    if (result.success) {
      if (!initialData) {
        await sendPushNotification(
          "Aviso de Recursos Humanos",
          "Se le ha programado una citación. Por favor ingrese al sistema para ver los detalles.",
          id
        );
      }

      Swal.fire({
        title: "Éxito",
        text: initialData ? "Citación actualizada correctamente" : "Citación registrada y notificada correctamente",
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

  const nombre = nombreEmpleado?.trim() || 'empleado';

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
        <h2 className="flex flex-col items-center sm:flex-row sm:flex-wrap sm:justify-center gap-1 text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight">
          <span>{initialData ? 'Citación de' : 'Nueva citación a:'}</span>
          <span className="text-blue-600 dark:text-blue-400 text-center">{nombre}</span>
        </h2>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
            Motivo de la Citación <span className="text-blue-500">*</span>
          </label>
          <textarea
            id="motivo"
            placeholder="Describe el motivo por el cual se cita al empleado..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            className="w-full bg-gray-50 dark:bg-neutral-800/50 border-2 border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white outline-none resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
            Fecha y Hora de la Cita <span className="text-blue-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={fechaCita}
            onChange={(e) => setFechaCita(e.target.value)}
            className="w-full bg-gray-50 dark:bg-neutral-800/50 border-2 border-slate-200 dark:border-neutral-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white outline-none"
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
            initialData ? 'Actualizar Citación' : 'Enviar Citación'
          )}
        </button>
      </div>
    </div>
  );
}
