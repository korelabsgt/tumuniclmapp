import { Suspense } from 'react';
import  VerJefes from '@/components/admin/jefes/VerJefes';
import Cargando from '@/components/ui/animations/Cargando'; 

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> 
      <VerJefes />
    </Suspense>
  );
}