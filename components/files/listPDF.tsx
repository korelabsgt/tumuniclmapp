'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { FileText, Trash2, Loader2, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import Swal from 'sweetalert2'
import VerPDF from './verPDF'

interface FileRecord {
  id: string
  nombre: string
  file_path: string
  created_at: string
}

interface ListPDFProps {
  bucketName: string
  tableName: string
  referenceId: string
  referenceColumn: string
  refreshTrigger?: number
  rol: string
}

export default function ListPDF({
  bucketName,
  tableName,
  referenceId,
  referenceColumn,
  refreshTrigger = 0,
  rol,
}: ListPDFProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingFile, setViewingFile] = useState<FileRecord | null>(null)

  const supabase = createClient()
  const router = useRouter()

  const puedeEliminar = ['SUPER', 'SECRETARIO', 'SEC-TECNICO'].includes(rol)

  useEffect(() => {
    fetchFiles()
  }, [referenceId, refreshTrigger])

  const fetchFiles = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(referenceColumn, referenceId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFiles(data || [])
    } catch (error) {
      console.error('Error cargando archivos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, filePath: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar archivo?',
      text: "Esta acción no se puede deshacer",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      setDeletingId(id)
      
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([filePath])

      if (storageError) console.error('Error storage:', storageError)

      const { error: dbError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      setFiles(files.filter(f => f.id !== id))
      toast.success('Archivo eliminado correctamente')
      router.refresh()

    } catch (error) {
      console.error(error)
      toast.error('Error al eliminar el archivo')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Cargando documentos...</div>

  if (files.length === 0) {
    return <div className="text-sm italic text-muted-foreground">No hay PDFs adjuntos.</div>
  }

  return (
    <>
      <div className="flex flex-col gap-2 mt-4">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-white">Documentos adjuntos ({files.length})</h3>
        <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-700 dark:border-zinc-700 dark:bg-zinc-900">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between p-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/80">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex-shrink-0 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
                  <FileText className="h-5 w-5 text-red-500 dark:text-red-400" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="max-w-[180px] truncate text-sm font-medium text-zinc-900 dark:text-zinc-100 sm:max-w-xs">
                    {file.nombre}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(file.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewingFile(file)}
                  className="cursor-pointer rounded-xl p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-[#0066cc] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-blue-400"
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4" />
                </button>

                {puedeEliminar && (
                  <button
                    onClick={() => handleDelete(file.id, file.file_path)}
                    disabled={deletingId === file.id}
                    className="cursor-pointer rounded-xl p-2 text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    title="Eliminar"
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <VerPDF
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        filePath={viewingFile?.file_path || ''}
        fileName={viewingFile?.nombre || ''}
        bucketName={bucketName}
      />
    </>
  )
}
