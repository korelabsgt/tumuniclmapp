import "./globals.css";
import { Geist } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Script from "next/script";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        {children}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          theme="colored"
        />
        <Script
          src="https://cdn.lordicon.com/lordicon.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
