'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import TablaOrganos from './TablaOrganos';
import { Button } from '@/components/ui/button';
import Swal from 'sweetalert2';
import { crear } from './Acciones';
import { Plus, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- Tipos ---
type Organo = { id: number; nombre: string; "No": number; };
type Politica = { id: number; nombre: string; "No": number; };
type Asignacion = { organo_id: number; politica_id: number; anio: number; politicas: { nombre: string | null }; };

export default function VerOrganos() {
    const [organos, setOrganos] = useState<Organo[]>([]);
    const [politicas, setPoliticas] = useState<Politica[]>([]);
    const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
    const [loading, setLoading] = useState(true);
    const anioActual = new Date().getFullYear();
    const [filtroAnio, setFiltroAnio] = useState<string>(anioActual.toString());
    const router = useRouter();

    const fetchData = async () => {
        setLoading(true);
        const supabase = createClient();
        const [organosRes, politicasRes, asignacionesRes] = await Promise.all([
            supabase.from('organos').select('id, nombre, "No"').order('No', { ascending: true }),
            supabase.from('politicas').select('id, nombre, "No"'),
            supabase.from('organos_politicas').select('*, politicas(nombre)')
        ]);

        if (organosRes.error || politicasRes.error || asignacionesRes.error) {
            Swal.fire('Error', 'Error al cargar datos.', 'error');
        } else {
            setOrganos(organosRes.data || []);
            setPoliticas(politicasRes.data || []);
            setAsignaciones(asignacionesRes.data as Asignacion[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const anioSiguiente = anioActual + 1;
    const aniosExistentes = asignaciones.map(a => a.anio);
    const aniosDisponibles = [...new Set([anioActual, anioSiguiente, ...aniosExistentes])].sort((a, b) => b - a);
    const asignacionesDelAnio = asignaciones.filter(a => a.anio.toString() === filtroAnio);

    if (loading) { return <div className="text-center py-10">Cargando datos...</div>; }

    return (
        <div className="p-4 md:p-6">
            {/* --- INICIO DEL CAMBIO --- */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
                {/* Grupo Izquierdo: Volver y Título */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push("/sigem")}
                        className="text-blue-600 underline p-2"
                    >
                        Volver
                    </Button>
                    <h1 className="text-2xl font-bold">Órganos y Políticas</h1>
                </div>
                
                {/* Grupo Derecho: Filtro y Botón Crear */}
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="flex-1">
                        <label htmlFor="filtro-anio" className="sr-only">Año de Asignaciones:</label>
                        <select
                            id="filtro-anio"
                            value={filtroAnio}
                            onChange={(e) => setFiltroAnio(e.target.value)}
                            className="h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm"
                        >
                            {aniosDisponibles.map(anio => (<option key={anio} value={anio}>{anio}</option>))}
                        </select>
                    </div>
                    <Button onClick={() => crear('politica', fetchData)} className="gap-2">
                        <FileText className="h-4 w-4" />
                        Crear Órgano
                    </Button>
                </div>
            </div>
            {/* --- FIN DEL CAMBIO --- */}
            
            <TablaOrganos
                organos={organos}
                politicas={politicas}
                asignaciones={asignacionesDelAnio}
                filtroAnio={filtroAnio}
                onDataChange={fetchData}
            />
        </div>
    );
}