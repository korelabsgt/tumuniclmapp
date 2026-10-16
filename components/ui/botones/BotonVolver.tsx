'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BotonVolver({ ruta, className }: { ruta: string; className?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="link"
      onClick={() => router.push(ruta)}
      className={cn('flex h-10 items-center gap-2 px-4 text-xl text-blue-600', className)}
    >
      <LogOut className="h-5 w-5 rotate-180" />
      Volver
    </Button>
  );
}
