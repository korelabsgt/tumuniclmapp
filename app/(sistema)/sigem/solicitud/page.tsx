import { Suspense } from 'react';
import  Solicitud from '@/components/combustible/solicitudes/GestorSolicitudes';
import Cargando from '@/components/ui/animations/Cargando'; 

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> 
      <Solicitud />
    </Suspense>
  );
}