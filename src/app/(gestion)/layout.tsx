import TopNav from "@/components/TopNav";

export default function GestionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav />

      <main className="mx-auto max-w-7xl px-5 py-8 pt-28">{children}</main>

      <footer className="mt-10 border-t border-slate-200 bg-white px-5 py-5 text-center text-sm text-slate-500">
        SRSP Vatovavy — Gestion et suivi des dossiers administratifs
      </footer>
    </div>
  );
}
