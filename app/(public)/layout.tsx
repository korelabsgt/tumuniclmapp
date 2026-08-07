import { ThemeProvider } from "@/components/themes/theme-provider";
import QueryProvider from "@/components/providers/QueryProvider";

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
      <QueryProvider>
        <main className="flex-grow w-full">
          {children}
        </main>
      </QueryProvider>
    </ThemeProvider>
  );
}
