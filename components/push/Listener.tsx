'use client'

import { useEffect } from 'react'
import Swal from 'sweetalert2'

export const ACTIVIDAD_PENDIENTE_REFRESH = 'actividad-pendiente-refresh'
export const PERMISO_MENSAJE_REFRESH = 'permiso-mensaje-refresh'

function navegar(url: string) {
  const path = url.startsWith('http') ? new URL(url).pathname : url

  if (window.location.pathname === path) {
    window.dispatchEvent(new CustomEvent(ACTIVIDAD_PENDIENTE_REFRESH))
    window.dispatchEvent(new CustomEvent(PERMISO_MENSAJE_REFRESH))
    return
  }

  window.location.href = url.startsWith('http') ? url : path
}

export default function NotificationListener() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent) => {
      if (!event.data?.type) return

      if (event.data.type === 'NAVIGATE') {
        const url = event.data.url as string
        if (url) navegar(url)
        return
      }

      if (event.data.type === 'SHOW_SWAL') {
        const { title, text, url } = event.data.payload

        const isDarkMode = document.documentElement.classList.contains('dark')
        const background = isDarkMode ? '#171717' : '#ffffff'
        const color = isDarkMode ? '#e5e7eb' : '#1f2937'

        Swal.fire({
          title: title || 'Notificación',
          text: text || '',
          imageUrl: '/images/logo-muni.png',
          imageWidth: 360,
          imageHeight: 'auto',
          imageAlt: 'Logo Municipalidad',
          confirmButtonText: url ? 'Ver actividad' : 'Estoy enterado',
          confirmButtonColor: '#d97706',
          showCancelButton: !!url,
          cancelButtonText: 'Cerrar',
          backdrop: true,
          allowOutsideClick: false,
          background,
          color,
          customClass: {
            popup: isDarkMode ? 'dark:border dark:border-neutral-800' : '',
            confirmButton: 'font-medium',
            cancelButton: 'font-medium',
          },
        }).then((result) => {
          if (result.isConfirmed && url) {
            navegar(url)
          }
        })
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}
