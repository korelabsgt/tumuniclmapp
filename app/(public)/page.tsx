import { Suspense } from 'react';
import HomePublico from "@/components/home/HomePublico";

export default async function Home() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
        <HomePublico />
      </Suspense>
    </>
  );
}
