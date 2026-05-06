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

  const getRekapVendor = (vName) => {
    const summary = {};
    orderList.filter(o => o.Nama_Vendor === vName).forEach(order => {
      const items = order.Nama_Barang.split(", ");
      items.forEach(itemStr => {
        const match = itemStr.match(/(.+) \((\d+)\)/);
        if (match) summary[match[1]] = (summary[match[1]] || 0) + parseInt(match[2]);
      });
    });
    return Object.entries(summary);
  };

  const toggleVendorStatus = async (vName, currentStatus) => {
    setLoading(true);
    const nextStatus = currentStatus === "YES" ? "NO" : "YES";
    try {
      await fetch(`${STEIN_URL}/vendor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: { Nama_Vendor: vName }, set: { Status_Open: nextStatus } })
      });
      refreshData();
    } catch (err) { alert("Gagal."); }
    setLoading(false);
  };

  const markAllArrived = async (vName) => {
    if (!confirm(`Tandai semua READY untuk ${vName}?`)) return;
    setLoading(true);
    try {
      await fetch(`${STEIN_URL}/preOrder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: { Nama_Vendor: vName, Status_Pesanan: "PROSES" }, set: { Status_Pesanan: "READY" } })
      });
      refreshData();
      alert("Semua barang vendor telah tiba!");
    } catch (err) { alert("Gagal."); }
    setLoading(false);
  };

  const archiveVendorOrders = async (vName) => {
    if (!confirm(`ARCHIVE SEMUA PESANAN ${vName}?`)) return;
    setLoading(true);
    try {
      await fetch(`${STEIN_URL}/preOrder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: { Nama_Vendor: vName }, set: { Archived: "YES" } })
      });
      refreshData();
      alert("PO Berhasil diarsipkan.");
    } catch (err) { alert("Gagal."); }
    setLoading(false);
  };

  const sendDiscordAnnouncement = async (type, vendorName) => {
    const isOpening = type === "OPEN";
    const vendorItems = allVendorData.filter(v => v.namaVendor === vendorName);
    const itemRows = vendorItems.map(item => `🔹 **${item.namaBarang}** — \`$${parseInt(item.hargaBarang).toLocaleString()}\``).join("\n");
    const message = {
      content: isOpening ? ` @everyone 📢 **PRE-ORDER ALERT!**` : `📢 **PO CLOSED**`,
      embeds: [{
        title: isOpening ? `✅ PEMESANAN ${vendorName} DIBUKA!` : `❌ PO ${vendorName} TELAH DITUTUP`,
        description: isOpening 
          ? `Halo team! Pre-order untuk vendor **${vendorName}** kini telah dibuka.\n\n🛒 **PESAN DI SINI:**\n${WEBSITE_URL}`
          : `Sesi pemesanan untuk **${vendorName}** sudah berakhir.`,
        color: isOpening ? 3066993 : 15158332,
        fields: isOpening ? [{ name: "📋 DAFTAR HARGA ITEM:", value: itemRows || "Cek di website" }] : [],
        timestamp: new Date()
      }]
    };
    await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
    alert("Notif Terkirim!");
  };

  const handleCheckout = async () => {
    if (keranjang.length === 0) return;
    setLoading(true);
    try {
      const listBarangString = keranjang.map(i => `${i.namaBarang} (${i.jumlah})`).join(", ");
      await fetch(`${STEIN_URL}/preOrder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          Nama_Pemesan: namaPemesan,
          Nama_Vendor: keranjang[0].namaVendor,
          Nama_Barang: listBarangString,
          Jumlah: keranjang.reduce((acc, curr) => acc + parseInt(curr.jumlah), 0),
          Subtotal: keranjang.reduce((acc, curr) => acc + curr.subtotal, 0),
          Tanggal: new Date().toLocaleString("id-ID"),
          Status_Bayar: "BELUM",
          Status_Pesanan: "PROSES",
          Status_Ambil: "BELUM",
          Archived: "NO"
        }])
      });
      setKeranjang([]);
      refreshData();
      alert("CHECKOUT BERHASIL!");
    } catch (err) { alert("Gagal."); }
    setLoading(false);
  };

  // PERBAIKAN: REAL-TIME OPTIMISTIC UPDATE
  const updateOrderStatus = async (tanggal, pemesan, field, value) => {
    // 1. Langsung ubah state lokal agar UI berubah seketika tanpa delay
    setOrderList(prevList => 
      prevList.map(order => 
        (order.Tanggal === tanggal && order.Nama_Pemesan === pemesan) 
          ? { ...order, [field]: value } 
          : order
      )
    );

    // 2. Eksekusi API di latar belakang
    try {
      await fetch(`${STEIN_URL}/preOrder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: { Tanggal: tanggal, Nama_Pemesan: pemesan }, set: { [field]: value } })
      });
      // Menghapus refreshData() di sini agar tidak menyebabkan re-render yang mengakibatkan jeda/flicker
    } catch (err) { 
      // Jika gagal kirim ke database, kembalikan data dengan merefresh
      console.error(err);
      alert("Koneksi gagal, menyinkronkan ulang data...");
      refreshData(); 
    }
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

        {/* ADMIN CONTROL */}
        {isAdmin && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...new Set(allVendorData.map(v => v.namaVendor))].filter(n => n !== "").map((vName) => {
              const vInfo = allVendorData.find(v => v.namaVendor === vName);
              const isOpen = vInfo?.statusOpen === "YES";
              const itemsRekap = getRekapVendor(vName);
              return (
                <div key={vName} className={`p-4 rounded-xl border flex flex-col gap-3 ${isOpen ? 'border-green-600/50 bg-green-600/5' : 'border-red-600/50 bg-red-600/5'}`}>
                  <div className="flex justify-between items-start border-b border-white/10 pb-2">
                    <div>
                      <span className="text-[14px] font-black">{vName}</span>
                      <p className={`text-[8px] font-bold ${isOpen ? 'text-green-500' : 'text-red-500'}`}>{isOpen ? "PO OPEN" : "PO CLOSED"}</p>
                    </div>
                    <button onClick={() => toggleVendorStatus(vName, vInfo.statusOpen)} className="bg-white text-black px-2 py-0.5 rounded text-[8px] font-black">TOGGLE</button>
                  </div>
                  <div className="space-y-1 min-h-[50px]">
                    {itemsRekap.map(([name, qty]) => (
                      <div key={name} className="flex justify-between font-bold border-b border-white/5">
                        <span>{name}</span> <span className="text-red-500">x{qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <button onClick={() => sendDiscordAnnouncement(isOpen ? "OPEN" : "CLOSED", vName)} className="bg-indigo-600 py-1.5 rounded text-[7px] font-black italic hover:bg-indigo-500">📢 ANNOUNCE</button>
                    <button onClick={() => markAllArrived(vName)} className="bg-blue-600 py-1.5 rounded text-[7px] font-black italic hover:bg-blue-500">📦 ARRIVED ALL</button>
                    <button onClick={() => {
                        const text = itemsRekap.map(([n, q]) => `• ${n} (x${q})`).join("\n");
                        navigator.clipboard.writeText(`REKAP ${vName}:\n${text}`);
                        alert("Disalin!");
                    }} className="bg-slate-700 py-1.5 rounded text-[7px] font-black">📋 COPY LIST</button>
                    <button onClick={() => archiveVendorOrders(vName)} className="bg-red-900 py-1.5 rounded text-[7px] font-black">🗄️ ARCHIVE PO</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FORM */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl h-fit">
            <h2 className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-widest">New Order</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedVendor && selectedBarang) {
                setKeranjang([...keranjang, { idTemp: Date.now(), namaPemesan, namaVendor: selectedVendor, namaBarang: selectedBarang.namaBarang, subtotal: selectedBarang.hargaBarang * parseInt(jumlah), jumlah }]);
                setJumlah("");
              }
            }} className="space-y-4">
              <input type="text" required placeholder="NAMA PEMESAN" className="w-full p-3 rounded bg-slate-900 border border-slate-700 outline-none" value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} />
              <select required className="w-full p-3 rounded bg-slate-900 border border-slate-700 font-black" value={selectedVendor} onChange={(e) => { setSelectedVendor(e.target.value); setBarangTersedia(allVendorData.filter(v => v.namaVendor === e.target.value)); }}>
                <option value="">-- VENDOR --</option>
                {daftarVendorUnik.map((v, i) => <option key={i} value={v}>{v}</option>)}
              </select>
              <select required className="w-full p-3 rounded bg-slate-900 border border-slate-700 font-bold" onChange={(e) => setSelectedBarang(barangTersedia.find(b => b.namaBarang === e.target.value))}>
                <option value="">-- ITEM --</option>
                {barangTersedia.map((b, i) => <option key={i} value={b.namaBarang}>{b.namaBarang}</option>)}
              </select>
              <input type="number" required placeholder="QTY" value={jumlah} className="w-full p-3 rounded bg-slate-900 border border-slate-700 outline-none" onChange={(e) => setJumlah(e.target.value)} />
              <button type="submit" className="w-full bg-red-700 p-3 rounded font-black italic hover:bg-red-600 transition-all">ADD TO CART</button>
            </form>
          </div>

          {/* CART */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl flex flex-col justify-between">
            <h2 className="text-[10px] font-bold text-red-500 mb-6 italic tracking-widest uppercase text-center">Your Cart ({keranjang.length})</h2>
            <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
              {keranjang.map((item) => (
                <div key={item.idTemp} className="bg-slate-900 p-2 rounded border border-slate-700 flex justify-between items-center text-[10px]">
                  <span className="font-bold italic">{item.namaBarang} x{item.jumlah}</span>
                  <button onClick={() => setKeranjang(keranjang.filter(i => i.idTemp !== item.idTemp))} className="text-red-500 font-bold">REMOVE</button>
                </div>
              ))}
            </div>
            {keranjang.length > 0 && (
              <div className="border-t border-red-600/30 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 font-bold text-[9px]">TOTAL ESTIMASI:</span>
                  <span className="text-xl font-black text-green-500">${keranjang.reduce((acc, curr) => acc + curr.subtotal, 0).toLocaleString()}</span>
                </div>
                <button onClick={handleCheckout} className="w-full bg-red-600 p-4 rounded font-black tracking-widest italic hover:bg-red-700">CHECKOUT NOW</button>
              </div>
            )}
          </div>
        </div>

        {/* MANAGEMENT PESANAN DENGAN STATUS AMBIL */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse text-[9px]">
            <thead>
              <tr className="bg-slate-900 text-slate-500 text-[8px]">
                <th className="p-4 uppercase">Tanggal</th>
                <th className="p-4 uppercase">Pemesan / Items</th>
                <th className="p-4 text-center uppercase">Bayar</th>
                <th className="p-4 text-center uppercase">Status</th>
                <th className="p-4 text-center uppercase text-indigo-400">Ambil</th>
                <th className="p-4 text-right uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {orderList.map((order, idx) => (
                <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 text-slate-500">{order.Tanggal}</td>
                  <td className="p-4"><span className="font-bold text-red-500">{order.Nama_Pemesan}</span><br/><span className="text-slate-400 italic">{order.Nama_Barang}</span></td>
                  <td className="p-4 text-center">
                    <button disabled={!isAdmin} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Bayar", order.Status_Bayar === "LUNAS" ? "BELUM" : "LUNAS")}
                      className={`px-2 py-0.5 rounded text-[7px] font-black transition-colors ${order.Status_Bayar === "LUNAS" ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      {order.Status_Bayar || "BELUM"}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button disabled={!isAdmin} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Pesanan", order.Status_Pesanan === "READY" ? "PROSES" : "READY")}
                      className={`px-2 py-0.5 rounded text-[7px] font-black transition-colors ${order.Status_Pesanan === "READY" ? 'bg-yellow-600 text-black' : 'bg-slate-700 text-slate-400'}`}>
                      {order.Status_Pesanan || "PROSES"}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <button disabled={!isAdmin} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, "Status_Ambil", order.Status_Ambil === "SUDAH" ? "BELUM" : "SUDAH")}
                      className={`px-2 py-0.5 rounded text-[7px] font-black transition-colors ${order.Status_Ambil === "SUDAH" ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                      {order.Status_Ambil || "BELUM"}
                    </button>
                  </td>
                  <td className="p-4 text-right font-black text-green-500">${parseInt(order.Subtotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}