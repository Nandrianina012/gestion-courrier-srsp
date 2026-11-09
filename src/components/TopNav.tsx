"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const menus = [
  { label: "Tableau de bord", href: "/" },
  { label: "Dossiers", href: "/dossiers" },
];



type Notification = {
  idNotification: number;
  idDossier: number | null;
  message: string;
  lu: boolean;
  dateCreation: string | null;
};

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [plusOuvert, setPlusOuvert] = useState(false);
  const [compteOuvert, setCompteOuvert] = useState(false);
  const [notificationsOuvertes, setNotificationsOuvertes] = useState(false);

  const [identifiant, setIdentifiant] = useState("");
  const [role, setRole] = useState("");

  const options = [
    ...(role === "ADMIN" ? [{ label: "Agents", href: "/agent" }] : []),
    { label: "Historique", href: "/historique" },
  ];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chargementNotifications, setChargementNotifications] =
    useState(false);

  useEffect(() => {
    setIdentifiant(sessionStorage.getItem("identifiant") || "");
    setRole(sessionStorage.getItem("role") || "");
  }, []);

  async function chargerNotifications() {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setNotifications([]);
      return;
    }

    try {
      setChargementNotifications(true);

      const response = await fetch(
        "http://127.0.0.1:8000/api/notifications",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
  const erreur = await response.text();

  console.error(
    "Erreur API notifications :",
    response.status,
    erreur
  );

  throw new Error(
    `Impossible de récupérer les notifications (${response.status}).`
  );
}

      const data = await response.json();

      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des notifications :",
        error
      );
    } finally {
      setChargementNotifications(false);
    }
  }


