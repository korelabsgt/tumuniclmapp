import { ThemeProvider } from "@/components/themes/theme-provider";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <main className="flex-grow w-full">
        {children}
      </main>
    </ThemeProvider>
  );
}
