import Sidebar from "@/components/Sidebar";

export default function GestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}