
"use client";

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
      setErreur("Impossible de joindre le serveur. Vérifie que le backend est lancé.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <form
        onSubmit={seConnecter}
        className="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">
            SRSP Mananjary
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Connectez-vous à votre compte
          </p>
        </div>

        <div>
          <label htmlFor="identifiant" className="mb-1 block text-sm text-black font-medium">
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
          <label htmlFor="motDePasse" className="mb-1 block text-sm text-black font-medium">
            Mot de passe
          </label>
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
          className="w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {chargement ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
