"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [role, setRole] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Mengecek apakah sudah login
    const savedRole = localStorage.getItem("userRole");
    if (!savedRole) {
      router.push("/login");
    } else {
      setRole(savedRole);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="flex justify-between items-center mb-10 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-red-600">DCMC WAREHOUSE</h1>
          <p className="text-sm text-slate-400">Role: <span className="text-white font-mono">{role}</span></p>
        </div>
        <button onClick={handleLogout} className="bg-slate-800 hover:bg-red-700 px-4 py-2 rounded transition-colors text-sm">
          EXIT SYSTEM
        </button>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tombol Stok Barang */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-red-500 transition-all cursor-pointer">
          <h3 className="text-xl font-bold mb-2">📦 STOK GUDANG</h3>
          <p className="text-slate-400 text-sm">Cek jumlah barang, harga beli, dan harga jual.</p>
        </div>

        {/* Tombol Pre-Order - Khusus Member/Admin */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-red-500 transition-all cursor-pointer">
          <h3 className="text-xl font-bold mb-2">🛒 PRE-ORDER</h3>
          <p className="text-slate-400 text-sm">Pesan barang ke vendor yang tersedia.</p>
        </div>

        {/* Tombol Keuangan - Khusus Admin */}
        {role === "Admin" && (
          <div className="bg-red-900/20 p-6 rounded-lg border border-red-900/50 hover:border-red-500 transition-all cursor-pointer">
            <h3 className="text-xl font-bold mb-2 text-red-500">💰 KEUANGAN</h3>
            <p className="text-slate-400 text-sm">Pantau modal, pendapatan, dan profit kantor.</p>
          </div>
        )}
      </main>
    </div>
  );
}