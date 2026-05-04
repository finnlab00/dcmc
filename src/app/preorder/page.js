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

  // --- CONFIG: DATA PORTAL ---
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1500741728599146667/bOc0W_EHgTVo9LbDOggulqxVJCJvQL1tQ2FMtTFKDaByhA4h_ElZyEqpWh9X8_b7nNWi";
  const WEBSITE_URL = "https://dcmc-sable.vercel.app/"; 

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
      const resVendor = await fetch("https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/vendor");
      const dataV = await resVendor.json();
      
      const keyV = Object.keys(dataV)[0]; 
      const rawData = dataV[keyV] || [];

      // NORMALISASI DATA: Menangani header Nama_Vendor, Nama_Barang, dll
      const listVendor = rawData.map(item => {
        const normalized = {};
        Object.keys(item).forEach(key => {
          const cleanKey = key.replace(/[_\s]+/g, '').toLowerCase();
          normalized[cleanKey] = item[key];
        });
        
        return {
          id: normalized.id,
          namaVendor: normalized.namavendor || "",
          namaBarang: normalized.namabarang || "",
          hargaBarang: normalized.hargabarang || 0,
          statusOpen: (String(normalized.statusopen || "")).toUpperCase()
        };
      });

      if (listVendor.length > 0) {
        setAllVendorData(listVendor);
        // Dropdown member hanya menampilkan vendor yang statusnya YES
        const openVendors = listVendor.filter(v => v.statusOpen === "YES");
        const unik = [...new Set(openVendors.map(v => v.namaVendor))].filter(n => n !== "");
        setDaftarVendorUnik(unik);
      }

      const resOrder = await fetch("https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/preOrder");
      const dataO = await resOrder.json();
      const keyO = Object.keys(dataO)[0];
      setOrderList((dataO[keyO] || []).filter(o => o.archived !== "YES").reverse());

    } catch (err) {
      console.error("Gagal sinkronisasi database:", err);
    }
  };

  const toggleVendorStatus = async (vName, currentStatus) => {
    setLoading(true);
    const nextStatus = currentStatus === "YES" ? "NO" : "YES";
    const vendorRows = allVendorData.filter(v => v.namaVendor === vName);
    
    try {
      for (const row of vendorRows) {
        await fetch(`https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/vendor/${row.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor: { statusOpen: nextStatus } })
        });
      }
      refreshData();
    } catch (err) { alert("Gagal memperbarui status di Google Sheets."); }
    setLoading(false);
  };

  const sendDiscordNotif = async (type, vendorName) => {
    const isOpening = type === "OPEN";
    const barangVendor = allVendorData.filter(v => v.namaVendor === vendorName);
    const listBarangText = barangVendor.map(b => `▫️ **${b.namaBarang}** ($${b.hargaBarang})`).join("\n");

    const message = {
      content: `${isOpening ? "🟢" : "🔴"} **DCMC LOGISTICS | PO ${type}: ${vendorName}**`,
      embeds: [{
        title: `📢 PEMESANAN DI ${vendorName} ${isOpening ? "DIBUKA" : "DITUTUP"}!`,
        description: isOpening 
          ? `Silakan lakukan pemesanan melalui portal resmi:\n🔗 ${WEBSITE_URL}`
          : "Sesi pemesanan telah berakhir. Tim logistik sedang memproses pengadaan barang.",
        color: isOpening ? 3066993 : 15158332,
        fields: isOpening ? [{ name: "📋 ITEM TERSEDIA:", value: listBarangText || "Cek di portal" }] : [],
        footer: { text: "📡 DCMC System Alert" },
        timestamp: new Date()
      }]
    };

    try {
      await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
      alert(`Berhasil! Notifikasi ${type} untuk ${vendorName} sudah dikirim ke Discord.`);
    } catch (e) { alert("Gagal mengirim pesan ke Discord."); }
  };

  if (isChecking || !isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans text-[11px] uppercase tracking-tight">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black text-red-600 italic tracking-tighter">DCMC LOGISTICS</h1>
            <button onClick={() => { const p = prompt("Admin Pass:"); if(p === "ADMIN123") setIsAdmin(!isAdmin); }} className={`text-[8px] font-bold px-2 py-0.5 rounded mt-1 transition-all ${isAdmin ? 'bg-red-600 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
              {isAdmin ? "ADMIN MODE" : "MEMBER MODE"}
            </button>
          </div>
          <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-xs font-bold text-slate-500 hover:text-white">EXIT</button>
        </header>

        {/* VENDOR CONTROL CENTER */}
        {isAdmin && (
          <div className="bg-slate-800 p-4 rounded-xl border border-indigo-900/50 mb-8 shadow-lg">
            <h2 className="text-[10px] font-bold text-indigo-400 mb-4 tracking-[0.2em]">VENDOR CONTROL CENTER</h2>
            <div className="flex flex-wrap gap-3">
              {[...new Set(allVendorData.map(v => v.namaVendor))].filter(n => n !== "").map((vName) => {
                const vInfo = allVendorData.find(v => v.namaVendor === vName);
                const isOpen = vInfo.statusOpen === "YES";
                return (
                  <div key={vName} className={`p-3 rounded border flex flex-col gap-2 transition-all ${isOpen ? 'bg-green-600/10 border-green-600' : 'bg-red-600/10 border-red-600'}`}>
                    <span className="font-black text-white">{vName}</span>
                    <div className="flex gap-1">
                      <button disabled={loading} onClick={() => toggleVendorStatus(vName, vInfo.statusOpen)} className="px-2 py-1 bg-slate-700 rounded text-[7px] font-bold hover:bg-slate-600 transition-colors">
                        {isOpen ? "⛔ CLOSE PO" : "🔓 OPEN PO"}
                      </button>
                      <button onClick={() => sendDiscordNotif(isOpen ? "OPEN" : "CLOSED", vName)} className="px-2 py-1 bg-indigo-600 rounded text-[7px] font-bold italic hover:bg-indigo-500 transition-colors">
                        📢 NOTIF
                      </button>
                    </div>
                  </div>
                );
              })}
              {allVendorData.length === 0 && <p className="text-slate-600 italic text-[9px]">MENUNGGU DATA DARI GOOGLE SHEETS...</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* FORM INPUT */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit shadow-2xl">
            <h2 className="text-[10px] font-bold text-slate-400 mb-6 tracking-[0.2em]">NEW ORDER</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedVendor && selectedBarang) {
                setKeranjang([...keranjang, { idTemp: Date.now(), namaPemesan, namaVendor: selectedVendor, namaBarang: selectedBarang.namaBarang, subtotal: selectedBarang.hargaBarang * parseInt(jumlah), jumlah }]);
                setJumlah("");
              }
            }} className="space-y-4">
              <input type="text" required placeholder="NAMA PEMESAN" className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white focus:border-red-600 outline-none" value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} />
              
              <select required className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white font-black" value={selectedVendor} onChange={(e) => {
                setSelectedVendor(e.target.value);
                setBarangTersedia(allVendorData.filter(v => v.namaVendor === e.target.value));
              }}>
                <option value="">-- PILIH VENDOR --</option>
                {daftarVendorUnik.map((v, i) => <option key={i} value={v}>{v}</option>)}
              </select>

              <select required disabled={!selectedVendor} className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white font-bold" onChange={(e) => setSelectedBarang(barangTersedia.find(b => b.namaBarang === e.target.value))}>
                <option value="">-- PILIH BARANG --</option>
                {barangTersedia.map((b, i) => <option key={i} value={b.namaBarang}>{b.namaBarang} - ${b.hargaBarang}</option>)}
              </select>

              <input type="number" required placeholder="QTY" value={jumlah} className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white outline-none" onChange={(e) => setJumlah(e.target.value)} />
              <button type="submit" className="w-full bg-red-700 hover:bg-red-600 p-3 rounded font-black tracking-widest transition-all italic">ADD TO CART</button>
            </form>
          </div>

          {/* KERANJANG */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl h-fit">
            <h2 className="text-[10px] font-bold text-red-500 mb-6 flex justify-between uppercase font-black italic">CART <span>{keranjang.length}</span></h2>
            <div className="max-h-40 overflow-y-auto space-y-2 mb-6">
              {keranjang.map((item) => (
                <div key={item.idTemp} className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
                  <p className="font-black italic">{item.namaBarang} <span className="text-red-500">x{item.jumlah}</span></p>
                  <button onClick={() => setKeranjang(keranjang.filter(i => i.idTemp !== item.idTemp))} className="text-red-500 font-bold hover:text-white transition-colors">REMOVE</button>
                </div>
              ))}
              {keranjang.length === 0 && <p className="text-center text-slate-600 italic py-10 uppercase text-[9px] tracking-widest">KERANJANG KOSONG</p>}
            </div>
            <button disabled={keranjang.length === 0} className="w-full bg-red-600 hover:bg-red-700 p-4 rounded font-black tracking-[0.2em] transition-all disabled:bg-slate-700 uppercase italic">CHECKOUT ORDER</button>
          </div>
        </div>
      </div>
    </div>
  );
}