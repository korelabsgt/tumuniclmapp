import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

const subject = process.env.NEXT_PUBLIC_VAPID_SUBJECT?.startsWith("mailto:")
  ? process.env.NEXT_PUBLIC_VAPID_SUBJECT
  : `mailto:${process.env.NEXT_PUBLIC_VAPID_SUBJECT}`;

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  webPush.setVapidDetails(
    subject,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidConfigured = true;
}

export async function enviarPushBroadcast(params: {
  title: string;
  message: string;
  url: string;
  targetIds: string[];
}) {
  const uniqueTargets = [...new Set(params.targetIds.filter(Boolean))];
  if (uniqueTargets.length === 0) return;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY
  ) {
    return;
  }

  ensureVapid();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .in("user_id", uniqueTargets);

  if (!subscriptions?.length) return;

  const payload = JSON.stringify({
    title: params.title,
    body: params.message,
    icon: "/icon-192x192.png",
    data: {
      url: params.url,
      swal: {
        title: params.title,
        text: params.message,
        icon: "info",
        url: params.url,
      },
    },
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          sub.subscription as webPush.PushSubscription,
          payload,
        );
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}
