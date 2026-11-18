"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const reponse = await fetch("http://127.0.0.1:8000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifiant, motDePasse }),
      });

      const donnees = await reponse.json();

      if (!reponse.ok) {
        setErreur(donnees.detail || "Connexion impossible.");
        return;
      }

      sessionStorage.setItem("access_token", donnees.access_token);
      sessionStorage.setItem("identifiant", donnees.identifiant);
      sessionStorage.setItem("role", donnees.role);

      router.push("/");
    } catch {
      setErreur(
        "Impossible de joindre le serveur. Vérifie que le backend est lancé."
      );
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      {/* Conteneur global : 2 colonnes sur écran moyen/grand (md:grid-cols-2) */}
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden md:grid md:grid-cols-2 items-center">
        
        {/* === COLONNE DE GAUCHE : Logo et Titre institutionnel === */}
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50/60 border-b md:border-b-0 md:border-r border-gray-100 text-center">
          <div className="relative w-48 h-48 mb-4">
            <Image
              src="/logoDRBFVatovavy2.jpg"
              alt="Logo DRBF Vatovavy"
              fill
              className="object-contain"
              priority
            />
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
            Direction Régionale du Budget et des Finances VATOVAVY
          </p>
        </div>

        {/* === COLONNE DE DROITE : Le Formulaire de connexion === */}
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">SRSP Mananjary</h1>
            <p className="text-sm text-gray-500 mt-1">
              Connectez-vous à votre compte
            </p>
          </div>

          <form onSubmit={seConnecter} className="space-y-4">
            <div>
              <label
                htmlFor="identifiant"
                className="mb-1 block text-sm font-medium text-black"
              >
                Identifiant
              </label>
              <input
                id="identifiant"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                required
                autoComplete="username"
                className="w-full text-black rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="motDePasse"
                  className="block text-sm font-medium text-black"
                >
                  Mot de passe
                </label>
                <a href="http://localhost:3000/login#" className="text-xs text-blue-600 hover:underline">
                  Oublié ?
                </a>
              </div>
              <input
                id="motDePasse"
                type="password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full text-black rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {erreur && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={chargement}
              className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-50 transition"
            >
              {chargement ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}