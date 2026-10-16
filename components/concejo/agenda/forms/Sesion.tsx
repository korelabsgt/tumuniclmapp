'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ModalCancel,
  ModalInput,
  ModalLabel,
  ModalSelect,
  ModalShell,
  ModalSubmit,
} from '@/components/ui/general-modal';
import { crearAgenda, editarAgenda, getTodayDate } from '../lib/acciones';
import { type AgendaConcejo } from '../lib/esquemas';
import { parseISO, getHours, getMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sesionSchema, type SesionFormData } from '../lib/esquemas';
import Calendario from '@/components/ui/Calendario';
import { obtenerDestinatariosClave } from '../lib/usuarios/notificaciones'; 

interface SesionProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  agendaAEditar?: AgendaConcejo | null;
}

const parseDescripcion = (descripcion: string) => {
  if (!descripcion) return { acta: '', libro: '' };
  const match = descripcion.match(/ACTA (.*), LIBRO (.*)/);
  if (match && match.length === 3) {
    return { acta: match[1], libro: match[2] };
  }
  return { acta: '', libro: '' };
};

const convert24to12 = (h24: number): { hora12: string; periodo: string } => {
  const periodo = h24 >= 12 ? 'PM' : 'AM';
  let hora12 = h24 % 12;
  if (hora12 === 0) hora12 = 12;
  return { hora12: String(hora12).padStart(2, '0'), periodo };
};

const convert12to24 = (hora12: string, periodo: string): string => {
  let h24 = parseInt(hora12, 10);
  if (periodo === 'PM' && h24 < 12) h24 += 12;
  if (periodo === 'AM' && h24 === 12) h24 = 0;
  return String(h24).padStart(2, '0');
};

