import { Suspense } from 'react';
import  Combustible from '@/components/combustible/contrato/GestorContratos';
import Cargando from '@/components/ui/animations/Cargando'; 

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> 
      <Combustible />
    </Suspense>
  );
}