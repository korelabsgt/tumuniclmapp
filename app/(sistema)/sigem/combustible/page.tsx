import { Suspense } from 'react';
import  Combustible from '@/components/combustible/entregaCupon/GestorEntrega';
import Cargando from '@/components/ui/animations/Cargando'; 

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> 
      <Combustible />
    </Suspense>
  );
}