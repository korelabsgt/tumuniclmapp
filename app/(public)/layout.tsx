export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex-grow w-full">
      {children}
    </main>
  );
}
