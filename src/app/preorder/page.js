"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Package, ClipboardList, Shield, Calculator, User, AlertCircle, RefreshCcw } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabase"; 

import TabKalkulator from "@/components/TabKalkulator";
import TabPesan from "@/components/TabPesan";
import TabRiwayat from "@/components/TabRiwayat";
import TabAdmin from "@/components/TabAdmin";
import TabLaundry from "@/components/TabLaundry";

export default function PreOrderPage() {
  const [allVendorData, setAllVendorData] = useState([]);
  const [daftarVendorUnik, setDaftarVendorUnik] = useState([]);
  const [barangTersedia, setBarangTersedia] = useState([]);
  const [orderList, setOrderList] = useState([]);
  const [keranjang, setKeranjang] = useState([]);

  const [namaPemesan, setNamaPemesan] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [jumlah, setJumlah] = useState("");

  const [filterBelumAmbil, setFilterBelumAmbil] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [filterVendor, setFilterVendor] = useState("");
  const [searchNama, setSearchNama] = useState("");
  const [activeTab, setActiveTab] = useState("order");

  const [inputUmer, setInputUmer] = useState("");
  const [inputBibit, setInputBibit] = useState("");

  const [financeVendor, setFinanceVendor] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: null, isDanger: false });
  const router = useRouter();

  // === WEBHOOK YANG SUDAH DIPISAH ===
  const WEBHOOK_PEMESANAN = "https://discord.com/api/webhooks/1522683134620205160/lxJSiUlPFQ_9J24uZ6BwrrBJN4Ht3Y3H97ZXYAkWHJZVSF0TfjM6XzOhoWhS5WOa_8Ak";
  const WEBHOOK_UMER = "https://discord.com/api/webhooks/1544161220154630285/fWZm8_B2ffynFIlnGWjGgidQp4XV0W2qATjgQSQEN_wEBZcyZqb5GavobPp3_0PvC5l0";
  const WEBSITE_URL = "https://dcmc-sable.vercel.app/";

  const refreshData = async (isSilent = false) => {
    try {
      const { data: rawV, error: errV } = await supabase.from('vendors').select('*');
      if (errV) throw errV;
      if (rawV) {
        const normalized = rawV.map(item => ({
          id: item.id, namaVendor: item.nama_vendor || "", namaBarang: item.nama_barang || "",
          hargaBarang: Number(item.harga_barang) || 0, hargaModal: Number(item.harga_modal) || 0,
          statusOpen: item.status_open ? "YES" : "NO", kuota: Number(item.kuota) || 0
        }));
        setAllVendorData(normalized);
        setDaftarVendorUnik([...new Set(normalized.filter(v => v.statusOpen === "YES").map(v => v.namaVendor))]);
      }
      const { data: rawO, error: errO } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (errO) throw errO;
      if (rawO) setOrderList(rawO.map(o => ({
        id: o.id, Tanggal: new Date(o.created_at).toLocaleString("id-ID"), Nama_Pemesan: o.nama_pemesan,
        Nama_Vendor: o.nama_vendor, Nama_Barang: o.nama_barang, Jumlah: Number(o.jumlah), Subtotal: Number(o.subtotal),
        Modal_Vendor: Number(o.modal_vendor), Status_Bayar: o.status_bayar, Status_Pesanan: o.status_pesanan,
        Status_Ambil: o.status_ambil, Archived: o.archived ? "YES" : "NO"
      })));
    } catch (err) {
      if (!isSilent) toast.error("Koneksi Supabase Gagal! Cek Console.");
    } finally { setIsChecking(false); }
  };

  useEffect(() => {
    const access = typeof window !== 'undefined' ? sessionStorage.getItem("access_granted") : null;
    const adminStatus = typeof window !== 'undefined' ? sessionStorage.getItem("is_admin") : null;
    let initialLoad;
    if (access === "true") {
      setTimeout(() => {
        setIsAuthorized(true);
        setIsAdmin(adminStatus === "true");
      }, 0);
      initialLoad = setTimeout(() => refreshData(), 0);
    } else {
      initialLoad = setTimeout(() => {
        setIsAuthorized(false);
        setIsChecking(false);
      }, 0);
      router.replace("/");
    }
    return () => clearTimeout(initialLoad);
  }, [router]);

  useEffect(() => {
    let interval;
    if (isAuthorized) interval = setInterval(() => { refreshData(true); }, 30000);
    return () => clearInterval(interval);
  }, [isAuthorized]);

  const getSisaKuota = (vName, bName) => {
    const itemAwal = allVendorData.find(v => v.namaVendor === vName && v.namaBarang === bName);
    const kuotaMaksimal = itemAwal ? itemAwal.kuota : 0;
    let totalDipesan = 0;
    orderList.filter(o => o.Nama_Vendor === vName && o.Archived !== "YES").forEach(order => {
      if (!order.Nama_Barang) return;
      order.Nama_Barang.split(", ").forEach(itemStr => {
        const match = itemStr.match(/(.+) \((\d+)\)$/);
        if (match && match[1] === bName) totalDipesan += parseInt(match[2]);
      });
    });
    const totalDiKeranjang = keranjang.filter(k => k.namaVendor === vName && k.namaBarang === bName).reduce((acc, curr) => acc + parseInt(curr.jumlah), 0);
    return kuotaMaksimal - totalDipesan - totalDiKeranjang;
  };

  const getRekapVendor = (vName) => {
    const summary = {};
    orderList.filter(o => o.Nama_Vendor === vName && o.Archived !== "YES").forEach(order => {
      if (!order.Nama_Barang) return;
      order.Nama_Barang.split(", ").forEach(itemStr => {
        const match = itemStr.match(/(.+) \((\d+)\)$/);
        if (match) summary[match[1]] = (summary[match[1]] || 0) + parseInt(match[2]);
      });
    });
    return Object.entries(summary);
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedVendor || !selectedBarang || !jumlah) return;
    const qtyNumber = parseInt(jumlah);
    if (qtyNumber <= 0) return;
    const sisaKuota = getSisaKuota(selectedVendor, selectedBarang.namaBarang);
    if (qtyNumber > sisaKuota) { toast.error(`Sisa kuota hanya ${sisaKuota}.`); return; }
    const existingItemIdx = keranjang.findIndex(item => item.namaVendor === selectedVendor && item.namaBarang === selectedBarang.namaBarang);
    if (existingItemIdx > -1) {
      const updatedKeranjang = [...keranjang];
      const newQty = parseInt(updatedKeranjang[existingItemIdx].jumlah) + qtyNumber;
      updatedKeranjang[existingItemIdx].jumlah = newQty.toString();
      updatedKeranjang[existingItemIdx].subtotal = selectedBarang.hargaBarang * newQty;
      setKeranjang(updatedKeranjang);
    } else {
      setKeranjang([...keranjang, { idTemp: Date.now(), namaPemesan, namaVendor: selectedVendor, namaBarang: selectedBarang.namaBarang, subtotal: selectedBarang.hargaBarang * qtyNumber, jumlah }]);
    }
    toast.success("Masuk keranjang!"); setJumlah("");
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
        return {
          nama_pemesan: namaPemesan, nama_vendor: vendor,
          nama_barang: items.map(i => `${i.namaBarang} (${i.jumlah})`).join(", "),
          jumlah: items.reduce((acc, curr) => acc + parseInt(curr.jumlah), 0),
          subtotal: items.reduce((acc, curr) => acc + curr.subtotal, 0),
          modal_vendor: items.reduce((acc, curr) => {
            const vItem = allVendorData.find(v => v.namaVendor === curr.namaVendor && v.namaBarang === curr.namaBarang);
            return acc + ((vItem ? vItem.hargaModal : 0) * parseInt(curr.jumlah));
          }, 0),
          status_bayar: "BELUM", status_pesanan: "PROSES", status_ambil: "BELUM", archived: false
        };
      });
      await supabase.from('orders').insert(dataToPost);
      setKeranjang([]); setActiveTab("history"); refreshData(true);
      toast.success("Checkout Berhasil!");
    } catch (err) { toast.error("Checkout Gagal."); }
    setLoading(false);
  };

  const updateOrderStatus = async (id, field, value) => {
    setOrderList(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    try { await supabase.from('orders').update({ [field.toLowerCase()]: value }).eq('id', id); toast.success("Status diperbarui."); } 
    catch (err) { toast.error("Gagal."); refreshData(true); }
  };

  const requestCancelOrder = (id, pemesan) => {
    setConfirmDialog({
      isOpen: true, title: "Hapus Pesanan", message: `Yakin membatalkan pesanan ${pemesan}?`, isDanger: true,
      onConfirm: async () => {
        setOrderList(prev => prev.filter(o => o.id !== id));
        try { await supabase.from('orders').delete().eq('id', id); toast.success("Dihapus."); } catch (err) {}
      }
    });
  };

  const toggleVendorStatus = async (vName, currentStatus) => {
    setLoading(true); 
    try { await supabase.from('vendors').update({ status_open: currentStatus !== "YES" }).eq('nama_vendor', vName); refreshData(true); } 
    catch (err) {} setLoading(false);
  };

  const requestMarkAllArrived = (vName) => {
    setConfirmDialog({
      isOpen: true, title: "Tandai Barang Tiba", message: `Ubah pesanan ${vName} jadi READY dan Info Discord?`, isDanger: false,
      onConfirm: async () => {
        setLoading(true);
        try {
          await supabase.from('orders').update({ status_pesanan: 'READY' }).eq('nama_vendor', vName).eq('status_pesanan', 'PROSES');
          // === MENGGUNAKAN WEBHOOK PEMESANAN ===
          await fetch(WEBHOOK_PEMESANAN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: `@everyone 📦 **BARANG TIBA!**\nPesanan ${vName} siap diambil.` }) });
          refreshData(true); toast.success("Selesai!");
        } catch (err) {} setLoading(false);
      }
    });
  };

  const requestArchive = (vName) => {
    setConfirmDialog({
      isOpen: true, title: "Arsipkan", message: `Arsipkan pesanan dari ${vName}?`, isDanger: true,
      onConfirm: async () => {
        try { await supabase.from('orders').update({ archived: true }).eq('nama_vendor', vName); refreshData(true); } catch (err) {}
      }
    });
  };

  const sendDiscordAnnouncement = async (type, vName) => {
    // === MENGGUNAKAN WEBHOOK PEMESANAN ===
    try { await fetch(WEBHOOK_PEMESANAN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: type === "OPEN" ? `@everyone 📢 PO ${vName} DIBUKA di ${WEBSITE_URL}` : `📢 PO ${vName} DITUTUP.` }) }); toast.success("Terkirim!"); } catch(e) {}
  };

  const exportToCSV = () => { toast.success("Fungsi Export CSV berjalan."); };

  // KALKULATOR
  const hitungUmer = () => {
    const awal = Number(inputUmer) || 0;
    const pot10 = awal * 0.10, sisa1 = awal - pot10, pot15 = sisa1 * 0.15, hasilMurni = sisa1 - pot15;
    const jumlahKartu = Math.ceil(awal / 50000);
    return { awal, pot10, sisaSetelah10: sisa1, pot15, hasilMurni, jumlahKartu, totalBiayaKartu: jumlahKartu * 200, hasilDenganKartu: Math.max(0, hasilMurni - (jumlahKartu * 200)) };
  };
  const hitungBibit = () => {
    const jumlahBibit = Number(inputBibit) || 0;
    const totalWeed = jumlahBibit * 5, totalBiayaBibit = jumlahBibit * 700;
    const totalPendapatanMerah = totalWeed * 500, pot10 = totalPendapatanMerah * 0.10, sisa1 = totalPendapatanMerah - pot10, totalPendapatanPutih = sisa1 - (sisa1 * 0.15);
    return { jumlahBibit, totalWeed, totalBiayaBibit, totalBiayaBaggyKantor: totalWeed * 50, totalBiayaBaggyKaleng: totalWeed * 36, modalTotalKantor: totalBiayaBibit + (totalWeed * 50), modalTotalKaleng: totalBiayaBibit + (totalWeed * 36), totalPendapatanMerah, totalPendapatanPutih, profitKantor: totalPendapatanPutih - (totalBiayaBibit + (totalWeed * 50)), profitKaleng: totalPendapatanPutih - (totalBiayaBibit + (totalWeed * 36)) };
  };
  
  const financeStats = (() => {
    let omset = 0, modal = 0;
    const activeOrders = orderList.filter(o => o.Archived !== "YES");
    const filtered = financeVendor ? activeOrders.filter(o => o.Nama_Vendor === financeVendor) : activeOrders;
    filtered.forEach(o => { omset += Number(o.Subtotal) || 0; if (o.Modal_Vendor) modal += Number(o.Modal_Vendor) || 0; });
    return { omset, modal, profit: omset - modal };
  })();

  const filteredOrders = orderList.filter(o => {
    return (showArchived ? (o.Archived === "YES" && o.Status_Ambil !== "SUDAH") : o.Archived !== "YES") &&
           (filterBelumAmbil ? o.Status_Ambil !== "SUDAH" : true) &&
           (filterVendor ? o.Nama_Vendor === filterVendor : true) &&
           (searchNama ? (o.Nama_Pemesan || "").toLowerCase().includes(searchNama.toLowerCase()) : true);
  });
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isChecking) return <div className="min-h-screen flex items-center justify-center bg-black text-white font-black tracking-widest animate-pulse">INITIALIZING DCMC SYSTEM...</div>;
  if (!isAuthorized) return <div className="min-h-screen flex items-center justify-center bg-black text-red-600 font-black">AKSES DITOLAK</div>;

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans pb-24 md:pb-8 selection:bg-red-600/30">
      <Toaster position="top-center" toastOptions={{ style: { background: '#09090b', color: '#fff', borderRadius: '16px', border: '1px solid #27272a' } }} />
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
        <img src="/LOGO_DCMC_NRD.png" alt="Watermark" className="w-[120vw] max-w-[800px] object-contain rotate-[-5deg] grayscale brightness-50" />
      </div>

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-xl font-black text-white mb-2"><AlertCircle className="inline mr-2 text-red-500" />Konfirmasi</h3>
            <p className="text-zinc-400 mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({isOpen: false})} className="flex-1 bg-zinc-800 py-3 rounded-xl">Batal</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({isOpen: false}); }} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Eksekusi</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER NAV */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/LOGO_DCMC_NRD.png" className="w-10 h-10" />
          <h1 className="text-xl font-black text-white hidden sm:block">DCMC <span className="text-red-600">HUB</span></h1>
        </div>
        <nav className="hidden md:flex gap-2">
          <TabBtn active={activeTab==='order'} onClick={()=>setActiveTab('order')} icon={<Package size={18}/>} label="Pesan" badge={keranjang.length} />
          <TabBtn active={activeTab==='laundry'} onClick={()=>setActiveTab('laundry')} icon={<RefreshCcw size={18}/>} label="Cuci Uang" />
          <TabBtn active={activeTab==='history'} onClick={()=>setActiveTab('history')} icon={<ClipboardList size={18}/>} label="Riwayat" />
          <TabBtn active={activeTab==='kalkulator'} onClick={()=>setActiveTab('kalkulator')} icon={<Calculator size={18}/>} label="Kalkulator" />
          {isAdmin && <TabBtn active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<Shield size={18}/>} label="Admin" />}
        </nav>
        <div className={`px-4 py-2 rounded-full text-xs font-bold border ${isAdmin ? 'bg-red-600/10 text-red-500 border-red-500/30' : 'bg-zinc-800 text-zinc-300'}`}>
          <User size={14} className="inline mr-1" /> {isAdmin ? "ADMIN" : "MEMBER"}
        </div>
      </header>

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] bg-zinc-950/95 border border-zinc-800 rounded-full z-50 flex justify-around p-1.5 shadow-2xl">
          <TabBtn active={activeTab==='order'} onClick={()=>setActiveTab('order')} icon={<Package size={20}/>} label="Pesan" badge={keranjang.length} />
          <TabBtn active={activeTab==='laundry'} onClick={()=>setActiveTab('laundry')} icon={<RefreshCcw size={20}/>} label="Cuci" />
          <TabBtn active={activeTab==='history'} onClick={()=>setActiveTab('history')} icon={<ClipboardList size={20}/>} label="Riwayat" />
          <TabBtn active={activeTab==='kalkulator'} onClick={()=>setActiveTab('kalkulator')} icon={<Calculator size={20}/>} label="Hitung" />
          {isAdmin && <TabBtn active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<Shield size={20}/>} label="Admin" />}
      </nav>

      {/* TAB KONTEN */}
      <main className="w-full max-w-7xl mx-auto p-4 md:p-6 mt-4 z-10 relative">
        {activeTab === 'order' && <TabPesan namaPemesan={namaPemesan} setNamaPemesan={setNamaPemesan} selectedVendor={selectedVendor} setSelectedVendor={setSelectedVendor} selectedBarang={selectedBarang} setSelectedBarang={setSelectedBarang} jumlah={jumlah} setJumlah={setJumlah} keranjang={keranjang} setKeranjang={setKeranjang} allVendorData={allVendorData} daftarVendorUnik={daftarVendorUnik} barangTersedia={barangTersedia} setBarangTersedia={setBarangTersedia} handleAddToCart={handleAddToCart} handleCheckout={handleCheckout} getSisaKuota={getSisaKuota} loading={loading} />}
        {/* === TAB LAUNDRY MENGGUNAKAN WEBHOOK UMER === */}
        {activeTab === 'laundry' && <TabLaundry isAdmin={isAdmin} webhookUrl={WEBHOOK_UMER} />}

        {activeTab === 'history' && <TabRiwayat showArchived={showArchived} setShowArchived={setShowArchived} searchNama={searchNama} setSearchNama={setSearchNama} setCurrentPage={setCurrentPage} filterVendor={filterVendor} setFilterVendor={setFilterVendor} orderList={orderList} filterBelumAmbil={filterBelumAmbil} setFilterBelumAmbil={setFilterBelumAmbil} paginatedOrders={paginatedOrders} totalPages={totalPages} currentPage={currentPage} isAdmin={isAdmin} loading={loading} updateOrderStatus={updateOrderStatus} requestCancelOrder={requestCancelOrder} />}
        {activeTab === 'kalkulator' && <TabKalkulator inputUmer={inputUmer} setInputUmer={setInputUmer} inputBibit={inputBibit} setInputBibit={setInputBibit} hasilUmer={hitungUmer()} hasilBibit={hitungBibit()} />}
        {activeTab === 'admin' && isAdmin && <TabAdmin financeVendor={financeVendor} setFinanceVendor={setFinanceVendor} allVendorData={allVendorData} exportToCSV={exportToCSV} financeStats={financeStats} loading={loading} toggleVendorStatus={toggleVendorStatus} getRekapVendor={getRekapVendor} getSisaKuota={getSisaKuota} sendDiscordAnnouncement={sendDiscordAnnouncement} requestMarkAllArrived={requestMarkAllArrived} requestArchive={requestArchive} />}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-full transition-all ${active ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
      {icon} <span className="text-[10px] font-black uppercase tracking-wider hidden sm:block">{label}</span>
      {badge > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white text-red-600' : 'bg-red-600 text-white'}`}>{badge}</span>}
    </button>
  );
}