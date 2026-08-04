import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import webPush from 'web-push'

interface Comision {
  id: string
  titulo: string
  comision_asistentes: { asistente_id: string }[]
}

webPush.setVapidDetails(
  `mailto:${process.env.NEXT_PUBLIC_VAPID_SUBJECT}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const startOfMinute = new Date(now)
    startOfMinute.setSeconds(0, 0)
    
    const endOfMinute = new Date(now)
    endOfMinute.setSeconds(59, 999)

    const { data: commissions, error } = await supabase
      .from('comisiones')
      .select(`
        id, 
        titulo,
        comision_asistentes!inner ( asistente_id )
      `)
      .gte('fecha_hora', startOfMinute.toISOString())
      .lte('fecha_hora', endOfMinute.toISOString())
      .eq('notificacion_inicio_enviada', false)
      .eq('aprobado', true)
      .returns<Comision[]>()

    if (error) throw error

    let processedCount = 0

    if (commissions && commissions.length > 0) {
      const allUserIds = new Set<string>()
      
      for (const comision of commissions) {
        comision.comision_asistentes.forEach(a => allUserIds.add(a.asistente_id))
      }

      if (allUserIds.size > 0) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('user_id, subscription')
          .in('user_id', Array.from(allUserIds))

        const subsMap = new Map()
        subs?.forEach(s => {
          if (!subsMap.has(s.user_id)) {
            subsMap.set(s.user_id, [])
          }
          subsMap.get(s.user_id).push(s.subscription)
        })

        const notifications = []
        const comisionesToUpdate = []

        for (const comision of commissions) {
          const asistentes = comision.comision_asistentes.map(a => a.asistente_id)
          
          for (const userId of asistentes) {
            const userSubs = subsMap.get(userId)
            if (userSubs) {
              const payload = JSON.stringify({
                title: '⏰ Comisión Iniciando',
                body: `La comisión "${comision.titulo}" inicia ahora. RECUERDA MARCAR TU ASISTENCIA.`,
                url: `/sigem/comisiones?id=${comision.id}`,
                icon: '/icon-192x192.png'
              })

              for (const sub of userSubs) {
                notifications.push(
                  webPush.sendNotification(sub, payload).catch(console.error)
                )
              }
            }
          }
          comisionesToUpdate.push(comision.id)
        }

        if (notifications.length > 0) {
          await Promise.all(notifications)
          processedCount = notifications.length
        }

        if (comisionesToUpdate.length > 0) {
          await supabase
            .from('comisiones')
            .update({ notificacion_inicio_enviada: true })
            .in('id', comisionesToUpdate)
        }
      }
    }

    return NextResponse.json({ success: true, processed: processedCount }, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}