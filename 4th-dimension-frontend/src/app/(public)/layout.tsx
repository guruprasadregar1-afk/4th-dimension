import { Navbar } from '@/components/shell/Navbar';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
