"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PreOrderPage() {
  const [vendorData, setVendorData] = useState([]);
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // --- PROTEKSI & FETCH DATA ---
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
      .then(data => { if (data && data.preOrder) setOrderList(data.preOrder.reverse()); });
  };

  useEffect(() => {
    if (selectedVendor) {
      setBarangTersedia(vendorData.filter(v => v.namaVendor === selectedVendor));
      setSelectedBarang(null); 
    }
  }, [selectedVendor, vendorData]);

  // --- UPDATE STATUS ADMIN ---
  const updateStatus = async (id, field, currentVal) => {
    if (!isAdmin) return;
    let nextVal = "";
    if (field === "statusBayar") nextVal = currentVal === "Lunas" ? "Belum" : "Lunas";
    if (field === "statusAmbil") nextVal = currentVal === "Diambil" ? "Belum" : "Diambil";
    if (field === "statusPesanan") nextVal = currentVal === "Ready" ? "Proses" : "Ready";

    const payload = { preorder: { [field]: nextVal } };
    const updatedList = orderList.map(order => order.id === id ? { ...order, [field]: nextVal } : order);
    setOrderList(updatedList);

    try {
      await fetch(`https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/preOrder/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) { 
      alert("Gagal update database.");
      refreshData(); 
    }
  };

  // --- CHECKOUT LOGIC (DENGAN DETAIL JUMLAH) ---
  const handleCheckout = async () => {
    if (!namaPemesan) return alert("Wajib isi NAMA PEMESAN!");
    if (keranjang.length === 0) return alert("Keranjang Kosong!");
    setLoading(true);

    try {
      const stringBarang = keranjang
        .map(item => `${item.namaBarang.toUpperCase()} x${item.jumlah}`)
        .join(", ");

      const totalHarga = keranjang.reduce((sum, item) => sum + item.subtotal, 0);
      const totalItemCount = keranjang.reduce((sum, item) => sum + parseInt(item.jumlah), 0);

      const dataBaru = {
        tanggal: new Date().toISOString().split('T')[0],
        pemesan: namaPemesan.toUpperCase(),
        namaVendor: keranjang[0].namaVendor,
        namaBarang: stringBarang,
        jumlah: totalItemCount, // Mengirim total seluruh kuantitas ke DB
        totalHarga: totalHarga.toString(),
        statusBayar: "Belum",
        statusAmbil: "Belum",
        statusPesanan: "Proses"
      };

      const res = await fetch("https://api.sheety.co/07ee5f85b2f38ab43582ae89f9342535/gudangDcmc/preOrder", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preorder: dataBaru })
      });

      if (res.ok) {
        alert("Checkout Berhasil!");
        setKeranjang([]);
        setNamaPemesan("");
        refreshData();
      }
    } catch (err) {
      alert("Checkout Gagal.");
    }
    setLoading(false);
  };

  const currentOrders = orderList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(orderList.length / itemsPerPage);

  const buatRingkasan = () => {
    const ringkasan = {};
    orderList.forEach(order => {
      if (order.statusAmbil !== "Diambil") {
        if (!ringkasan[order.namaVendor]) ringkasan[order.namaVendor] = {};
        const items = order.namaBarang.split(", ");
        items.forEach(i => {
          const parts = i.split(" x");
          const name = parts[0];
          const qty = parts[1] || 0;
          if (!ringkasan[order.namaVendor][name]) ringkasan[order.namaVendor][name] = 0;
          ringkasan[order.namaVendor][name] += parseInt(qty);
        });
      }
    });
    return ringkasan;
  };

  const dataRingkasan = buatRingkasan();

  if (isChecking || !isAuthorized) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 font-sans text-[11px]">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black text-red-600 italic tracking-tighter uppercase">DCMC Logistics</h1>
            <button onClick={() => {
              const p = prompt("Password Admin:");
              if(p === "ADMIN123") setIsAdmin(!isAdmin);
            }} className={`text-[8px] font-bold px-2 py-0.5 rounded mt-1 uppercase tracking-widest transition-all ${isAdmin ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
              {isAdmin ? "Admin Mode Active" : "Member Mode"}
            </button>
          </div>
          <button onClick={() => { sessionStorage.clear(); router.push("/"); }} className="text-xs font-bold text-slate-500 hover:text-white uppercase">Exit Portal</button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* FORM INPUT */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
            <h2 className="text-[10px] font-bold text-slate-400 mb-6 uppercase tracking-[0.2em]">New Order</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (selectedVendor && selectedBarang) {
                setKeranjang([...keranjang, { idTemp: Date.now(), namaPemesan: namaPemesan.toUpperCase(), namaVendor: selectedVendor, namaBarang: selectedBarang.namaBarang, subtotal: (selectedBarang.hargaBarang || 0) * parseInt(jumlah), jumlah }]);
                setJumlah("");
              }
            }} className="space-y-4">
              <input type="text" required placeholder="NAMA PEMESAN" className="w-full p-3 rounded bg-slate-900 border border-slate-700 uppercase outline-none focus:border-red-600" value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} />
              <select required className="w-full p-3 rounded bg-slate-900 border border-slate-700" onChange={(e) => setSelectedVendor(e.target.value)}>
                <option value="">-- PILIH VENDOR --</option>
                {daftarVendorUnik.map((v, i) => <option key={i} value={v}>{v.toUpperCase()}</option>)}
              </select>
              <select required value={selectedBarang ? selectedBarang.namaBarang : ""} disabled={!selectedVendor} className="w-full p-3 rounded bg-slate-900 border border-slate-700" 
                onChange={(e) => setSelectedBarang(barangTersedia.find(b => b.namaBarang === e.target.value))}>
                <option value="">-- PILIH BARANG --</option>
                {barangTersedia.map((b, i) => <option key={i} value={b.namaBarang}>{b.namaBarang.toUpperCase()} - ${b.hargaBarang}</option>)}
              </select>
              <input type="number" required placeholder="Quantity" value={jumlah} className="w-full p-3 rounded bg-slate-900 border border-slate-700" onChange={(e) => setJumlah(e.target.value)} />
              <button type="submit" className="w-full bg-slate-700 hover:bg-slate-600 p-3 rounded font-black uppercase text-[10px] tracking-widest">Add to Cart</button>
            </form>
          </div>

          {/* KERANJANG */}
          <div className="bg-slate-800 p-6 rounded-xl border border-red-900/20 flex flex-col h-fit shadow-xl">
            <h2 className="text-[10px] font-bold text-red-500 mb-6 uppercase flex justify-between">Cart <span>{keranjang.length}</span></h2>
            <div className="max-h-60 overflow-y-auto space-y-3 mb-6 pr-1">
              {keranjang.map((item) => (
                <div key={item.idTemp} className="bg-slate-900 p-3 rounded border border-slate-700 flex justify-between items-center text-[10px]">
                  <div><p className="font-black uppercase italic">{item.namaBarang} <span className="text-red-500 font-black">x{item.jumlah}</span></p></div>
                  <button onClick={() => setKeranjang(keranjang.filter(i => i.idTemp !== item.idTemp))} className="text-red-500 font-black hover:text-white">REMOVE</button>
                </div>
              ))}
              {keranjang.length === 0 && <p className="text-center text-slate-600 italic py-10 uppercase tracking-widest text-[9px]">Keranjang Kosong</p>}
            </div>
            <button onClick={handleCheckout} disabled={loading || keranjang.length === 0} className="w-full bg-red-600 hover:bg-red-700 p-4 rounded font-black uppercase text-[12px] tracking-[0.2em] transition-all disabled:bg-slate-700">
              {loading ? "PROCESSING..." : "CHECKOUT"}
            </button>
          </div>
        </div>

        {/* LOG TRANSAKSI */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-12 shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left uppercase text-[9px] tracking-tighter">
              <thead>
                <tr className="bg-slate-900 text-slate-500 border-b border-slate-700 font-bold">
                  <th className="p-4">Info Pesanan (Item & Qty)</th>
                  <th className="p-4 text-center">Status Bayar</th>
                  <th className="p-4 text-center">Status Ambil</th>
                  <th className="p-4 text-right">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {currentOrders.map((order, i) => (
                  <tr key={order.id || i} className="hover:bg-slate-700/20 transition-colors">
                    <td className="p-4">
                      <p className="text-slate-500 mb-1">{order.tanggal} | {order.pemesan}</p>
                      <div className="space-y-0.5">
                        {order.namaBarang.split(", ").map((itemStr, idx) => {
                          const parts = itemStr.split(" x");
                          const name = parts[0];
                          const qty = parts[1] || "0";
                          return (
                            <p key={idx} className="font-black text-white italic">
                              {name} <span className="text-red-500 font-black text-[10px]">x{qty}</span>
                            </p>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button disabled={!isAdmin} onClick={() => updateStatus(order.id, "statusBayar", order.statusBayar)}
                        className={`px-2 py-1 rounded-[3px] font-black border ${order.statusBayar === 'Lunas' ? 'bg-green-500 text-black border-green-400' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'} ${isAdmin ? 'cursor-pointer hover:scale-105' : ''}`}>
                        {(order.statusBayar || 'Belum').toUpperCase()}
                      </button>
                    </td>
                    <td className="p-4 text-center">
                      <button disabled={!isAdmin} onClick={() => updateStatus(order.id, "statusAmbil", order.statusAmbil)}
                        className={`px-2 py-1 rounded-[3px] font-black border ${order.statusAmbil === 'Diambil' ? 'bg-green-500 text-black border-green-400' : 'bg-slate-700 text-slate-400 border-slate-600'} ${isAdmin ? 'cursor-pointer hover:scale-105' : ''}`}>
                        {(order.statusAmbil || 'Belum').toUpperCase()}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button disabled={!isAdmin} onClick={() => updateStatus(order.id, "statusPesanan", order.statusPesanan)}
                        className={`px-2 py-1 rounded-[3px] font-black border ${order.statusPesanan === 'Ready' ? 'bg-green-900 text-green-300 border-green-700' : 'bg-slate-900 text-slate-500 border-slate-800'} ${isAdmin ? 'cursor-pointer hover:scale-105' : ''}`}>
                        {(order.statusPesanan || 'Proses').toUpperCase()}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* REKAP PROCUREMENT */}
        <div className="mb-10">
          <h2 className="text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Procurement Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[10px]">
            {Object.keys(dataRingkasan).map((vendorName) => (
              <div key={vendorName} className="bg-slate-800 p-4 rounded-lg border border-slate-700 border-t-4 border-t-red-600 shadow-xl">
                <h3 className="text-red-500 font-black mb-3 uppercase italic tracking-widest">{vendorName}</h3>
                <ul className="space-y-2">
                  {Object.keys(dataRingkasan[vendorName]).map((itemName) => (
                    <li key={itemName} className="flex justify-between border-b border-slate-700/50 pb-1 text-slate-400 uppercase">
                      <span>{itemName}</span>
                      <span className="font-bold text-white">x{dataRingkasan[vendorName][itemName]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}