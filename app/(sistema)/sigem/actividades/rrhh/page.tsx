import { Suspense } from 'react';
import  Tareas from '@/components/tareas/gestorTareas';
import Cargando from '@/components/ui/animations/Cargando'; 

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> 
      <Tareas tipoVista="gestion_rrhh" />
    </Suspense>
  );
}