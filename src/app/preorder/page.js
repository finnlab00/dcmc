"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PreOrderPage() {
  const [vendorData, setVendorData] = useState([]);
  const [daftarVendorUnik, setDaftarVendorUnik] = useState([]);
  const [barangTersedia, setBarangTersedia] = useState([]);
  const [orderList, setOrderList] = useState([]);
  const [isPoOpen, setIsPoOpen] = useState(true);
  
  const [namaPemesan, setNamaPemesan] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [jumlah, setJumlah] = useState("");
  const [keranjang, setKeranjang] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // GANTI DENGAN URL WEBHOOK DISCORD ANDA
  const DISCORD_WEBHOOK_URL = "URL_WEBHOOK_DISCORD_ANDA";

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

  const refreshData = () => {
    fetch("https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/vendor")
      .then(res => res.json())
      .then(data => { 
        if (data && data.vendor) {
          const openVendors = data.vendor.filter(v => v.statusOpen === "YES");
          setVendorData(openVendors);
          setDaftarVendorUnik([...new Set(openVendors.map(v => v.namaVendor))]);
        } 
      });

    fetch("https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/preOrder")
      .then(res => res.json())
      .then(data => { 
        if (data && data.preOrder) {
          const activeOrders = data.preOrder.filter(o => o.archived !== "YES");
          setOrderList(activeOrders.reverse()); 
        } 
      });
  };

  // --- NOTIFIKASI DISCORD: PO DIBUKA (SPESIFIK VENDOR) ---
  const notifyPOOpen = async () => {
    if (!selectedVendor) return alert("Pilih vendor terlebih dahulu!");
    
    const message = {
      content: "🟢 **DCMC LOGISTICS | PRE-ORDER OPEN** 🟢",
      embeds: [{
        title: `📢 PEMESANAN DI ${selectedVendor.toUpperCase()} DIBUKA!`,
        description: "━━━━━━━━━━━━━━━━━━━━━━━━━━\nSesi pemesanan untuk vendor ini telah resmi dibuka. Silakan mengisi formulir di portal.\n━━━━━━━━━━━━━━━━━━━━━━━━━━",
        color: 3066993, // Warna Hijau
        fields: [
          { name: "📍 PORTAL AKSES:", value: "✅ [Link Portal Anda]" },
          { name: "📦 VENDOR AKTIF:", value: `**${selectedVendor.toUpperCase()}**` }
        ],
        footer: { text: "📡 DCMC System Alert" },
        timestamp: new Date()
      }]
    };

    try {
      await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
      alert(`Pengumuman PO ${selectedVendor} dikirim ke Discord!`);
    } catch (err) { console.error("Discord Error"); }
  };

  // --- NOTIFIKASI DISCORD: PO DITUTUP ---
  const notifyPOClose = async () => {
    const message = {
      content: "🔴 **DCMC LOGISTICS | PRE-ORDER CLOSED** 🔴",
      embeds: [{
        title: "Sesi Pre-Order Resmi Ditutup",
        description: "━━━━━━━━━━━━━━━━━━━━━━━━━━\nSistem sedang melakukan rekapitulasi data dan proses pengadaan barang.\n━━━━━━━━━━━━━━━━━━━━━━━━━━",
        color: 15158332, // Warna Merah
        fields: [
          { name: "⚠️ STATUS:", value: "Sistem Pengadaan (Procurement) Dimulai." }
        ],
        footer: { text: "📡 DCMC System Alert" },
        timestamp: new Date()
      }]
    };
    await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
    setIsPoOpen(false);
  };

  // --- NOTIFIKASI DISCORD: CARGO ARRIVAL ---
  const notifyDiscordArrival = async (vendorName, items) => {
    const itemListString = Object.keys(items).map(name => `🔹 **${name}** (x${items[name]})`).join("\n");
    const message = {
      content: "🚛 **DCMC LOGISTICS | CARGO ARRIVAL** 📦",
      embeds: [{
        title: `🏢 VENDOR: ${vendorName.toUpperCase()}`,
        description: "━━━━━━━━━━━━━━━━━━━━━━━━━━\n📦 **PASOKAN TELAH TIBA DI GUDANG**\n━━━━━━━━━━━━━━━━━━━━━━━━━━",
        color: 15548997, 
        fields: [
          { name: "📋 DAFTAR ITEM:", value: itemListString || "Tidak ada detail" },
          { name: "📍 STATUS:", value: "✅ **READY / SIAP DIAMBIL**" }
        ],
        footer: { text: "📡 DCMC System Alert" },
        timestamp: new Date()
      }]
    };
    await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
  };

  // --- LOGIKA UPDATE DATA ---
  const handleVendorReady = async (vendorName, items) => {
    if (!confirm(`Set semua pesanan ${vendorName} menjadi READY?`)) return;
    setLoading(true);
    const ordersToUpdate = orderList.filter(o => o.namaVendor === vendorName && o.statusPesanan === "Proses");
    try {
      for (const order of ordersToUpdate) {
        await fetch(`https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/preOrder/${order.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preorder: { statusPesanan: "Ready" } })
        });
      }
      notifyDiscordArrival(vendorName, items);
      refreshData();
    } catch (err) { alert("Error."); }
    setLoading(false);
  };

  if (isChecking || !isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans text-[11px] uppercase">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black text-red-600 italic tracking-tighter">DCMC Logistics</h1>
            <div className="flex gap-2 mt-1">
              <button onClick={() => { const p = prompt("Admin Pass:"); if(p === "ADMIN123") setIsAdmin(!isAdmin); }} className={`text-[8px] font-bold px-2 py-0.5 rounded tracking-widest ${isAdmin ? 'bg-red-600 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                {isAdmin ? "Admin Mode" : "Member Mode"}
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setIsPoOpen(true)} className="text-[8px] font-bold px-2 py-0.5 rounded bg-green-700 hover:bg-green-600">Open Form</button>
                  <button onClick={notifyPOClose} className="text-[8px] font-bold px-2 py-0.5 rounded bg-red-700 hover:bg-red-600">Close Form & Notify</button>
                </>
              )}
            </div>
          </div>
          <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-xs font-bold text-slate-500 hover:text-white">Exit</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {!isPoOpen ? (
            <div className="bg-red-900/20 p-10 rounded-xl border border-red-600/50 text-center flex flex-col justify-center items-center">
              <h2 className="text-2xl font-black text-red-600 mb-2 italic">PRE-ORDER CLOSED</h2>
              <p className="text-slate-400 tracking-widest text-[9px]">SEDANG DALAM PROSES PENGADAAN BARANG.</p>
            </div>
          ) : (
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-bold text-slate-400 tracking-[0.2em]">New Order</h2>
                {isAdmin && selectedVendor && (
                  <button onClick={notifyPOOpen} className="text-[8px] font-black bg-indigo-600 px-2 py-1 rounded hover:bg-indigo-500 transition-all">
                    📢 Announce {selectedVendor} Open
                  </button>
                )}
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (selectedVendor && selectedBarang) {
                  setKeranjang([...keranjang, { idTemp: Date.now(), namaPemesan, namaVendor: selectedVendor, namaBarang: selectedBarang.namaBarang, subtotal: selectedBarang.hargaBarang * parseInt(jumlah), jumlah }]);
                  setJumlah("");
                }
              }} className="space-y-4">
                <input type="text" required placeholder="NAMA PEMESAN" className="w-full p-3 rounded bg-slate-900 border border-slate-700 outline-none focus:border-red-600 text-white" value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} />
                <select required className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white" onChange={(e) => setSelectedVendor(e.target.value)}>
                  <option value="">-- Pilih Vendor --</option>
                  {daftarVendorUnik.map((v, i) => <option key={i} value={v}>{v}</option>)}
                </select>
                <select required disabled={!selectedVendor} className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white" onChange={(e) => setSelectedBarang(barangTersedia.find(b => b.namaBarang === e.target.value))}>
                  <option value="">-- Pilih Barang --</option>
                  {barangTersedia.map((b, i) => <option key={i} value={b.namaBarang}>{b.namaBarang} - ${b.hargaBarang}</option>)}
                </select>
                <input type="number" required placeholder="QTY" value={jumlah} className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white" onChange={(e) => setJumlah(e.target.value)} />
                <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 p-3 rounded font-black tracking-widest transition-all italic">Add to Cart</button>
              </form>
            </div>
          )}

          <div className="bg-slate-800 p-6 rounded-xl border border-red-900/20 shadow-xl h-fit">
            <h2 className="text-[10px] font-bold text-red-500 mb-6 flex justify-between uppercase">Cart <span>{keranjang.length}</span></h2>
            <div className="max-h-40 overflow-y-auto space-y-2 mb-6 pr-2">
              {keranjang.map((item) => (
                <div key={item.idTemp} className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
                  <p className="font-black italic">{item.namaBarang} <span className="text-red-500">x{item.jumlah}</span></p>
                  <button onClick={() => setKeranjang(keranjang.filter(i => i.idTemp !== item.idTemp))} className="text-red-500 font-black hover:text-white transition-all">REMOVE</button>
                </div>
              ))}
              {keranjang.length === 0 && <p className="text-center text-slate-600 italic py-10 uppercase text-[9px] tracking-widest">Keranjang Kosong</p>}
            </div>
            <button onClick={() => {/* Fungsi Checkout */}} disabled={loading || keranjang.length === 0} className="w-full bg-red-600 hover:bg-red-700 p-4 rounded font-black tracking-[0.2em] transition-all disabled:bg-slate-700">CHECKOUT</button>
          </div>
        </div>
        
        {/* PROCUREMENT SUMMARY SECTION TETAP SAMA SEPERTI SEBELUMNYA DENGAN TOMBOL "NOTIFY & READY" */}
      </div>
    </div>
  );
}