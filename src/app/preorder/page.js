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
  
  const [filterBelumAmbil, setFilterBelumAmbil] = useState(false);
  // FITUR BARU: State untuk menyimpan filter vendor di Management Pesanan
  const [filterVendor, setFilterVendor] = useState("");

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
          hargaBarang: Number(item.Harga_Barang) || 0,
          statusOpen: (String(item.Status_Open || "")).toUpperCase(),
          kuota: Number(item.Kuota) || 0 
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

  const getSisaKuota = (vName, bName) => {
    const itemAwal = allVendorData.find(v => v.namaVendor === vName && v.namaBarang === bName);
    const kuotaMaksimal = itemAwal ? itemAwal.kuota : 0;

    let totalDipesanDatabase = 0;
    orderList.filter(o => o.Nama_Vendor === vName).forEach(order => {
      if (!order.Nama_Barang) return;
      const items = order.Nama_Barang.split(", ");
      items.forEach(itemStr => {
        const match = itemStr.match(/(.+) \((\d+)\)/);
        if (match && match[1] === bName) {
          totalDipesanDatabase += parseInt(match[2]);
        }
      });
    });

    const totalDiKeranjang = keranjang
      .filter(k => k.namaVendor === vName && k.namaBarang === bName)
      .reduce((acc, curr) => acc + parseInt(curr.jumlah), 0);

    return kuotaMaksimal - totalDipesanDatabase - totalDiKeranjang;
  };

  const getRekapVendor = (vName) => {
    const summary = {};
    orderList.filter(o => o.Nama_Vendor === vName).forEach(order => {
      if (!order.Nama_Barang) return;
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
    const itemRows = vendorItems.map(item => `🔹 **${item.namaBarang}** — \`$${Number(item.hargaBarang).toLocaleString()}\` *(Sisa: ${getSisaKuota(vendorName, item.namaBarang)})*`).join("\n");
    const message = {
      content: isOpening ? ` @everyone 📢 **PRE-ORDER ALERT!**` : `📢 **PO CLOSED**`,
      embeds: [{
        title: isOpening ? `✅ PEMESANAN ${vendorName} DIBUKA!` : `❌ PO ${vendorName} TELAH DITUTUP`,
        description: isOpening 
          ? `Halo team! Pre-order untuk vendor **${vendorName}** kini telah dibuka.\n\n🛒 **PESAN DI SINI:**\n${WEBSITE_URL}`
          : `Sesi pemesanan untuk **${vendorName}** sudah berakhir.`,
        color: isOpening ? 3066993 : 15158332,
        fields: isOpening ? [{ name: "📋 DAFTAR HARGA & KUOTA:", value: itemRows || "Cek di website" }] : [],
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
      const groupedCart = keranjang.reduce((acc, item) => {
        if (!acc[item.namaVendor]) acc[item.namaVendor] = [];
        acc[item.namaVendor].push(item);
        return acc;
      }, {});

      const dataToPost = Object.keys(groupedCart).map(vendor => {
        const items = groupedCart[vendor];
        const listBarangString = items.map(i => `${i.namaBarang} (${i.jumlah})`).join(", ");
        const totalBayar = items.reduce((acc, curr) => acc + curr.subtotal, 0);
        const totalQty = items.reduce((acc, curr) => acc + parseInt(curr.jumlah), 0);
        
        return {
          Nama_Pemesan: namaPemesan,
          Nama_Vendor: vendor,
          Nama_Barang: listBarangString,
          Jumlah: totalQty,
          Subtotal: totalBayar,
          Tanggal: new Date().toLocaleString("id-ID"),
          Status_Bayar: "BELUM",
          Status_Pesanan: "PROSES",
          Status_Ambil: "BELUM",
          Archived: "NO"
        };
      });

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

  const updateOrderStatus = async (tanggal, pemesan, vendor, field, value) => {
    setOrderList(prevList => 
      prevList.map(order => 
        (order.Tanggal === tanggal && order.Nama_Pemesan === pemesan && order.Nama_Vendor === vendor) 
          ? { ...order, [field]: value } 
          : order
      )
    );
    try {
      await fetch(`${STEIN_URL}/preOrder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: { Tanggal: tanggal, Nama_Pemesan: pemesan, Nama_Vendor: vendor }, set: { [field]: value } })
      });
    } catch (err) { 
      console.error(err);
      alert("Koneksi gagal, menyinkronkan ulang data...");
      refreshData(); 
    }
  };

  const cancelOrder = async (tanggal, pemesan, vendor) => {
    if (!confirm(`Yakin membatalkan pesanan ini untuk ${pemesan}? Data akan dihapus secara permanen dan kuota akan kembali.`)) return;
    setOrderList(prevList => prevList.filter(o => !(o.Tanggal === tanggal && o.Nama_Pemesan === pemesan && o.Nama_Vendor === vendor)));
    try {
      await fetch(`${STEIN_URL}/preOrder`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: { Tanggal: tanggal, Nama_Pemesan: pemesan, Nama_Vendor: vendor } })
      });
    } catch (err) {
      alert("Gagal menghapus pesanan.");
      refreshData();
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedVendor || !selectedBarang || !jumlah) return;

    const qtyNumber = parseInt(jumlah);
    if (qtyNumber <= 0) return;

    const sisaKuota = getSisaKuota(selectedVendor, selectedBarang.namaBarang);
    if (qtyNumber > sisaKuota) {
      alert(`Gagal! Sisa kuota untuk ${selectedBarang.namaBarang} hanya tersisa ${sisaKuota}.`);
      return;
    }

    const existingItemIdx = keranjang.findIndex(
      (item) => item.namaVendor === selectedVendor && item.namaBarang === selectedBarang.namaBarang
    );

    if (existingItemIdx > -1) {
      const updatedKeranjang = [...keranjang];
      const currentQty = parseInt(updatedKeranjang[existingItemIdx].jumlah);
      const newQty = currentQty + qtyNumber;
      
      updatedKeranjang[existingItemIdx].jumlah = newQty.toString();
      updatedKeranjang[existingItemIdx].subtotal = selectedBarang.hargaBarang * newQty;
      setKeranjang(updatedKeranjang);
    } else {
      setKeranjang([
        ...keranjang,
        {
          idTemp: Date.now(),
          namaPemesan,
          namaVendor: selectedVendor,
          namaBarang: selectedBarang.namaBarang,
          subtotal: selectedBarang.hargaBarang * qtyNumber,
          jumlah: jumlah
        }
      ]);
    }
    setJumlah("");
  };

  // FITUR BARU: Logika filter diperbarui untuk mendukung filter per-vendor
  const displayedOrders = orderList.filter(o => {
    const isBelumAmbil = filterBelumAmbil ? o.Status_Ambil !== "SUDAH" : true;
    const isVendorMatch = filterVendor ? o.Nama_Vendor === filterVendor : true;
    return isBelumAmbil && isVendorMatch;
  });

  const sisaKuotaTerpilih = selectedBarang ? getSisaKuota(selectedVendor, selectedBarang.namaBarang) : 0;

  if (isChecking || !isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans text-[11px] uppercase tracking-tight">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h1 className="text-3xl font-black text-red-600 italic tracking-tighter">DCMC LOGISTICS</h1>
          <button 
            disabled={loading}
            onClick={() => { const p = prompt("Pass:"); if(p === "ADMIN123") setIsAdmin(!isAdmin); }} 
            className={`px-3 py-1 rounded text-[8px] font-bold ${isAdmin ? 'bg-red-600' : 'bg-slate-800 text-slate-500'}`}
          >
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
                    <button disabled={loading} onClick={() => toggleVendorStatus(vName, vInfo.statusOpen)} className="bg-white text-black px-2 py-0.5 rounded text-[8px] font-black disabled:opacity-50">TOGGLE</button>
                  </div>
                  <div className="space-y-1 min-h-[50px]">
                    {allVendorData.filter(v => v.namaVendor === vName).map(item => {
                       const sisa = getSisaKuota(vName, item.namaBarang);
                       const dipesan = itemsRekap.find(r => r[0] === item.namaBarang)?.[1] || 0;
                       return (
                        <div key={item.namaBarang} className="flex justify-between font-bold border-b border-white/5 pb-1">
                          <span>{item.namaBarang}</span> 
                          <div>
                            <span className="text-red-500 mr-2">PO: x{dipesan}</span>
                            <span className="text-slate-400 font-normal">SISA: {sisa}</span>
                          </div>
                        </div>
                       )
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <button disabled={loading} onClick={() => sendDiscordAnnouncement(isOpen ? "OPEN" : "CLOSED", vName)} className="bg-indigo-600 py-1.5 rounded text-[7px] font-black italic hover:bg-indigo-500 disabled:opacity-50">📢 ANNOUNCE</button>
                    <button disabled={loading} onClick={() => markAllArrived(vName)} className="bg-blue-600 py-1.5 rounded text-[7px] font-black italic hover:bg-blue-500 disabled:opacity-50">📦 ARRIVED ALL</button>
                    <button onClick={() => {
                        const text = itemsRekap.map(([n, q]) => `• ${n} (x${q})`).join("\n");
                        navigator.clipboard.writeText(`REKAP ${vName}:\n${text}`);
                        alert("Disalin!");
                    }} className="bg-slate-700 py-1.5 rounded text-[7px] font-black">📋 COPY LIST</button>
                    <button disabled={loading} onClick={() => archiveVendorOrders(vName)} className="bg-red-900 py-1.5 rounded text-[7px] font-black disabled:opacity-50">🗄️ ARCHIVE PO</button>
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
            <form onSubmit={handleAddToCart} className="space-y-4">
              <input type="text" required placeholder="NAMA PEMESAN" className="w-full p-3 rounded bg-slate-900 border border-slate-700 outline-none" value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} />
              
              <select required className="w-full p-3 rounded bg-slate-900 border border-slate-700 font-black" value={selectedVendor} 
                onChange={(e) => { 
                  setSelectedVendor(e.target.value); 
                  setBarangTersedia(allVendorData.filter(v => v.namaVendor === e.target.value));
                  setSelectedBarang(null); 
                }}
              >
                <option value="">-- VENDOR --</option>
                {daftarVendorUnik.map((v, i) => <option key={i} value={v}>{v}</option>)}
              </select>

              <select required className="w-full p-3 rounded bg-slate-900 border border-slate-700 font-bold" value={selectedBarang?.namaBarang || ""} 
                onChange={(e) => setSelectedBarang(barangTersedia.find(b => b.namaBarang === e.target.value))}>
                <option value="">-- ITEM --</option>
                {barangTersedia.map((b, i) => {
                  const sisa = getSisaKuota(selectedVendor, b.namaBarang);
                  const isHabis = sisa <= 0;
                  return (
                    <option key={i} value={b.namaBarang} disabled={isHabis}>
                      {b.namaBarang} {isHabis ? "❌ HABIS" : `✅ (Sisa Kuota: ${sisa})`}
                    </option>
                  )
                })}
              </select>

              <input 
                type="number" 
                required 
                placeholder="QTY" 
                value={jumlah} 
                max={sisaKuotaTerpilih > 0 ? sisaKuotaTerpilih : 1} 
                className="w-full p-3 rounded bg-slate-900 border border-slate-700 outline-none disabled:opacity-50" 
                onChange={(e) => setJumlah(e.target.value)} 
                disabled={!selectedBarang || sisaKuotaTerpilih <= 0}
              />

              <button disabled={!selectedBarang || sisaKuotaTerpilih <= 0} type="submit" className="w-full bg-red-700 p-3 rounded font-black italic hover:bg-red-600 transition-all disabled:opacity-50 disabled:bg-slate-700">
                {sisaKuotaTerpilih <= 0 && selectedBarang ? "OUT OF STOCK" : "ADD TO CART"}
              </button>
            </form>
          </div>

          {/* CART */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl flex flex-col justify-between">
            <h2 className="text-[10px] font-bold text-red-500 mb-6 italic tracking-widest uppercase text-center">Your Cart ({keranjang.length})</h2>
            <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
              {keranjang.map((item) => (
                <div key={item.idTemp} className="bg-slate-900 p-2 rounded border border-slate-700 flex justify-between items-center text-[10px]">
                  <span className="font-bold italic">[{item.namaVendor}] {item.namaBarang} x{item.jumlah}</span>
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
                <button disabled={loading} onClick={handleCheckout} className="w-full bg-red-600 p-4 rounded font-black tracking-widest italic hover:bg-red-700 disabled:opacity-50">
                  {loading ? "PROCESSING..." : "CHECKOUT NOW"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MANAGEMENT PESANAN */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center">
            <h2 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase italic">Management Pesanan</h2>
            <div className="flex gap-2 items-center">
              
              {/* FITUR BARU: Dropdown Filter Vendor */}
              <select 
                className="bg-slate-700 text-[8px] text-slate-300 px-2 py-1 rounded font-bold outline-none border border-slate-600 focus:border-indigo-500 cursor-pointer"
                value={filterVendor}
                onChange={(e) => setFilterVendor(e.target.value)}
              >
                <option value="">SEMUA VENDOR</option>
                {[...new Set(orderList.map(o => o.Nama_Vendor))].filter(v => v).map((v, i) => (
                  <option key={i} value={v}>{v}</option>
                ))}
              </select>

              <button onClick={() => setFilterBelumAmbil(!filterBelumAmbil)} className={`px-2 py-1 rounded text-[8px] font-bold transition-colors ${filterBelumAmbil ? 'bg-[#0a95f6] text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                {filterBelumAmbil ? "TAMPILKAN SEMUA" : "BELUM DIAMBIL"}
              </button>
              <button onClick={refreshData} className="text-[8px] bg-slate-700 px-2 py-1 rounded font-bold hover:bg-slate-600 text-slate-300">REFRESH</button>
            </div>
          </div>
          <div className="overflow-x-auto">
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
                {displayedOrders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="p-4 text-slate-500">{order.Tanggal}</td>
                    <td className="p-4">
                      <span className="font-bold text-red-500">{order.Nama_Pemesan}</span>
                      <span className="text-[8px] bg-slate-900 text-slate-400 px-1 py-0.5 rounded ml-2 font-normal border border-slate-700">{order.Nama_Vendor}</span>
                      <br/>
                      <span className="text-slate-400 italic">{order.Nama_Barang}</span>
                    </td>
                    <td className="p-4 text-center">
                      <button disabled={!isAdmin || loading} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor, "Status_Bayar", order.Status_Bayar === "LUNAS" ? "BELUM" : "LUNAS")}
                        className={`px-2 py-0.5 rounded text-[7px] font-black transition-colors ${order.Status_Bayar === "LUNAS" ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Bayar || "BELUM"}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button disabled={!isAdmin || loading} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor, "Status_Pesanan", order.Status_Pesanan === "READY" ? "PROSES" : "READY")}
                        className={`px-2 py-0.5 rounded text-[7px] font-black transition-colors ${order.Status_Pesanan === "READY" ? 'bg-yellow-600 text-black' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Pesanan || "PROSES"}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button disabled={!isAdmin || loading} onClick={() => updateOrderStatus(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor, "Status_Ambil", order.Status_Ambil === "SUDAH" ? "BELUM" : "SUDAH")}
                        className={`px-2 py-0.5 rounded text-[7px] font-black transition-colors ${order.Status_Ambil === "SUDAH" ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                        {order.Status_Ambil || "BELUM"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-black text-green-500">${Number(order.Subtotal || 0).toLocaleString()}</div>
                      {isAdmin && (
                        <button disabled={loading} onClick={() => cancelOrder(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor)} className="mt-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white px-2 py-1 rounded text-[7px] font-black transition-colors block w-full text-center disabled:opacity-50">CANCEL</button>
                      )}
                    </td>
                  </tr>
                ))}
                {displayedOrders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-500 italic">Tidak ada pesanan untuk ditampilkan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}