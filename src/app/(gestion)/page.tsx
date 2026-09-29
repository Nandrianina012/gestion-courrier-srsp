

export default function Home() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-slate-800">
          Tableau de bord
        </h1>

        <p className="mt-2 text-gray-600">
          Bienvenue dans votre espace de gestion des courriers.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">BE reçus</p>
            <h2 className="mt-2 text-3xl font-bold">0</h2>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">Dossiers en cours</p>
            <h2 className="mt-2 text-3xl font-bold">0</h2>
          </div>

          <div className="rounded-xl bg-white p-6 shadow">
            <p className="text-gray-500">Dossiers traités</p>
            <h2 className="mt-2 text-3xl font-bold">0</h2>
          </div>
        </div>
      </main>
    </div>
    
  );
}
