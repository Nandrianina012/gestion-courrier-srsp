import Link from "next/link";

export default function Sidebar() {
    return (
        <aside className="w-64 min-h-screen bg-slate-900 text-white p-6">
            <h2 className="text-xl font-bold mb-8 mt-3">SRSP Mananjary</h2>
            <hr />
            <nav className="flex flex-col gap-3 mt-5">
                <Link href="/" className="p-3 rounded hover:bg-slate-700">Tableau de bord</Link>
                <Link href="/mouvement" className="p-3 rounded hover:bg-slate-700">Mouvements</Link>
                <Link href="/bordereaux" className="p-3 rounded hover:bg-slate-700">Bordereaux d'envoi</Link>
                <Link href="/agent" className="p-3 rounded hover:bg-slate-700">Agents</Link>
                <Link href="/historique" className="p-3 rounded hover:bg-slate-700">Historiques</Link>
            </nav>
        </aside>
    )
}