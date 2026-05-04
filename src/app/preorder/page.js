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

  const STEIN_URL = "https://api.steinhq.com/v1/storages/69f83da192b1163e97c0e17a"; 
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

  // LOGIKA REKAP PER VENDOR
  const getRekapPerVendor = (vName) => {
    const rekap = orderList
      .filter(order => order.Nama_Vendor === vName)
      .reduce((acc, order) => {
        const barang = order.Nama_Barang;
        acc[barang] = (acc[barang] || 0) + parseInt(order.Jumlah || 0);
        return acc;
      }, {});
    return Object.entries(rekap);
  };

  const copyRekapVendor = (vName) => {
    const items = getRekapPerVendor(vName);
    const text = items.map(([name, qty]) => `• ${name} (Total: ${qty})`).join("\n");
    navigator.clipboard.writeText(`REKAP ORDER VENDOR: ${vName}\n\n${text || "Belum ada pesanan."}`);
    alert(`Rekap ${vName} disalin!`);
  };

  const toggleVendorStatus = async (vName, currentStatus) => {
    setLoading(true);
    const nextStatus = currentStatus === "YES" ? "NO" : "YES";
    try {
      await fetch(`${STEIN_URL}/vendor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: { Nama_Vendor: vName },
          set: { Status_Open: nextStatus }
        })
      });
      refreshData();
    } catch (err) { alert("Gagal update status."); }
    setLoading(false);
  };

  const sendDiscordAnnouncement = async (type, vendorName) => {
    const isOpening = type === "OPEN";
    const barangVendor = allVendorData.filter(v => v.namaVendor === vendorName);
    const listBarangText = barangVendor.map(b => `▫️ **${b.namaBarang}** ($${b.hargaBarang})`).join("\n");
    const message = {
      content: `${isOpening ? "🟢" : "🔴"} **DCMC LOGISTICS | PO ${type}: ${vendorName}**`,
      embeds: [{
        title: `📢 PEMESANAN DI ${vendorName} ${isOpening ? "DIBUKA" : "DITUTUP"}!`,
        description: isOpening ? `🔗 ${WEBSITE_URL}` : "Sesi berakhir. Admin sedang memproses data.",
        color: isOpening ? 3066993 : 15158332,
        fields: isOpening ? [{ name: "📋 ITEM TERSEDIA:", value: listBarangText || "-" }] : [],
        timestamp: new Date()
      }]
    };
    await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
    alert(`Notifikasi ${type} untuk ${vendorName} terkirim!`);
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
    } catch (err) { alert("Gagal."); }
    setLoading(false);
  };

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
    } catch (err) { alert("Gagal."); }
  };

  const notifyArrival = async (order) => {
    const message = {
      content: `📦 **DCMC WAREHOUSE | ARRIVAL**`,
      embeds: [{
        title: `PESANAN TIBA!`,
        description: `Halo **${order.Nama_Pemesan}**, barang Anda sudah ada di gudang.`,
        color: 3447003,
        fields: [{ name: "Item", value: `${order.Nama_Barang} (x${order.Jumlah})` }],
        timestamp: new Date()
      }]
    };
    await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
    alert("Notif Arrival Terkirim!");
  };

  if (isChecking || !isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans text-[11px] uppercase tracking-tight">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-black text-red-600 italic tracking-tighter">DCMC LOGISTICS</h1>
          <button onClick={() => { const p = prompt("Pass:"); if(p === "ADMIN123") setIsAdmin(!isAdmin); }} className={`px-3 py-1 rounded text-[8px] font-bold ${isAdmin ? 'bg-red-600' : 'bg-slate-800 text-slate-500'}`}>
            {isAdmin ? "ADMIN MODE" : "MEMBER MODE"}
          </button>
        </header>

        {/* ADMIN VENDOR CONTROL & REKAP */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...new Set(allVendorData.map(v => v.namaVendor))].filter(n => n !== "").map((vName) => {
              const vInfo = allVendorData.find(v => v.namaVendor === vName);
              const isOpen = vInfo.statusOpen === "YES";
              const itemsRekap = getRekapPerVendor(vName);

              return (
                <div key={vName} className={`p-4 rounded-xl border flex flex-col gap-3 shadow-lg transition-all ${isOpen ? 'border-green-600/50 bg-green-600/5' : 'border-red-600/50 bg-red-600/5'}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[14px] font-black">{vName}</span>
                      <p className={`text-[8px] font-bold ${isOpen ? 'text-green-500' : 'text-red-500'}`}>{isOpen ? "STATUS: OPEN" : "STATUS: CLOSED"}</p>
                    </div>
                    <button onClick={() => toggleVendorStatus(vName, vInfo.statusOpen)} className="bg-white text-black px-2 py-1 rounded text-[8px] font-black">TOGGLE PO</button>
                  </div>

                  {/* MINI REKAP */}
                  <div className="bg-black/20 p-2 rounded text-[9px] min-h-[60px]">
                    <p className="text-slate-500 mb-1 border-b border-white/10 pb-1">CURRENT REKAP:</p>
                    {itemsRekap.map(([name, qty]) => (
                      <div key={name} className="flex justify-between font-bold">
                        <span>{name}</span> <span className="text-red-500">x{qty}</span>
                      </div>
                    ))}
                    {itemsRekap.length === 0 && <p className="italic text-slate-700">No orders yet.</p>}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => sendDiscordAnnouncement(isOpen ? "OPEN" : "CLOSED", vName)} className="flex-1 bg-indigo-600 py-1.5 rounded text-[8px] font-black italic">📢 ANNOUNCE</button>
                    <button onClick={() => copyRekapVendor(vName)} className="flex-1 bg-slate-700 py-1.5 rounded text-[8px] font-black">📋 COPY LIST</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FORM */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl h-fit">
            <h2 className="text-[10px] font-bold text-slate-400 mb-6 tracking-[0.2em]">NEW ORDER</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedVendor && selectedBarang) {
                setKeranjang([...keranjang, { idTemp: Date.now(), namaPemesan, namaVendor: selectedVendor, namaBarang: selectedBarang.namaBarang, subtotal: selectedBarang.hargaBarang * parseInt(jumlah), jumlah }]);
                setJumlah("");
              }
            }} className="space-y-4">
              <input type="text" required placeholder="NAMA PEMESAN" className="w-full p-3 rounded bg-slate-900 border border-slate-700 text-white outline-none" value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} />
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
              <button type="submit" className="w-full bg-red-700 hover:bg-red-600 p-3 rounded font-black italic tracking-widest transition-all">ADD TO CART</button>
            </form>
          </div>

          {/* CART */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl h-fit">
            <h2 className="text-[10px] font-bold text-red-500 mb-6 flex justify-between uppercase italic tracking-widest">CART <span>{keranjang.length}</span></h2>
            <div className="max-h-40 overflow-y-auto space-y-2 mb-6 text-[9px]">
              {keranjang.map((item) => (
                <div key={item.idTemp} className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center">
                  <p className="font-black italic">{item.namaBarang} <span className="text-red-500 text-[10px]">x{item.jumlah}</span></p>
                  <button onClick={() => setKeranjang(keranjang.filter(i => i.idTemp !== item.idTemp))} className="text-red-500 font-bold hover:text-white transition-colors">REMOVE</button>
                </div>
              ))}
            </div>
            <button disabled={keranjang.length === 0 || loading} onClick={handleCheckout} className="w-full bg-red-600 hover:bg-red-700 p-4 rounded font-black tracking-[0.2em] transition-all disabled:bg-slate-700 italic">
              {loading ? "PROCESSING..." : "CHECKOUT ORDER"}
            </button>
          </div>
        </div>

        {/* ORDER HISTORY */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
            <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Management Pesanan</h2>
            <button onClick={refreshData} className="text-[8px] bg-slate-700 px-2 py-1 rounded font-bold">REFRESH</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-500 text-[8px]">
                  <th className="p-4">TANGGAL</th>
                  <th className="p-4">PEMESAN / BARANG</th>
                  <th className="p-4 text-center">BAYAR</th>
                  <th className="p-4 text-center">STATUS</th>
                  <th className="p-4 text-center">NOTIF</th>
                  <th className="p-4 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 text-[9px]">
                {orderList.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 text-slate-500 text-[8px]">{order.Tanggal}</td>
                    <td className="p-4">
                      <div className="font-bold text-red-500">{order.Nama_Pemesan}</div>
                      <div className="text-slate-400 italic">{order.Nama_Barang} (x{order.Jumlah})</div>
                    </td>
                    <td className="p-4 text-center">
                      <button disabled={!isAdmin} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Bayar", order.Status_Bayar === "LUNAS" ? "BELUM" : "LUNAS")}
                        className={`px-2 py-1 rounded text-[8px] font-black ${order.Status_Bayar === "LUNAS" ? 'bg-green-600' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Bayar || "BELUM"}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button disabled={!isAdmin} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Pesanan", order.Status_Pesanan === "READY" ? "PROSES" : "READY")}
                        className={`px-2 py-1 rounded text-[8px] font-black ${order.Status_Pesanan === "READY" ? 'bg-yellow-600 text-black' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Pesanan || "PROSES"}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      {isAdmin ? (
                        <button onClick={() => notifyArrival(order)} className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[7px] font-black italic">📦 ARRIVED</button>
                      ) : (
                        <span className="text-slate-600 italic">WAITING</span>
                      )}
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