import "./globals.css";
import { Geist } from "next/font/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import NotificationListener from "@/components/push/Listener";
import { ThemeProvider } from "@/components/themes/theme-provider";
import QueryProvider from "@/components/providers/QueryProvider";
import MouseBackNavigation from "@/components/providers/MouseBackNavigation";
import SystemGuard from "@/components/system-guard";
import DevBanner from "@/components/dev/DevBanner";
import BloqueoCitacion from "@/components/admin/users/BloqueoCitacion";
import BloqueoActividad from "@/components/tareas/BloqueoActividad";
import BloqueoSolicitudesJefes from "@/components/solicitudes/jefes/BloqueoSolicitudesJefes";
import BloqueoPermisoMensaje from "@/components/permisos/BloqueoPermisoMensaje";
import ProtectedChrome from "@/components/layout/ProtectedChrome";
import { PAGE_BG_CLASS } from "@/components/layout/chrome";

export const metadata: Metadata = {
  title: "SIGEM -CLM-",
  description: "Sistema Integral de Gestión Municiplal - Concepción Las Minas",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    shortcut: "/icon-192x192.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SIGEM -CLM-",
    startupImage: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const geistSans = Geist({ display: "swap", subsets: ["latin"] });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "";
  const isStandalonePage = pathname === "/" || pathname.startsWith("/albergues");

  return (
    <html lang="es" className={geistSans.className} suppressHydrationWarning>

      <body className="bg-background text-foreground" suppressHydrationWarning>
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            <SystemGuard>
              <NotificationListener />
              <MouseBackNavigation />
              <div className={`flex h-[100dvh] flex-col overflow-hidden ${PAGE_BG_CLASS}`}>
                <BloqueoCitacion />
                <BloqueoActividad />
                <BloqueoPermisoMensaje />
                <BloqueoSolicitudesJefes />

                {isStandalonePage ? (
                  <main className="w-full flex-1 overflow-y-auto">
                    <DevBanner />
                    {children}
                  </main>
                ) : (
                  <ProtectedChrome>{children}</ProtectedChrome>
                )}

                <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  theme="colored"
                />
                <script
                  src="https://cdn.lordicon.com/lordicon.js"
                  async
                ></script>
              </div>
            </SystemGuard>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
