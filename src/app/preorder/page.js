"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PreOrderPage() {
  const [allVendorData, setAllVendorData] = useState([]); 
  const [daftarVendorUnik, setDaftarVendorUnik] = useState([]);
  const [barangTersedia, setBarangTersedia] = useState([]);
  const [orderList, setOrderList] = useState([]);
  
  const [namaPemesan, setNamaPemesan] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [jumlah, setJumlah] = useState("");
  const [keranjang, setKeranjang] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // --- CONFIG ---
  const STEIN_URL = "https://api.steinhq.com/v1/storages/69f83da192b1163e97c0e17a"; 
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500741728599146667/bOc0W_EHgTVo9LbDOggulqxVJCJvQL1tQ2FMtTFKDaByhA4h_ElZyEqpWh9X8_b7nNWi";

  useEffect(() => {
    const access = sessionStorage.getItem("access_granted");
    if (access === "true") {
      setIsAuthorized(true);
      setIsChecking(false);
      refreshData();
    } else {
      router.replace("/");
    }
  }, [router]);

  const refreshData = async () => {
    try {
      const resV = await fetch(`${STEIN_URL}/vendor`);
      const rawV = await resV.json();
      if (Array.isArray(rawV)) {
        const normalized = rawV.map(item => ({
          namaVendor: item.Nama_Vendor || "",
          namaBarang: item.Nama_Barang || "",
          hargaBarang: item.Harga_Barang || 0,
          statusOpen: (String(item.Status_Open || "")).toUpperCase()
        }));
        setAllVendorData(normalized);
        const openVendors = normalized.filter(v => v.statusOpen === "YES");
        setDaftarVendorUnik([...new Set(openVendors.map(v => v.namaVendor))]);
      }

      const resO = await fetch(`${STEIN_URL}/preOrder`);
      const rawO = await resO.json();
      if (Array.isArray(rawO)) {
        setOrderList(rawO.filter(o => o.Archived !== "YES").reverse());
      }
    } catch (err) { console.error(err); }
  };

  const handleCheckout = async () => {
    if (keranjang.length === 0) return;
    setLoading(true);
    try {
      const dataToPost = keranjang.map(item => ({
        Nama_Pemesan: item.namaPemesan,
        Nama_Vendor: item.namaVendor,
        Nama_Barang: item.namaBarang,
        Jumlah: item.jumlah,
        Subtotal: item.subtotal,
        Tanggal: new Date().toLocaleString("id-ID"),
        Status_Bayar: "BELUM",
        Status_Ambil: "BELUM",
        Status_Pesanan: "PROSES",
        Archived: "NO"
      }));

      await fetch(`${STEIN_URL}/preOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToPost)
      });

      setKeranjang([]);
      refreshData();
      alert("CHECKOUT BERHASIL!");
    } catch (err) { alert("Checkout gagal."); }
    setLoading(false);
  };

  // FUNGSI UPDATE STATUS UNTUK ADMIN
  const updateOrderStatus = async (tanggal, pemesan, field, value) => {
    try {
      await fetch(`${STEIN_URL}/preOrder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: { Tanggal: tanggal, Nama_Pemesan: pemesan },
          set: { [field]: value }
        })
      });
      refreshData();
    } catch (err) { alert("Gagal update status."); }
  };

  if (isChecking || !isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans text-[11px] uppercase tracking-tight">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-black text-red-600 italic">DCMC LOGISTICS</h1>
          <button onClick={() => { const p = prompt("Pass:"); if(p === "ADMIN123") setIsAdmin(!isAdmin); }} className="bg-slate-800 px-3 py-1 rounded text-[8px]">
            {isAdmin ? "ADMIN MODE" : "MEMBER MODE"}
          </button>
        </header>

        {/* ... (Panel Control Vendor tetap sama) ... */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Form & Cart Tetap Sama */}
        </div>

        {/* RIWAYAT DENGAN STATUS LENGKAP */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-[10px] font-bold text-slate-400 tracking-widest">MANAGEMENT PESANAN</h2>
            <button onClick={refreshData} className="text-[8px] bg-slate-700 px-2 py-1 rounded">REFRESH</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-500 text-[8px]">
                  <th className="p-4">TANGGAL</th>
                  <th className="p-4">PEMESAN / BARANG</th>
                  <th className="p-4 text-center">BAYAR</th>
                  <th className="p-4 text-center">AMBIL</th>
                  <th className="p-4 text-center">STATUS</th>
                  <th className="p-4 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {orderList.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 text-slate-500 text-[9px]">{order.Tanggal}</td>
                    <td className="p-4">
                      <div className="font-bold text-red-500">{order.Nama_Pemesan}</div>
                      <div className="text-slate-400 text-[9px] italic">{order.Nama_Barang} (x{order.Jumlah})</div>
                    </td>
                    
                    {/* STATUS BAYAR */}
                    <td className="p-4 text-center">
                      <button 
                        disabled={!isAdmin}
                        onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Bayar", order.Status_Bayar === "LUNAS" ? "BELUM" : "LUNAS")}
                        className={`px-2 py-1 rounded text-[8px] font-black ${order.Status_Bayar === "LUNAS" ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Bayar || "BELUM"}
                      </button>
                    </td>

                    {/* STATUS AMBIL */}
                    <td className="p-4 text-center">
                      <button 
                        disabled={!isAdmin}
                        onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Ambil", order.Status_Ambil === "SUDAH" ? "BELUM" : "SUDAH")}
                        className={`px-2 py-1 rounded text-[8px] font-black ${order.Status_Ambil === "SUDAH" ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Ambil || "BELUM"}
                      </button>
                    </td>

                    {/* STATUS PESANAN */}
                    <td className="p-4 text-center">
                      <button 
                        disabled={!isAdmin}
                        onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Pesanan", order.Status_Pesanan === "READY" ? "PROSES" : "READY")}
                        className={`px-2 py-1 rounded text-[8px] font-black ${order.Status_Pesanan === "READY" ? 'bg-yellow-600 text-black' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Pesanan || "PROSES"}
                      </button>
                    </td>

                    <td className="p-4 text-right font-black text-green-500">${order.Subtotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}