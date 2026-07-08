import "./globals.css";
import { Geist } from "next/font/google";
import HeaderAuth from "@/components/header-auth";
import LogoLink from "@/components/ui/LogoLink";
import FechaHoraActual from "@/components/ui/FechaHoraActual";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import NotificationListener from "@/components/push/Listener";
import { ThemeProvider } from "@/components/themes/theme-provider";
import { ThemeSwitcher } from "@/components/themes/theme-switcher";
import QueryProvider from "@/components/providers/QueryProvider";
import SystemGuard from "@/components/system-guard";
import DevBanner from "@/components/dev/DevBanner";
import BloqueoCitacion from "@/components/admin/users/BloqueoCitacion";
import BloqueoActividad from "@/components/tareas/BloqueoActividad";
import BloqueoSolicitudesJefes from "@/components/solicitudes/jefes/BloqueoSolicitudesJefes";

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
              <div className="flex flex-col min-h-screen">
                <DevBanner />
                <BloqueoCitacion />
                <BloqueoActividad />
                <BloqueoSolicitudesJefes />

                {isStandalonePage ? (
                  <main className="flex-grow w-full">{children}</main>
                ) : (
                  <>
                    <nav className="w-full flex border-b border-b-foreground/10 h-40">
                      <div className="w-full flex bg-gray-100 dark:bg-neutral-900 items-center justify-between px-1 pt-1 pb-0 text-sm transition-colors">
                        <div className="flex items-center gap-3">
                          <LogoLink />
                        </div>
                        <div className="shrink-0">
                          <HeaderAuth />
                        </div>
                      </div>
                    </nav>

                    <main className="flex flex-col gap-5 pt-2 flex-grow w-full mx-auto">
                      {children}
                    </main>

                    <footer className="mt-5 pt-5 pb-5 border-t border-foreground/10 bg-gray-100 dark:bg-neutral-900 text-gray-700 dark:text-gray-300 shrink-0 transition-colors">
                      <div className="w-full flex flex-row justify-between items-end px-6">
                        <div className="w-1/2 text-left">
                          <FechaHoraActual />
                          <p className="mt-5 text-xs md:text-base">
                            Powered by <br />
                            <a
                              href="https://www.oscar27jimenez.com"
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold hover:underline text-blue-600"
                            >
                              Ing. Oscar Jiménez
                            </a>
                          </p>
                        </div>

                        <div className="w-1/2 flex flex-col items-end gap-4 text-end text-xs md:text-sm leading-tight">
                          <div className="scale-75 origin-right md:scale-100">
                            <ThemeSwitcher />
                          </div>

                          <div>
                            <p>
                              © {new Date().getFullYear()} - Todos los derechos
                              reservados.
                            </p>
                            <p className="mt-2 text-[10px] md:text-xs text-blue-600 font-bold">
                              Versión 1.4.7
                            </p>
                          </div>
                        </div>
                      </div>
                    </footer>
                  </>
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
