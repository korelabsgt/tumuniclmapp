import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminPortal from '@/components/home/admin/AdminPortal';
import { getConfiguracionPortal } from '@/components/home/lib/actions';

export default async function AdminPortalPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  // Si no hay sesión, redirigir al portal público (raíz)
  if (!session) {
    redirect('/');
  }

  // Cargar configuración global del portal
  const configuracion = await getConfiguracionPortal();

  return <AdminPortal configuracion={configuracion} />;
}
