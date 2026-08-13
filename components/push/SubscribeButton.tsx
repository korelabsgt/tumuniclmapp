"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { urlBase64ToUint8Array } from "@/app/utils/vapid";
import { Bell, BellOff, Loader2, Check } from "lucide-react";
import { motion } from "framer-motion";

export default function SubscribeButton({
  userId,
  className,
  variant = "default",
  reserveSlot = false,
}: {
  userId: string | null;
  className?: string;
  variant?: "default" | "plain";
  reserveSlot?: boolean;
}) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [statusConfirmed, setStatusConfirmed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    setStatusConfirmed(false);

    const checkStatus = async () => {
      if (!("serviceWorker" in navigator) || !userId) {
        setIsSubscribed(false);
        setStatusConfirmed(true);
        return;
      }

      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            const subJson = JSON.parse(JSON.stringify(sub));

            const { data } = await supabase
              .from("push_subscriptions")
              .select("id")
              .match({ user_id: userId })
              .contains("subscription", subJson)
              .maybeSingle();

            if (data) {
              setIsSubscribed(true);
            } else {
              await sub.unsubscribe();
              setIsSubscribed(false);
            }
          }
        }
      } catch (e) {
        setIsSubscribed(false);
      } finally {
        setStatusConfirmed(true);
      }
    };

    void checkStatus();
  }, [userId]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (!("serviceWorker" in navigator)) return;

      const reg = await navigator.serviceWorker.register("/push-sw.js");
      await reg.update();

      const registration = await navigator.serviceWorker.ready;

      if (isSubscribed) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const subscriptionJson = JSON.parse(JSON.stringify(subscription));

          await supabase
            .from("push_subscriptions")
            .delete()
            .match({ user_id: userId })
            .contains("subscription", subscriptionJson);

          await subscription.unsubscribe();
        }
        setIsSubscribed(false);
      } else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) throw new Error();

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        const subscriptionJson = JSON.parse(JSON.stringify(sub));

        const { error } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            subscription: subscriptionJson,
            device_agent: navigator.userAgent,
          },
          { onConflict: "user_id, subscription" },
        );

        if (error) throw error;

        setIsSubscribed(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const esPlano = variant === "plain";

  if (!mounted || !statusConfirmed || !userId) {
    if (reserveSlot) {
      return (
        <div
          className={`h-10 w-10 shrink-0 ${className ?? ""}`}
          aria-hidden
        />
      );
    }
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
        esPlano
          ? "h-10 w-10 bg-transparent border-0 shadow-none hover:opacity-80"
          : `h-14 w-full rounded-md border ${
              isSubscribed
                ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`
      } ${className ?? ""}`}
      title={
        isSubscribed ? "Desactivar notificaciones" : "Activar notificaciones"
      }
    >
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
      ) : isSubscribed ? (
        <div className="relative">
          <Bell className="h-7 w-7 text-yellow-500 dark:text-yellow-400 fill-yellow-500 dark:fill-yellow-400" />
          {!esPlano ? (
            <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-white dark:border-neutral-900">
              <Check className="h-2.5 w-2.5 text-white stroke-[4]" />
            </div>
          ) : (
            <div className="absolute -top-0.5 -right-0.5 bg-green-500 rounded-full p-0.5">
              <Check className="h-2 w-2 text-white stroke-[4]" />
            </div>
          )}
        </div>
      ) : (
        <BellOff className="h-7 w-7 text-gray-400 dark:text-gray-500" />
      )}
      </button>
    </motion.div>
  );
}
