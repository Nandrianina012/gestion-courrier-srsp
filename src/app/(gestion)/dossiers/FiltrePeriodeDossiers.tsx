"use client";

type Props = {
  dateDebut: string;
  dateFin: string;
  onDateDebutChange: (date: string) => void;
  onDateFinChange: (date: string) => void;
  compact?: boolean;
};

export default function FiltrePeriodeDossiers({
  dateDebut,
  dateFin,
  onDateDebutChange,
  onDateFinChange,
  compact = false,
}: Props) {
  return (
    <div
      className={`flex flex-wrap items-end gap-3 ${compact ? "justify-start" : "justify-end"}`}
    >
      <p className="mr-1 -translate-y-2.5 text-sm font-medium text-slate-700">
        Période d’enregistrement
      </p>

      <div>
        <label
          htmlFor="date-debut-recherche-dossiers"
          className="mb-1 translate-x-1 block text-xs text-slate-500"
        >
          Du
        </label>
        <input
          id="date-debut-recherche-dossiers"
          type="date"
          value={dateDebut}
          max={dateFin || undefined}
          onChange={(e) => onDateDebutChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]"
        />
      </div>

      <div>
        <label
          htmlFor="date-fin-recherche-dossiers"
          className="mb-1 translate-x-1 block text-xs text-slate-500"
        >
          Au
        </label>
        <input
          id="date-fin-recherche-dossiers"
          type="date"
          value={dateFin}
          min={dateDebut || undefined}
          onChange={(e) => onDateFinChange(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#B38528] focus:ring-1 focus:ring-[#B38528]"
        />
      </div>

      {(dateDebut || dateFin) && (
        <button
          type="button"
          onClick={() => {
            onDateDebutChange("");
            onDateFinChange("");
          }}
          className="px-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
        >
          Effacer les dates
        </button>
      )}
    </div>
  );
}