export default function Sesion({ isOpen, onClose, onSave, agendaAEditar }: SesionProps) {
  const isEditMode = !!agendaAEditar;

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue } = useForm<SesionFormData>({
    resolver: zodResolver(sesionSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      acta: '',
      libro: '',
      fecha_reunion: getTodayDate(),
      hora_reunion: '08:00',
    }
  });

  const [hora, setHora] = useState('08');
  const [minuto, setMinuto] = useState('00');
  const [periodo, setPeriodo] = useState('AM');

  const actaForm = watch('acta');
  const libroForm = watch('libro');

  useEffect(() => {
    if (actaForm && libroForm) {
      setValue('descripcion', `ACTA ${actaForm}, LIBRO ${libroForm}`);
    } else {
      setValue('descripcion', '');
    }
  }, [actaForm, libroForm, setValue]);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && agendaAEditar) {
        let { acta, libro } = parseDescripcion(agendaAEditar.descripcion);
        
        if (agendaAEditar.acta) acta = agendaAEditar.acta;
        if (agendaAEditar.libro) libro = agendaAEditar.libro;

        const fechaHoraDB = parseISO(agendaAEditar.fecha_reunion);
        const h24 = getHours(fechaHoraDB);
        const m = getMinutes(fechaHoraDB);

        const { hora12: newHora12, periodo: newPeriodo } = convert24to12(h24);

        reset({
          titulo: agendaAEditar.titulo,
          descripcion: agendaAEditar.descripcion,
          acta: acta,
          libro: libro,
          fecha_reunion: format(fechaHoraDB, 'yyyy-MM-dd'),
          hora_reunion: `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        });

        setHora(newHora12);
        setMinuto(String(m).padStart(2, '0'));
        setPeriodo(newPeriodo);
      } else {
        reset({
          titulo: '',
          descripcion: '',
          acta: '',
          libro: '',
          fecha_reunion: getTodayDate(),
          hora_reunion: '08:00',
        });
        setHora('08');
        setMinuto('00');
        setPeriodo('AM');
      }
    }
  }, [isOpen, reset, isEditMode, agendaAEditar]);

  const handleTimeChange = (newHour: string, newMinute: string, newPeriod: string) => {
    const h24 = convert12to24(newHour, newPeriod);
    const nuevaHoraForm = `${h24}:${newMinute}`;
    setValue('hora_reunion', nuevaHoraForm, { shouldValidate: true });

    setHora(newHour);
    setMinuto(newMinute);
    setPeriodo(newPeriod);
  };

  const onSubmit = async (formData: SesionFormData) => {
    const combinedFormData = {
      ...formData,
      fecha_reunion: `${formData.fecha_reunion}T${formData.hora_reunion}:00-06:00`,
    };

    const result = isEditMode
      ? await editarAgenda(agendaAEditar!.id, combinedFormData as any)
      : await crearAgenda(combinedFormData as any);

    if (result) {
      if (!isEditMode) {
        try {
          const targetIds = await obtenerDestinatariosClave();
          
          if (targetIds.length > 0) {
            const fechaObj = parseISO(formData.fecha_reunion);
            const fechaTexto = format(fechaObj, "EEEE d 'de' MMMM", { locale: es });
            const fechaCapitalizada = fechaTexto.charAt(0).toUpperCase() + fechaTexto.slice(1);

            await fetch('/api/push/broadcast', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: '💼 Nueva Sesión de Concejo',
                message: `Se ha programado la sesión: "${formData.titulo}" para el ${fechaCapitalizada}, a las ${hora}:${minuto} ${periodo}, haz clic para ver 🤳.`,
                url: `/protected/concejo/agenda`,
                targetIds: targetIds
              })
            });
          }
        } catch (error) {
          console.error("Error enviando notificaciones:", error);
        }
      }

      onSave();
      onClose();
    }
  };

  const panel =
    'flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900';

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Editar sesión' : 'Nueva sesión'}
      hideHeader
      animated
      panelClassName="sm:max-w-4xl"
      bodyClassName="px-4 pb-2 pt-10 sm:px-4 sm:pb-2 sm:pt-10"
      footerClassName="px-4 py-2 sm:pb-2"
      footer={
        <div className="flex flex-row items-stretch justify-end gap-2">
          <ModalCancel
            onClick={onClose}
            className="h-9 min-w-0 w-auto flex-1 border-0 bg-[#0066cc] px-3 text-white hover:bg-[#005bb5] dark:bg-blue-400 dark:text-white dark:hover:bg-blue-500 sm:flex-none sm:px-4"
          >
            Cancelar
          </ModalCancel>
          <ModalSubmit
            form="form-sesion-concejo"
            disabled={isSubmitting}
            className="h-9 min-w-0 w-auto flex-1 border border-zinc-300 bg-white px-3 text-zinc-900 shadow-none hover:bg-zinc-50 dark:border-zinc-600 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 sm:flex-none sm:px-4"
          >
            {isSubmitting ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Crear sesión'}
          </ModalSubmit>
        </div>
      }
    >
      <form id="form-sesion-concejo" onSubmit={handleSubmit(onSubmit)}>
        <p className="pointer-events-none absolute left-4 top-2 flex h-8 items-center text-sm font-semibold text-[#0066cc] dark:text-blue-400">
          {isEditMode ? 'Editar sesión' : 'Nueva sesión'}
        </p>
        <div className="grid items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <div className={`${panel} space-y-3`}>
            <div>
              <ModalLabel htmlFor="titulo">Título</ModalLabel>
              <ModalInput
                id="titulo"
                {...register('titulo')}
                placeholder="Ej. Sesión Ordinaria de enero"
                className={errors.titulo ? 'border-red-500' : ''}
              />
              {errors.titulo && <p className="mt-1 text-sm text-red-500">{errors.titulo.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <ModalLabel htmlFor="acta">Acta</ModalLabel>
                <ModalInput
                  id="acta"
                  {...register('acta')}
                  placeholder="Ej. 1-2025"
                  className={errors.acta ? 'border-red-500' : ''}
                />
                {errors.acta && <p className="mt-1 text-sm text-red-500">{errors.acta.message}</p>}
              </div>
              <div>
                <ModalLabel htmlFor="libro">Libro</ModalLabel>
                <ModalInput
                  id="libro"
                  {...register('libro')}
                  placeholder="Ej. 01"
                  className={errors.libro ? 'border-red-500' : ''}
                />
                {errors.libro && <p className="mt-1 text-sm text-red-500">{errors.libro.message}</p>}
              </div>
            </div>

            <div>
              <ModalLabel>Hora de la reunión</ModalLabel>
              <div className="flex items-center gap-2">
                <ModalInput
                  type="text"
                  value={hora}
                  onChange={(e) => handleTimeChange(e.target.value, minuto, periodo)}
                  className="w-20 px-2 text-center"
                  aria-label="Hora"
                />
                <span className="text-zinc-700 dark:text-zinc-200">:</span>
                <ModalInput
                  type="text"
                  value={minuto}
                  onChange={(e) => handleTimeChange(hora, e.target.value, periodo)}
                  className="w-20 px-2 text-center"
                  aria-label="Minutos"
                />
                <ModalSelect
                  value={periodo}
                  onChange={(e) => handleTimeChange(hora, minuto, e.target.value)}
                  className="w-24"
                  aria-label="AM o PM"
                >
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </ModalSelect>
              </div>
              {errors.hora_reunion && <p className="mt-1 text-sm text-red-500">{errors.hora_reunion.message}</p>}
            </div>
          </div>

          <div className={panel}>
            <ModalLabel htmlFor="fecha">Fecha</ModalLabel>
            <Calendario
              fechaSeleccionada={watch('fecha_reunion')}
              onSelectDate={(date: string) => setValue('fecha_reunion', date, { shouldValidate: true })}
              className="h-full flex-1 space-y-2 border-0 bg-transparent p-0 shadow-none dark:bg-transparent"
            />
            {errors.fecha_reunion && <p className="mt-1 text-sm text-red-500">{errors.fecha_reunion.message}</p>}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}