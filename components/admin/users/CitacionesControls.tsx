'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Search, ChevronsUp, ChevronsDown, Plus } from 'lucide-react';
import SelectorMesAnio from '@/components/tareas/SelectorMesAnio';

type DependenciaOption = {
  id: string;
  nombre: string | null;
};

interface CitacionesControlsProps {
  mesSeleccionado: number;
  anioSeleccionado: number;
  onMesChange: (mes: number, anio: number) => void;
  nivel2Id: string | null;
  setNivel2Id: (val: string | null) => void;
  nivel3Id: string | null;
  setNivel3Id: (val: string | null) => void;
  oficinasNivel2: DependenciaOption[];
  oficinasNivel3: DependenciaOption[];
  handleMostrarOficina: () => void;
  fechaInicialRango: string;
  setFechaInicialRango: (val: string) => void;
  fechaFinalRango: string;
  setFechaFinalRango: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  busquedaPor: 'dependencia' | 'nombre';
  setBusquedaPor: (val: 'dependencia' | 'nombre') => void;
  ordenDescendente: boolean;
  setOrdenDescendente: (val: boolean) => void;
  mostrarBotonNuevo?: boolean;
  etiquetaBotonNuevo?: string;
  onNuevo?: () => void;
}

export default function CitacionesControls({
  mesSeleccionado,
  anioSeleccionado,
  onMesChange,
  nivel2Id,
  setNivel2Id,
  nivel3Id,
  setNivel3Id,
  oficinasNivel2,
  oficinasNivel3,
  handleMostrarOficina,
  fechaInicialRango,
  setFechaInicialRango,
  fechaFinalRango,
  setFechaFinalRango,
  searchTerm,
  setSearchTerm,
  busquedaPor,
  setBusquedaPor,
  ordenDescendente,
  setOrdenDescendente,
  mostrarBotonNuevo = false,
  etiquetaBotonNuevo = 'Nuevo',
  onNuevo,
}: CitacionesControlsProps) {
  return (
    <div className="bg-gray-50 dark:bg-neutral-900 rounded-md p-3 space-y-2.5 border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
      <div className="flex items-center justify-between gap-2 w-full min-w-0 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1.5 shrink-0 min-w-0">
          <SelectorMesAnio
            mes={mesSeleccionado}
            anio={anioSeleccionado}
            onChange={onMesChange}
            className="!h-9 w-auto"
          />
          <Input
            type="date"
            value={fechaInicialRango}
            onChange={(e) => setFechaInicialRango(e.target.value)}
            className="h-9 w-[6.6rem] sm:w-[7.75rem] shrink-0 text-[11px] px-1.5 rounded-sm bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100"
          />
          <Input
            type="date"
            value={fechaFinalRango}
            onChange={(e) => setFechaFinalRango(e.target.value)}
            className="h-9 w-[6.6rem] sm:w-[7.75rem] shrink-0 text-[11px] px-1.5 rounded-sm bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100"
          />
        </div>

        {mostrarBotonNuevo && onNuevo && (
          <Button
            type="button"
            onClick={onNuevo}
            className="h-9 shrink-0 ml-auto text-[11px] sm:text-xs rounded-sm bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600 cursor-pointer flex items-center justify-center gap-1 px-2 sm:px-4 whitespace-nowrap"
          >
            <Plus size={14} className="shrink-0" />
            <span>{etiquetaBotonNuevo}</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 w-full min-w-0">
        <Select
          value={busquedaPor}
          onValueChange={(val) => setBusquedaPor(val as 'dependencia' | 'nombre')}
        >
          <SelectTrigger className="w-[6.5rem] sm:w-[8.5rem] shrink-0 bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs rounded-sm h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="dark:bg-neutral-800 dark:border-neutral-700">
            <SelectItem value="dependencia" className="dark:text-gray-200 dark:focus:bg-neutral-700">
              Dependencia
            </SelectItem>
            <SelectItem value="nombre" className="dark:text-gray-200 dark:focus:bg-neutral-700">
              Nombre
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs w-full rounded-sm h-9"
            placeholder={
              busquedaPor === 'dependencia'
                ? 'Filtrar por dependencia...'
                : 'Filtrar por nombre...'
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOrdenDescendente(!ordenDescendente)}
          className="h-9 shrink-0 text-[11px] sm:text-xs flex items-center justify-center gap-1.5 px-3 rounded-sm bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-700 cursor-pointer whitespace-nowrap"
        >
          {ordenDescendente ? (
            <ChevronsDown size={16} className="shrink-0" />
          ) : (
            <ChevronsUp size={16} className="shrink-0" />
          )}
          {ordenDescendente ? 'Descendente' : 'Ascendente'}
        </Button>
      </div>

      {oficinasNivel3.length > 1 && (
        <div className="flex w-full flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200 dark:border-neutral-800">
          <div className="w-full sm:flex-1">
            <Select
              onValueChange={(val) => setNivel2Id(val === 'todos' ? null : val)}
              value={nivel2Id || 'todos'}
            >
              <SelectTrigger className="bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs rounded-sm h-9">
                <SelectValue placeholder="Seleccionar Dependencia" />
              </SelectTrigger>
              <SelectContent className="dark:bg-neutral-800 dark:border-neutral-700">
                <SelectItem value="todos" className="dark:text-gray-200 dark:focus:bg-neutral-700">
                  Todas las dependencias
                </SelectItem>
                {oficinasNivel2.map((of) => (
                  <SelectItem
                    key={of.id}
                    value={of.id}
                    className="dark:text-gray-200 dark:focus:bg-neutral-700"
                  >
                    {of.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:flex-1">
            <Select
              onValueChange={(val) => setNivel3Id(val === 'todos' ? null : val)}
              value={nivel3Id || 'todos'}
              disabled={!nivel2Id}
            >
              <SelectTrigger className="bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs rounded-sm h-9">
                <SelectValue placeholder="Seleccionar Oficina" />
              </SelectTrigger>
              <SelectContent className="dark:bg-neutral-800 dark:border-neutral-700">
                <SelectItem value="todos" className="dark:text-gray-200 dark:focus:bg-neutral-700">
                  Todas las oficinas
                </SelectItem>
                {oficinasNivel3.map((of) => (
                  <SelectItem
                    key={of.id}
                    value={of.id}
                    className="dark:text-gray-200 dark:focus:bg-neutral-700"
                  >
                    {of.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-auto">
            <Button
              onClick={handleMostrarOficina}
              className="w-full text-xs rounded-sm bg-purple-600 hover:bg-purple-700 text-white h-9 dark:bg-purple-700 dark:hover:bg-purple-600 cursor-pointer"
            >
              Mostrar Oficina
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
