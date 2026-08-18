'use client';

import { Suspense } from 'react';
import { SignupForm } from './signupForm';
import Cargando from '@/components/ui/animations/Cargando'; // 1. Importar el componente

export default function SignupPage() {
  return (
    <Suspense fallback={<Cargando />}> {/* 2. Usar el componente aquí */}
      <SignupForm />
    </Suspense>
  );
}