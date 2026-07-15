'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Search, User, Calendar, ChevronLeft, ChevronRight, ChevronsUp, ChevronsDown } from 'lucide-react';

interface AsistenciaControlsProps {
  nivel2Id: string | null;
  setNivel2Id: (val: string | null) => void;
  nivel3Id: string | null;
  setNivel3Id: (val: string | null) => void;
  oficinasNivel2: any[];
  oficinasNivel3: any[];
  handleMostrarOficina: () => void;
  weekLabel: string;
  handleWeekChange: (dir: 'prev' | 'next') => void;
  jumpToCurrentWeek: () => void;
  isNextWeekFuture: boolean;
  fechaInicialRango: string;
  setFechaInicialRango: (val: string) => void;
  fechaFinalRango: string;
  setFechaFinalRango: (val: string) => void;
  handleAplicarFechaManual: () => void;
  handleBorrarFiltro: () => void;
  vistaAgrupada: 'nombre' | 'fecha';
  setVistaAgrupada: (val: 'nombre' | 'fecha') => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  busquedaPor: 'dependencia' | 'nombre';
  setBusquedaPor: (val: 'dependencia' | 'nombre') => void;
  ordenDescendente: boolean;
  setOrdenDescendente: (val: boolean) => void;
}

export default function AsistenciaControls({
  nivel2Id, setNivel2Id,
  nivel3Id, setNivel3Id,
  oficinasNivel2, oficinasNivel3,
  handleMostrarOficina,
  weekLabel, handleWeekChange, jumpToCurrentWeek, isNextWeekFuture,
  fechaInicialRango, setFechaInicialRango,
  fechaFinalRango, setFechaFinalRango,
  handleAplicarFechaManual, handleBorrarFiltro,
  vistaAgrupada, setVistaAgrupada,
  searchTerm, setSearchTerm,
  busquedaPor, setBusquedaPor,
  ordenDescendente, setOrdenDescendente
}: AsistenciaControlsProps) {

  useEffect(() => {
    jumpToCurrentWeek();
  }, []);

  useEffect(() => {
    if (fechaInicialRango && fechaFinalRango) {
      const timer = setTimeout(() => {
        handleAplicarFechaManual();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [fechaInicialRango, fechaFinalRango]);
  
  return (
    <div className="bg-gray-50 dark:bg-neutral-900 rounded-md p-3 space-y-3 border border-gray-100 dark:border-neutral-800 transition-colors duration-200">
      
      <div className="flex flex-col lg:flex-row gap-2 w-full items-center">
        
        {/* Botón de Ordenamiento a la IZQUIERDA con Doble Flecha */}
        <div className="flex shrink-0">
            <Button
                variant="outline"
                size="icon"
                onClick={() => setOrdenDescendente(!ordenDescendente)}
                className="h-9 w-9 bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-700"
                title={ordenDescendente ? "Orden Descendente" : "Orden Ascendente"}
            >
                {ordenDescendente ? <ChevronsDown size={16} /> : <ChevronsUp size={16} />}
            </Button>
        </div>

        <div className="flex shrink-0 rounded-md border border-gray-200 dark:border-neutral-700 p-1 bg-gray-200 dark:bg-neutral-900 h-9 items-center">
          <Button 
            size="sm" 
            onClick={() => setVistaAgrupada('nombre')}
            className={`h-7 px-3 text-xs gap-2 transition-all duration-200 rounded-sm ${
              vistaAgrupada === 'nombre' 
                ? 'bg-white text-blue-600 shadow-sm font-bold hover:bg-white dark:bg-neutral-700 dark:text-blue-400 dark:hover:bg-neutral-700' 
                : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-300/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-neutral-800'
            }`}
          >
            <User size={13} /> Nombre
          </Button>
          <Button 
            size="sm" 
            onClick={() => setVistaAgrupada('fecha')}
            className={`h-7 px-3 text-xs gap-2 transition-all duration-200 rounded-sm ${
              vistaAgrupada === 'fecha' 
                ? 'bg-white text-blue-600 shadow-sm font-bold hover:bg-white dark:bg-neutral-700 dark:text-blue-400 dark:hover:bg-neutral-700' 
                : 'bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-300/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Calendar size={13} /> Fecha
          </Button>
        </div>

        <div className="flex shrink-0">
          <Button onClick={() => handleWeekChange('prev')} variant="outline" className="h-9 w-9 p-0 rounded-r-none bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-700">
            <ChevronLeft size={16} />
          </Button>
          <Button onClick={jumpToCurrentWeek} variant="outline" className="h-9 px-3 rounded-none text-xs bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-700 min-w-[140px]">
            {weekLabel}
          </Button>
          <Button onClick={() => handleWeekChange('next')} variant="outline" className="h-9 w-9 p-0 rounded-l-none bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-200 dark:hover:bg-neutral-700" disabled={isNextWeekFuture}>
            <ChevronRight size={16} />
          </Button>
        </div>

        <div className="flex gap-2 shrink-0">
          <Input
            type="date"
            value={fechaInicialRango}
            onChange={(e) => setFechaInicialRango(e.target.value)}
            className="w-[135px] text-xs rounded-sm bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 h-9"
          />
          <Input
            type="date"
            value={fechaFinalRango}
            onChange={(e) => setFechaFinalRango(e.target.value)}
            className="w-[135px] text-xs rounded-sm bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-100 h-9"
          />
        </div>

        <div className="flex flex-1 w-full gap-2 min-w-0">
          <Select
            value={busquedaPor}
            onValueChange={(val) => setBusquedaPor(val as 'dependencia' | 'nombre')}
          >
            <SelectTrigger className="w-[8.5rem] shrink-0 bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs rounded-sm h-9">
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
        </div>

      </div>

      {oficinasNivel3.length > 1 && (
        <div className="flex w-full flex-col sm:flex-row gap-3 pt-2 border-t border-gray-200 dark:border-neutral-800">
          <div className="w-full sm:flex-1">
            <Select onValueChange={(val) => setNivel2Id(val === 'todos' ? null : val)} value={nivel2Id || 'todos'}>
              <SelectTrigger className="bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs rounded-sm h-9">
                <SelectValue placeholder="Seleccionar Dependencia" />
              </SelectTrigger>
              <SelectContent className="dark:bg-neutral-800 dark:border-neutral-700">
                <SelectItem value="todos" className="dark:text-gray-200 dark:focus:bg-neutral-700">Todas las dependencias</SelectItem>
                {oficinasNivel2.map(of => (
                  <SelectItem key={of.id} value={of.id} className="dark:text-gray-200 dark:focus:bg-neutral-700">{of.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:flex-1">
            <Select onValueChange={(val) => setNivel3Id(val === 'todos' ? null : val)} value={nivel3Id || 'todos'} disabled={!nivel2Id}>
              <SelectTrigger className="bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs rounded-sm h-9">
                <SelectValue placeholder="Seleccionar Oficina" />
              </SelectTrigger>
              <SelectContent className="dark:bg-neutral-800 dark:border-neutral-700">
                <SelectItem value="todos" className="dark:text-gray-200 dark:focus:bg-neutral-700">Todas las oficinas</SelectItem>
                {oficinasNivel3.map(of => (
                  <SelectItem key={of.id} value={of.id} className="dark:text-gray-200 dark:focus:bg-neutral-700">{of.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-auto">
            <Button 
              onClick={handleMostrarOficina} 
              className="w-full text-xs rounded-sm bg-purple-600 hover:bg-purple-700 text-white h-9 dark:bg-purple-700 dark:hover:bg-purple-600"
            >
                Mostrar Oficina
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}