useEffect(() => {
  const token = sessionStorage.getItem("access_token");

  if (!token || pathname === "/login") {
    setNotifications([]);
    return;
  }

  void chargerNotifications();

  function actualiserNotifications() {
    void chargerNotifications();
  }

  window.addEventListener(
    "actualiser-notifications",
    actualiserNotifications
  );

  return () => {
    window.removeEventListener(
      "actualiser-notifications",
      actualiserNotifications
    );
  };
}, [pathname]);


  async function marquerNotificationCommeLue(
    notification: Notification
  ) {
    if (notification.lu) {
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/notifications/${notification.idNotification}/lue`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Impossible de marquer la notification comme lue."
        );
      }

      setNotifications((notificationsActuelles) =>
        notificationsActuelles.map((item) =>
          item.idNotification === notification.idNotification
            ? { ...item, lu: true }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Erreur lors de la lecture de la notification :",
        error
      );
    }
  }

  function formaterDate(date: string | null) {
    if (!date) {
      return "";
    }

    const dateObjet = new Date(date);

    if (Number.isNaN(dateObjet.getTime())) {
      return "";
    }

    return dateObjet.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function estActif(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function ouvrirNotifications() {
    setNotificationsOuvertes(!notificationsOuvertes);
    setPlusOuvert(false);
    setCompteOuvert(false);

    if (!notificationsOuvertes) {
      chargerNotifications();
    }
  }

  function seDeconnecter() {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("identifiant");
    sessionStorage.removeItem("role");

    router.replace("/login");
  }

  const nombreNotificationsNonLues = notifications.filter(
    (notification) => !notification.lu
  ).length;

  return (
    <header className="fixed left-0 top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5">
        {/* Logo et identité */}
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            src="/logoDRGFVatovavy.jpg"
            alt="Logo DRGF Vatovavy"
            width={52}
            height={52}
            priority
            className="h-12 w-12 object-contain"
          />

          <div className="hidden sm:block">
            <p className="font-bold text-slate-900">SRSP Vatovavy</p>
            <p className="text-xs text-slate-500">
              Gestion des dossiers administratifs
            </p>
          </div>
        </Link>

        {/* Navigation principale */}
        <nav className="flex items-center gap-1">
          {menus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                estActif(menu.href)
                  ? "bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] text-white shadow-sm"
                  : "text-slate-600 hover:bg-amber-50 hover:text-[#8C6A1E]"
              }`}
            >
              {menu.label}
            </Link>
          ))}

          {/* Menu Plus */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPlusOuvert(!plusOuvert);
                setCompteOuvert(false);
                setNotificationsOuvertes(false);
              }}
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                plusOuvert || options.some((option) => estActif(option.href))
                  ? "bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] text-white shadow-sm"
                  : "text-slate-600 hover:bg-amber-50 hover:text-[#8C6A1E]"
              }`}
            >
              Plus
              <span aria-hidden="true">▾</span>
            </button>

            {plusOuvert && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                {options.map((option) => (
                  <Link
                    key={option.href}
                    href={option.href}
                    onClick={() => setPlusOuvert(false)}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
                      estActif(option.href)
                        ? "bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] text-white shadow-sm"
                        : "text-slate-700 hover:bg-amber-50 hover:text-[#8C6A1E]"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Notifications et compte */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Cloche de notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={ouvrirNotifications}
              aria-label="Notifications"
              title="Notifications"
              className={`relative rounded-lg p-2 text-slate-600 transition ${
                notificationsOuvertes
                  ? "bg-amber-50 text-[#8C6A1E]"
                  : "hover:bg-amber-50 hover:text-[#8C6A1E]"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>

              {/* Badge nombre de notifications non lues */}
              {nombreNotificationsNonLues > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-sm">
                  {nombreNotificationsNonLues > 99
                    ? "99+"
                    : nombreNotificationsNonLues}
                </span>
              )}
            </button>

            {/* Panneau des notifications */}
            {notificationsOuvertes && (
              <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Notifications
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {nombreNotificationsNonLues > 0
                        ? `${nombreNotificationsNonLues} non lue${
                            nombreNotificationsNonLues > 1 ? "s" : ""
                          }`
                        : "Aucune notification non lue"}
                    </p>
                  </div>

                  {chargementNotifications && (
                    <span className="text-xs text-slate-400">
                      Actualisation...
                    </span>
                  )}
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-[#8C6A1E]">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                          <path d="M10 21h4" />
                        </svg>
                      </div>

                      <p className="text-sm font-medium text-slate-700">
                        Aucune notification
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Vous êtes à jour.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.idNotification}
                        type="button"
                        onClick={async () => {
  await marquerNotificationCommeLue(notification);
  setNotificationsOuvertes(false);

  if (notification.idDossier !== null) {
    router.push(`/dossiers?dossierId=${notification.idDossier}`);
  }
}}
                        className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                          notification.lu
                            ? "bg-white hover:bg-slate-50"
                            : "bg-amber-50/60 hover:bg-amber-50"
                        }`}
                      >
                        <div className="flex gap-3">
                          <span
                            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                              notification.lu
                                ? "bg-slate-300"
                                : "bg-red-500"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm leading-5 ${
                                notification.lu
                                  ? "font-normal text-slate-700"
                                  : "font-semibold text-slate-900"
                              }`}
                            >
                              {notification.message}
                            </p>

                            {notification.idDossier && (
                              <p className="mt-1 text-xs font-medium text-[#8C6A1E]">
                                Dossier #{notification.idDossier}
                              </p>
                            )}

                            <p className="mt-1 text-[11px] text-slate-400">
                              {formaterDate(notification.dateCreation)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Menu du compte */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setCompteOuvert(!compteOuvert);
                setPlusOuvert(false);
                setNotificationsOuvertes(false);
              }}
              className="flex items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-amber-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#8C6A1E] via-[#B38528] to-[#C6A04A] text-sm font-semibold text-white shadow-sm">
                {identifiant ? identifiant.charAt(0).toUpperCase() : "U"}
              </span>

              <span className="hidden max-w-28 text-left sm:block">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {identifiant || "Mon compte"}
                </span>
              </span>

              <span className="text-xs text-slate-500">▾</span>
            </button>

            {compteOuvert && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {identifiant || "Utilisateur"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {role || "Rôle non défini"}
                </p>

                <hr className="my-3 border-slate-200" />

                <button
                  type="button"
                  onClick={seDeconnecter}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dégradé doré */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#705212] via-[#B38528] to-[#8C6A1E]" />
    </header>
  );
}