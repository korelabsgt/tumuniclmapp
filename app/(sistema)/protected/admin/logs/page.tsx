// app/protected/admin/logs/page.tsx
import Logs from '@/components/admin/logs/Logs';

export const dynamic = 'force-dynamic';

export default function LogsPage() {
  return (
    <div>
      <Logs />
    </div>
  );
}
