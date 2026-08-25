"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Package, ClipboardList, Shield, Check, X, Search, Bell, Archive, Copy, Calculator, Wallet, CreditCard, TrendingUp, DollarSign, Download, ChevronLeft, ChevronRight, Loader2, User, Leaf, AlertCircle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// IMPORT SUPABASE CLIENT
import { supabase } from "../lib/supabase"; 

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
  const [isAdmin, setIsAdmin] = useState(() => typeof window !== 'undefined' && sessionStorage.getItem("is_admin") === "true");
  const [isAuthorized, setIsAuthorized] = useState(() => typeof window !== 'undefined' && sessionStorage.getItem("access_granted") === "true");
  const [isChecking, setIsChecking] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: null, isDanger: false });
  const router = useRouter();

  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1522683134620205160/lxJSiUlPFQ_9J24uZ6BwrrBJN4Ht3Y3H97ZXYAkWHJZVSF0TfjM6XzOhoWhS5WOa_8Ak";
  const WEBSITE_URL = "https://dcmc-sable.vercel.app/";

  useEffect(() => {
    if (isAuthorized) {
      refreshData();
    } else {
      router.replace("/");
    }
  }, [isAuthorized, router]);

  useEffect(() => {
    let interval;
    if (isAuthorized) {
      interval = setInterval(() => { refreshData(true); }, 30000);
    }
    return () => clearInterval(interval);
  }, [isAuthorized]);

  async function refreshData(isSilent = false) {
    try {
      const { data: rawV, error: errV } = await supabase.from('vendors').select('*');
      if (errV) throw errV;
      
      if (rawV) {
        const normalized = rawV.map(item => ({
          id: item.id,
          namaVendor: item.nama_vendor || "",
          namaBarang: item.nama_barang || "",
          hargaBarang: Number(item.harga_barang) || 0,
          hargaModal: Number(item.harga_modal) || 0,
          statusOpen: item.status_open ? "YES" : "NO",
          kuota: Number(item.kuota) || 0
        }));
        setAllVendorData(normalized);
        const openVendors = normalized.filter(v => v.statusOpen === "YES");
        setDaftarVendorUnik([...new Set(openVendors.map(v => v.namaVendor))]);
      }

      const { data: rawO, error: errO } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (errO) throw errO;

      if (rawO) {
        const normalizedOrders = rawO.map(o => ({
          id: o.id,
          Tanggal: new Date(o.created_at).toLocaleString("id-ID"),
          Nama_Pemesan: o.nama_pemesan,
          Nama_Vendor: o.nama_vendor,
          Nama_Barang: o.nama_barang,
          Jumlah: Number(o.jumlah),
          Subtotal: Number(o.subtotal),
          Modal_Vendor: Number(o.modal_vendor),
          Status_Bayar: o.status_bayar,
          Status_Pesanan: o.status_pesanan,
          Status_Ambil: o.status_ambil,
          Archived: o.archived ? "YES" : "NO"
        }));
        setOrderList(normalizedOrders);
      }
    } catch (err) { 
      if (!isSilent) toast.error("Koneksi Supabase Gagal! Cek Console.");
      console.log("🔴 ERROR SUPABASE:", err);
    } finally { 
      setIsChecking(false); 
    }
  }

  const getSisaKuota = (vName, bName) => {
    const itemAwal = allVendorData.find(v => v.namaVendor === vName && v.namaBarang === bName);
    const kuotaMaksimal = itemAwal ? itemAwal.kuota : 0;
    let totalDipesanDatabase = 0;
    orderList.filter(o => o.Nama_Vendor === vName && o.Archived !== "YES").forEach(order => {
      if (!order.Nama_Barang) return;
      const items = order.Nama_Barang.split(", ");
      items.forEach(itemStr => {
        const match = itemStr.match(/(.+) \((\d+)\)$/);
        if (match && match[1] === bName) { totalDipesanDatabase += parseInt(match[2]); }
      });
    });
    const totalDiKeranjang = keranjang
      .filter(k => k.namaVendor === vName && k.namaBarang === bName)
      .reduce((acc, curr) => acc + parseInt(curr.jumlah), 0);
    return kuotaMaksimal - totalDipesanDatabase - totalDiKeranjang;
  };

  const getRekapVendor = (vName) => {
    const summary = {};
    orderList.filter(o => o.Nama_Vendor === vName && o.Archived !== "YES").forEach(order => {
      if (!order.Nama_Barang) return;
      const items = order.Nama_Barang.split(", ");
      items.forEach(itemStr => {
        const match = itemStr.match(/(.+) \((\d+)\)$/);
        if (match) summary[match[1]] = (summary[match[1]] || 0) + parseInt(match[2]);
      });
    });
    return Object.entries(summary);
  };

  const toggleVendorStatus = async (vName, currentStatus) => {
    setLoading(true);
    const nextStatusBool = currentStatus !== "YES";
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ status_open: nextStatusBool })
        .eq('nama_vendor', vName);
        
      if (error) throw error;
      toast.success(`Status ${vName} diubah menjadi ${nextStatusBool ? "OPEN" : "CLOSED"}`);
      refreshData(true);
    } catch (err) { toast.error("Gagal mengubah status."); }
    setLoading(false);
  };

  const requestMarkAllArrived = (vName) => {
    setConfirmDialog({
      isOpen: true, title: "Tandai Barang Tiba",
      message: `Tandai pesanan ${vName} menjadi READY sekaligus umumkan di Discord?`,
      isDanger: false,
      onConfirm: async () => {
        const loadingToast = toast.loading(`Memperbarui & Announce ${vName}...`);
        setLoading(true);
        try {
          const { error } = await supabase
            .from('orders')
            .update({ status_pesanan: 'READY' })
            .eq('nama_vendor', vName)
            .eq('status_pesanan', 'PROSES');
            
          if (error) throw error;
          refreshData(true);
          
          const message = {
            content: `@everyone 📦 **BARANG TIBA!**`,
            embeds: [{
              title: `📦 PESANAN ${vName} SUDAH READY!`,
              description: `Semua pre-order untuk vendor **${vName}** telah tiba dan siap diambil.\n\nSilakan cek riwayat pesanan Anda di website.`,
              color: 3066993, timestamp: new Date()
            }]
          };
          await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
          toast.success("Barang tiba & Discord terkirim!", { id: loadingToast });
        } catch (err) { toast.error("Gagal memproses data.", { id: loadingToast }); }
        setLoading(false);
      }
    });
  };

  const requestArchive = (vName) => {
    setConfirmDialog({
      isOpen: true, title: "Arsipkan Vendor",
      message: `Yakin mengarsipkan SEMUA pesanan dari ${vName}? Data akan disembunyikan dari riwayat utama.`,
      isDanger: true,
      onConfirm: async () => {
        const loadingToast = toast.loading(`Mengarsipkan ${vName}...`);
        setLoading(true);
        try {
          const { error } = await supabase
            .from('orders')
            .update({ archived: true })
            .eq('nama_vendor', vName);
            
          if (error) throw error;
          toast.success("PO berhasil diarsipkan.", { id: loadingToast });
          refreshData(true);
        } catch (err) { toast.error("Gagal mengarsipkan PO.", { id: loadingToast }); }
        setLoading(false);
      }
    });
  };

  const sendDiscordAnnouncement = async (type, vendorName) => {
    const isOpening = type === "OPEN";
    const vendorItems = allVendorData.filter(v => v.namaVendor === vendorName);
    const MAX_ITEMS = 12;
    let itemsToShow = vendorItems.slice(0, MAX_ITEMS);
    let itemRows = itemsToShow.map(item => `🔹 **${item.namaBarang}** — $${Number(item.hargaBarang).toLocaleString()} (Sisa: ${getSisaKuota(vendorName, item.namaBarang)})`).join("\n"); 
    
    if (vendorItems.length > MAX_ITEMS) { 
      itemRows += `\n\n*...dan ${vendorItems.length - MAX_ITEMS} item lainnya. Cek selengkapnya di website!*`; 
    } 
    
    const message = { 
      content: isOpening ? `@everyone 📢 PRE-ORDER ALERT!` : `📢 PO CLOSED`, 
      embeds: [{ 
        title: isOpening ? `✅ PEMESANAN ${vendorName} DIBUKA!` : `❌ PO ${vendorName} TELAH DITUTUP`,
        description: isOpening ? `Halo team! Pre-order untuk vendor ${vendorName} kini telah dibuka.\n\n🛒 PESAN DI SINI:\n${WEBSITE_URL}` : `Sesi pemesanan untuk ${vendorName} sudah berakhir.`,
        color: isOpening ? 13904938 : 39423, 
        fields: isOpening ? [{ name: "📋 DAFTAR HARGA & KUOTA:", value: itemRows || "Cek di website" }] : [],
        timestamp: new Date()
      }]
    };
    
    try {
      await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
      toast.success("Notifikasi Discord Terkirim!");
    } catch(e) { toast.error("Gagal mengirim notif Discord."); }
  };

  const handleCheckout = async () => {
    if (keranjang.length === 0) return;
    const loadingToast = toast.loading("Memproses pesanan...");
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
        const totalModalCheckout = items.reduce((acc, curr) => {
          const vendorItem = allVendorData.find(v => v.namaVendor === curr.namaVendor && v.namaBarang === curr.namaBarang);
          return acc + ((vendorItem ? vendorItem.hargaModal : 0) * parseInt(curr.jumlah));
        }, 0);
        
        return {
          nama_pemesan: namaPemesan,
          nama_vendor: vendor,
          nama_barang: listBarangString,
          jumlah: totalQty,
          subtotal: totalBayar,
          modal_vendor: totalModalCheckout,
          status_bayar: "BELUM",
          status_pesanan: "PROSES",
          status_ambil: "BELUM",
          archived: false
        };
      });
      
      const { error } = await supabase.from('orders').insert(dataToPost);
      if (error) throw error;
      
      setKeranjang([]); setActiveTab("history"); refreshData(true);
      toast.success("Checkout Berhasil! Pesanan diteruskan.", { id: loadingToast });
    } catch (err) { toast.error("Checkout Gagal. Coba lagi.", { id: loadingToast }); }
    setLoading(false);
  };

  const updateOrderStatus = async (id, field, value) => {
    setOrderList(prevList => prevList.map(order => order.id === id ? { ...order, [field]: value } : order));
    try {
      const dbField = field.toLowerCase();
      const { error } = await supabase
        .from('orders')
        .update({ [dbField]: value })
        .eq('id', id);
        
      if (error) throw error;
      toast.success("Status diperbarui.");
    } catch (err) { toast.error("Koneksi gagal, menyinkronkan ulang data..."); refreshData(true); }
  };

  const requestCancelOrder = (id, pemesan) => {
    setConfirmDialog({
      isOpen: true, title: "Hapus Pesanan",
      message: `Yakin membatalkan pesanan untuk ${pemesan}? Data akan dihapus permanen.`,
      isDanger: true,
      onConfirm: async () => {
        setOrderList(prevList => prevList.filter(o => o.id !== id));
        try {
          const { error } = await supabase.from('orders').delete().eq('id', id);
          if (error) throw error;
          toast.success("Pesanan dihapus.");
        } catch (err) { toast.error("Gagal menghapus pesanan."); refreshData(true); }
      }
    });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedVendor || !selectedBarang || !jumlah) return;
    const qtyNumber = parseInt(jumlah);
    if (qtyNumber <= 0) return;
    const sisaKuota = getSisaKuota(selectedVendor, selectedBarang.namaBarang);
    if (qtyNumber > sisaKuota) { toast.error(`Sisa kuota untuk ${selectedBarang.namaBarang} hanya ${sisaKuota}.`); return; }
    const existingItemIdx = keranjang.findIndex((item) => item.namaVendor === selectedVendor && item.namaBarang === selectedBarang.namaBarang);
    if (existingItemIdx > -1) {
      const updatedKeranjang = [...keranjang];
      const newQty = parseInt(updatedKeranjang[existingItemIdx].jumlah) + qtyNumber;
      updatedKeranjang[existingItemIdx].jumlah = newQty.toString();
      updatedKeranjang[existingItemIdx].subtotal = selectedBarang.hargaBarang * newQty;
      setKeranjang(updatedKeranjang);
    } else {
      setKeranjang([...keranjang, { idTemp: Date.now(), namaPemesan, namaVendor: selectedVendor, namaBarang: selectedBarang.namaBarang, subtotal: selectedBarang.hargaBarang * qtyNumber, jumlah: jumlah }]);
    }
    toast.success("Berhasil ditambahkan ke keranjang!");
    setJumlah("");
  };

  const exportToCSV = () => {
    const headers = "Tanggal,Nama Pemesan,Vendor,Barang,Total Qty,Subtotal (Omset),Total Modal,Status Bayar,Status Pesanan,Status Ambil\n";
    const activeOrders = orderList.filter(o => o.Archived !== "YES");
    const rows = activeOrders.map(o => {
      let modalData = Number(o.Modal_Vendor);
      if (isNaN(modalData) || o.Modal_Vendor === undefined || o.Modal_Vendor === "") {
        modalData = 0;
        if (o.Nama_Barang) {
          o.Nama_Barang.split(", ").forEach(itemStr => {
            const match = itemStr.match(/(.+) \((\d+)\)$/);
            if (match) {
              const vendorItem = allVendorData.find(v => v.namaVendor === o.Nama_Vendor && v.namaBarang === match[1]);
              modalData += (vendorItem ? vendorItem.hargaModal * parseInt(match[2]) : 0);
            }
          });
        }
      }
      return `"${o.Tanggal}","${o.Nama_Pemesan}","${o.Nama_Vendor}","${o.Nama_Barang}",${o.Jumlah},${o.Subtotal},${modalData},${o.Status_Bayar},${o.Status_Pesanan},${o.Status_Ambil}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Laporan_DCMC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast.success("Laporan CSV berhasil diunduh!");
  };

  const hitungUmer = () => {
    const awal = Number(inputUmer) || 0;
    const pot10 = awal * 0.10;
    const sisa1 = awal - pot10;
    const pot15 = sisa1 * 0.15;
    const hasilMurni = sisa1 - pot15;
    const jumlahKartu = Math.ceil(awal / 50000);
    const hasilDenganKartu = Math.max(0, hasilMurni - (jumlahKartu * 200));
    return { awal, pot10, sisaSetelah10: sisa1, pot15, hasilMurni, jumlahKartu, totalBiayaKartu: jumlahKartu * 200, hasilDenganKartu };
  };
  const hasilUmer = hitungUmer();
  
  const hitungBibit = () => {
    const jumlahBibit = Number(inputBibit) || 0;
    const totalWeed = jumlahBibit * 5;
    const totalBiayaBibit = jumlahBibit * 700;
    const modalTotalKantor = totalBiayaBibit + (totalWeed * 50);
    const modalTotalKaleng = totalBiayaBibit + (totalWeed * 36);
    const totalPendapatanMerah = totalWeed * 500;
    const pot10 = totalPendapatanMerah * 0.10;
    const sisa1 = totalPendapatanMerah - pot10;
    const totalPendapatanPutih = sisa1 - (sisa1 * 0.15);
    return {
      jumlahBibit, totalWeed, totalBiayaBibit, totalBiayaBaggyKantor: totalWeed * 50, totalBiayaBaggyKaleng: totalWeed * 36,
      modalTotalKantor, modalTotalKaleng, totalPendapatanMerah, totalPendapatanPutih,
      profitKantor: totalPendapatanPutih - modalTotalKantor, profitKaleng: totalPendapatanPutih - modalTotalKaleng
    };
  };
  const hasilBibit = hitungBibit();
  
  const financeStats = (() => {
    let omset = 0, modal = 0;
    const activeOrders = orderList.filter(o => o.Archived !== "YES");
    const filtered = financeVendor ? activeOrders.filter(o => o.Nama_Vendor === financeVendor) : activeOrders;
    filtered.forEach(order => {
      omset += Number(order.Subtotal) || 0;
      if (order.Modal_Vendor !== undefined && order.Modal_Vendor !== "") {
        modal += Number(order.Modal_Vendor) || 0;
      } else if (order.Nama_Barang && order.Nama_Vendor) {
        order.Nama_Barang.split(", ").forEach(itemStr => {
          const match = itemStr.match(/(.+) \((\d+)\)$/);
          if (match) {
            const vItem = allVendorData.find(v => v.namaVendor === order.Nama_Vendor && v.namaBarang === match[1]);
            modal += (vItem ? vItem.hargaModal : 0) * parseInt(match[2]);
          }
        });
      }
    });
    return { omset, modal, profit: omset - modal };
  })();

  const filteredOrders = orderList.filter(o => {
    const isArchivedTarget = showArchived ? (o.Archived === "YES" && o.Status_Ambil !== "SUDAH") : o.Archived !== "YES";
    const isBelumAmbil = filterBelumAmbil ? o.Status_Ambil !== "SUDAH" : true;
    const isVendorMatch = filterVendor ? o.Nama_Vendor === filterVendor : true;
    const isNamaMatch = searchNama ? (o.Nama_Pemesan || "").toLowerCase().includes(searchNama.toLowerCase()) : true;
    return isArchivedTarget && isBelumAmbil && isVendorMatch && isNamaMatch;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const sisaKuotaTerpilih = selectedBarang ? getSisaKuota(selectedVendor, selectedBarang.namaBarang) : 0;

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white font-black tracking-widest animate-pulse">
        INITIALIZING DCMC SYSTEM...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6 text-center">
        <h1 className="text-4xl font-black text-red-600 mb-2">AKSES DITOLAK</h1>
        <p className="text-zinc-400 mb-8 max-w-md">Portal eksklusif. Anda harus masuk dari gerbang utama.</p>
        <button onClick={() => window.location.href = "/"} className="w-full max-w-xs bg-red-600/10 border border-red-600/50 text-red-500 hover:bg-red-600 hover:text-white px-6 py-3.5 rounded-xl font-bold transition-all duration-300 shadow-[0_0_20px_rgba(220,38,38,0.2)]">
          Kembali ke Markas
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-red-600/30 selection:text-red-200 pb-24 md:pb-8">
      <Toaster position="top-center" toastOptions={{ style: { background: '#09090b', color: '#fff', borderRadius: '16px', border: '1px solid #27272a', backdropFilter: 'blur(10px)' } }} />
      
      {/* WATERMARK BACKGROUND LOGO */}
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
        <img src="/LOGO_DCMC_NRD.png" alt="DCMC Watermark" className="w-[120vw] max-w-[800px] object-contain rotate-[-5deg] grayscale brightness-50" />
      </div>

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${confirmDialog.isDanger ? 'bg-red-600 shadow-[0_0_15px_#dc2626]' : 'bg-amber-500 shadow-[0_0_15px_#f59e0b]'}`}></div>
            <h3 className="text-xl font-black text-white mb-2 mt-2 flex items-center gap-2">
              <AlertCircle className={confirmDialog.isDanger ? "text-red-600" : "text-amber-500"} size={24} /> 
              {confirmDialog.title}
            </h3>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({isOpen: false})} className="flex-1 bg-zinc-800/50 text-zinc-300 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-colors">Batal</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({isOpen: false}); }} className={`flex-1 text-white py-3 rounded-xl font-bold transition-all shadow-lg ${confirmDialog.isDanger ? 'bg-red-600 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]' : 'bg-amber-600 hover:bg-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]'}`}>Eksekusi</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER TOP NAV - REDESIGNED */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 md:px-8 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3 w-1/3">
          <img src="/LOGO_DCMC_NRD.png" alt="Logo" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-[0_0_12px_rgba(220,38,38,0.6)]" />
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight hidden sm:block">
            DCMC <span className="text-red-600">HUB</span>
          </h1>
        </div>

        {/* TOP NAVIGATION FOR DESKTOP */}
        <nav className="hidden md:flex items-center justify-center gap-2 w-1/3">
          <TabButton active={activeTab === 'order'} onClick={() => setActiveTab('order')} icon={<Package size={18}/>} label="Pesan" badge={keranjang.length} />
          <TabButton active={activeTab === 'history'} onClick={() => {setActiveTab('history'); setCurrentPage(1);}} icon={<ClipboardList size={18}/>} label="Riwayat" />
          <TabButton active={activeTab === 'kalkulator'} onClick={() => setActiveTab('kalkulator')} icon={<Calculator size={18}/>} label="Kalkulator" />
          {isAdmin && <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Shield size={18}/>} label="Admin" />}
        </nav>

        <div className="flex items-center justify-end w-1/3">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] md:text-xs font-bold border backdrop-blur-md transition-all ${isAdmin ? 'bg-red-600/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(220,38,38,0.2)]' : 'bg-zinc-800/50 text-zinc-300 border-zinc-700/50'}`}>
            {isAdmin ? <Shield size={14} className="animate-pulse" /> : <User size={14} />}
            <span className="">{isAdmin ? "ADMINISTRATOR" : "MEMBER"}</span>
          </div>
        </div>
      </header>

      {/* MOBILE NAVIGATION - BOTTOM BAR */}
      <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-full z-50 flex justify-around p-1.5 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <TabButton active={activeTab === 'order'} onClick={() => setActiveTab('order')} icon={<Package size={20}/>} label="Pesan" badge={keranjang.length} />
          <TabButton active={activeTab === 'history'} onClick={() => {setActiveTab('history'); setCurrentPage(1);}} icon={<ClipboardList size={20}/>} label="Riwayat" />
          <TabButton active={activeTab === 'kalkulator'} onClick={() => setActiveTab('kalkulator')} icon={<Calculator size={20}/>} label="Hitung" />
          {isAdmin && <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Shield size={20}/>} label="Admin" />}
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-7xl mx-auto p-4 md:p-6 mt-4 z-10 relative">
        
        {/* --- TAB 1: FORM ORDER + CART --- */}
        {activeTab === 'order' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 items-start">
            <div className="lg:col-span-7 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl hover:border-red-600/30 transition-all duration-300 group">
              <div className="mb-8 flex items-center gap-4">
                <div className="p-4 bg-zinc-950 rounded-2xl text-red-500 border border-zinc-800 group-hover:border-red-600/50 group-hover:bg-red-600/10 group-hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all duration-300">
                   <Package size={28} />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Katalog Pesanan</h2>
                  <p className="text-sm text-zinc-400 mt-1 font-medium">Isi formulir pre-order dengan teliti.</p>
                </div>
              </div>

              <form onSubmit={handleAddToCart} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Callsign / Nama</label>
                  <input 
                    type="text" required placeholder="Contoh: Budi" 
                    className="w-full p-4 rounded-2xl bg-black/50 border border-zinc-800 text-white placeholder-zinc-600 focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none transition-all focus:bg-zinc-950/80" 
                    value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Vendor Target</label>
                    <select required 
                      className="w-full p-4 rounded-2xl bg-black/50 border border-zinc-800 text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none transition-all appearance-none cursor-pointer" 
                      value={selectedVendor} 
                      onChange={(e) => { setSelectedVendor(e.target.value); setBarangTersedia(allVendorData.filter(v => v.namaVendor === e.target.value)); setSelectedBarang(null); }}
                    >
                      <option value="" disabled>-- Pilih Vendor --</option>
                      {daftarVendorUnik.map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Item Tersedia</label>
                    <select required 
                      className="w-full p-4 rounded-2xl bg-black/50 border border-zinc-800 text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none transition-all appearance-none cursor-pointer disabled:opacity-50" 
                      value={selectedBarang?.namaBarang || ""} disabled={!selectedVendor}
                      onChange={(e) => setSelectedBarang(barangTersedia.find(b => b.namaBarang === e.target.value))}>
                      <option value="" disabled>-- Pilih Item --</option>
                      {barangTersedia.map((b, i) => {
                        const sisa = getSisaKuota(selectedVendor, b.namaBarang);
                        return <option key={i} value={b.namaBarang} disabled={sisa <= 0}>{b.namaBarang} {sisa <= 0 ? "(HABIS)" : `(Sisa: ${sisa})`}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Kuantitas</label>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="number" required placeholder="0" 
                      value={jumlah} min="1" max={sisaKuotaTerpilih > 0 ? sisaKuotaTerpilih : 1} 
                      className="w-28 p-4 rounded-2xl bg-black/50 border border-zinc-800 text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/50 outline-none disabled:opacity-30 text-center text-xl font-black transition-all" 
                      onChange={(e) => setJumlah(e.target.value)} disabled={!selectedBarang || sisaKuotaTerpilih <= 0}
                    />
                    {selectedBarang && (
                      <div className="bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800 flex-grow flex items-center justify-between">
                        <span className="text-zinc-400 text-sm font-medium">Harga / item:</span>
                        <span className="font-black text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)] text-lg">${selectedBarang.hargaBarang.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  disabled={!selectedBarang || sisaKuotaTerpilih <= 0} type="submit" 
                  className="w-full bg-red-600/10 text-red-500 border border-red-600/50 hover:bg-red-600 hover:text-white p-4 rounded-2xl font-black text-lg shadow-lg active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:grayscale mt-4 flex justify-center items-center gap-3 group/btn"
                >
                  <ShoppingCart size={22} className="group-hover/btn:animate-bounce" />
                  {sisaKuotaTerpilih <= 0 && selectedBarang ? "Stok Habis" : "Masuk Keranjang"}
                </button>
              </form>
            </div>

            {/* CART SECTION */}
            <div className="lg:col-span-5 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl shadow-2xl flex flex-col sticky top-28 hover:border-zinc-700 transition-all duration-300">
              <div className="mb-6 flex justify-between items-center border-b border-zinc-800/80 pb-5">
                <h2 className="text-xl font-black flex items-center gap-3 text-white tracking-tight">
                  <div className="relative">
                    <ShoppingCart className="text-zinc-300" size={24} />
                    {keranjang.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-ping"></span>}
                  </div>
                  Brankas
                </h2>
                <span className="text-xs font-bold text-red-400 bg-red-950/40 px-3 py-1.5 rounded-full border border-red-900/50">{keranjang.length} Item</span>
              </div>

              {keranjang.length === 0 ? (
                <div className="py-20 text-center text-zinc-600 flex flex-col items-center">
                  <Package size={64} className="mx-auto mb-4 opacity-30 grayscale" />
                  <p className="text-sm font-medium">Brankas masih kosong.</p>
                </div>
              ) : (
                <div className="flex flex-col flex-grow">
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 mb-6 scrollbar-thin scrollbar-thumb-zinc-700">
                    {keranjang.map((item) => (
                      <div key={item.idTemp} className="bg-black/40 border border-zinc-800/80 p-4 rounded-2xl flex justify-between items-center shadow-inner hover:border-zinc-700 transition-colors group/item">
                        <div>
                          <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">{item.namaVendor}</span>
                          <p className="font-bold text-white mt-2 text-sm leading-tight">{item.namaBarang}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs">
                             <span className="text-zinc-400 font-medium">Qty: {item.jumlah}</span>
                             <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                             <span className="text-amber-500 font-black tracking-wide">${item.subtotal.toLocaleString()}</span>
                          </div>
                        </div>
                        <button onClick={() => { setKeranjang(keranjang.filter(i => i.idTemp !== item.idTemp)); }} 
                          className="text-zinc-500 hover:text-red-500 hover:bg-red-950/50 p-2.5 rounded-xl transition-all active:scale-90"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl p-5 mt-auto relative overflow-hidden shadow-inner">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-end mb-5 relative z-10">
                      <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Total Tagihan</span>
                      <span className="text-3xl font-black text-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.3)]">${keranjang.reduce((acc, curr) => acc + curr.subtotal, 0).toLocaleString()}</span>
                    </div>
                    <button disabled={loading} onClick={handleCheckout} 
                      className="w-full bg-green-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-green-500 hover:shadow-[0_0_20px_rgba(22,163,74,0.4)] transition-all duration-300 disabled:opacity-50 flex justify-center items-center gap-3 relative z-10"
                    >
                      {loading ? <Loader2 size={22} className="animate-spin" /> : <><Check size={22} /> Eksekusi Pesanan</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: HISTORY --- */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 relative z-10">
             
             {showArchived && (
               <div className="bg-amber-950/30 border border-amber-600/30 text-amber-500 p-4 rounded-2xl mb-6 text-sm font-bold flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                 <Archive size={20} className="animate-pulse" /> MODO ARSIP: Menampilkan data lama tertinggal.
               </div>
             )}

             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 mb-8 bg-zinc-900/60 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-zinc-800 shadow-2xl">
                <div className="flex items-center gap-4 text-xl font-black min-w-fit">
                  <div className={`p-3 rounded-2xl border ${showArchived ? 'bg-amber-950/50 text-amber-500 border-amber-900/50' : 'bg-red-950/50 text-red-500 border-red-900/50'}`}>
                     <ClipboardList size={24} /> 
                  </div>
                  <span className="tracking-tight text-white text-2xl">{showArchived ? "Gudang Arsip" : "Riwayat Transaksi"}</span>
                </div>
                
                <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full lg:w-auto">
                  <div className="relative flex-grow lg:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input type="text" placeholder="Cari nama pemesan..." value={searchNama} onChange={(e) => { setSearchNama(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-black/60 text-sm text-zinc-200 pl-12 pr-4 py-3.5 rounded-2xl border border-zinc-800 outline-none focus:border-red-600 focus:bg-black transition-all" />
                  </div>

                  <div className="relative flex-grow lg:w-48">
                    <select value={filterVendor} onChange={(e) => { setFilterVendor(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-black/60 text-sm text-zinc-200 px-4 py-3.5 rounded-2xl border border-zinc-800 outline-none focus:border-red-600 appearance-none cursor-pointer transition-all">
                      <option value="">Semua Wilayah</option>
                      {[...new Set(orderList.map(o => o.Nama_Vendor))].filter(v => v).map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={() => { setShowArchived(!showArchived); setCurrentPage(1); }} 
                      className={`flex-1 sm:flex-none px-5 py-3.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all border ${showArchived ? 'bg-amber-900/30 text-amber-500 border-amber-600/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'}`}>
                      {showArchived ? "Tutup Arsip" : "Buka Arsip"}
                    </button>

                    {!showArchived && (
                      <button onClick={() => { setFilterBelumAmbil(!filterBelumAmbil); setCurrentPage(1); }} 
                        className={`flex-1 sm:flex-none px-5 py-3.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all border ${filterBelumAmbil ? 'bg-red-900/30 text-red-500 border-red-600/40 shadow-[0_0_10px_rgba(220,38,38,0.2)]' : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'}`}>
                        {filterBelumAmbil ? "Reset Filter" : "Lihat Pending"}
                      </button>
                    )}
                  </div>
                </div>
             </div>

             <div className="space-y-4 mb-8">
               {paginatedOrders.length === 0 ? (
                  <div className="text-center p-20 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl text-zinc-600 flex flex-col items-center shadow-inner">
                    <Archive size={56} className="mb-4 opacity-30"/>
                    <p className="font-medium">{showArchived ? "Gudang arsip bersih. Tidak ada barang tertinggal." : "Sistem tidak menemukan data transaksi."}</p>
                  </div>
               ) : (
                 paginatedOrders.map((order, idx) => (
                   <OrderCard key={order.id || idx} order={order} isAdmin={isAdmin} loading={loading} onUpdate={updateOrderStatus} onCancel={requestCancelOrder} />
                 ))
               )}
             </div>

             {totalPages > 1 && (
               <div className="flex justify-between items-center bg-zinc-900/60 backdrop-blur-xl p-4 rounded-2xl border border-zinc-800 shadow-xl max-w-sm mx-auto">
                 <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 transition-all active:scale-90">
                   <ChevronLeft size={20} />
                 </button>
                 <span className="text-xs font-black tracking-widest text-zinc-400 uppercase">
                   Hal {currentPage} / {totalPages}
                 </span>
                 <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-600 disabled:opacity-30 transition-all active:scale-90">
                   <ChevronRight size={20} />
                 </button>
               </div>
             )}
          </div>
        )}

        {/* --- TAB 3: KALKULATOR UMER & BIBIT --- */}
        {activeTab === 'kalkulator' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-3xl mx-auto space-y-8 relative z-10">
            
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 md:p-10 rounded-3xl shadow-2xl hover:border-red-600/30 transition-all duration-500">
              <div className="mb-8 border-b border-zinc-800/80 pb-6 text-center">
                <div className="inline-block p-4 bg-red-950/50 rounded-2xl border border-red-900/30 mb-4 shadow-[0_0_20px_rgba(220,38,38,0.15)]">
                   <Calculator className="text-red-500" size={32} />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Kalkulator Pencucian</h2>
                <p className="text-sm text-zinc-400 mt-2 font-medium">Estimasi konversi Uang Merah ke Uang Putih.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1 block mb-3">Total Uang Kotor</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-red-600 font-black text-xl">$</span>
                    <input type="number" placeholder="0" value={inputUmer} onChange={(e) => setInputUmer(e.target.value)} 
                      className="w-full pl-14 pr-6 py-5 rounded-2xl bg-black/60 border border-zinc-800 text-3xl font-black text-white outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 transition-all shadow-inner" />
                  </div>
                </div>

                {hasilUmer.awal > 0 && (
                  <div className="bg-black/40 rounded-3xl p-6 border border-zinc-800 shadow-inner space-y-5 animate-in zoom-in-95 duration-300">
                    <div className="space-y-3 text-sm font-medium">
                      <div className="flex justify-between items-center p-3 border-b border-zinc-800/80">
                        <span className="text-zinc-400">Total Uang Merah</span><span className="font-black text-white text-lg">${hasilUmer.awal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 px-3">
                        <span className="text-zinc-500">Tax 1 (10%)</span><span className="text-red-500">- ${hasilUmer.pot10.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 px-3">
                        <span className="text-zinc-500">Tax 2 (15%)</span><span className="text-red-500">- ${hasilUmer.pot15.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
                      <div className="bg-green-950/20 border border-green-900/30 p-6 rounded-2xl relative overflow-hidden group hover:border-green-800/50 transition-colors">
                        <div className="absolute top-0 right-0 bg-green-900/30 px-3 py-1 rounded-bl-xl text-[10px] font-black text-green-500 tracking-widest">REGULER</div>
                        <p className="text-xs font-bold text-zinc-400 mb-2 mt-2 uppercase tracking-wider">Hasil Bersih</p>
                        <span className="text-3xl font-black text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">${hasilUmer.hasilMurni.toLocaleString()}</span>
                      </div>
                      <div className="bg-amber-950/20 border border-amber-900/30 p-6 rounded-2xl relative overflow-hidden hover:border-amber-800/50 transition-colors">
                        <div className="absolute top-0 right-0 bg-amber-900/30 px-3 py-1 rounded-bl-xl text-[10px] font-black text-amber-500 tracking-widest">VIP CARD</div>
                        <div className="flex justify-between items-center mb-1 mt-2 text-[10px] font-bold text-zinc-400 uppercase">
                          <span>Biaya ({hasilUmer.jumlahKartu}x)</span><span className="text-red-500">- ${hasilUmer.totalBiayaKartu.toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-400 mb-1 mt-1 uppercase tracking-wider">Hasil Bersih</p>
                        <span className="text-3xl font-black text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)]">${hasilUmer.hasilDenganKartu.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 md:p-10 rounded-3xl shadow-2xl hover:border-green-600/30 transition-all duration-500">
              <div className="mb-8 border-b border-zinc-800/80 pb-6 text-center">
                <div className="inline-block p-4 bg-green-950/50 rounded-2xl border border-green-900/30 mb-4 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                   <Leaf className="text-green-500" size={32} />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Kalkulator Ladang</h2>
                <p className="text-sm text-zinc-400 mt-2 font-medium">Estimasi ROI panen dan penjualan barang.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1 block mb-3">Total Bibit Ditanam</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-green-500 font-black text-xl">🌱</span>
                    <input type="number" placeholder="0" value={inputBibit} onChange={(e) => setInputBibit(e.target.value)} 
                      className="w-full pl-14 pr-6 py-5 rounded-2xl bg-black/60 border border-zinc-800 text-3xl font-black text-white outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all shadow-inner" />
                  </div>
                </div>

                {hasilBibit.jumlahBibit > 0 && (
                  <div className="bg-black/40 rounded-3xl p-6 border border-zinc-800 shadow-inner space-y-5 animate-in zoom-in-95 duration-300">
                    <div className="space-y-3 text-sm font-medium">
                      <div className="flex justify-between items-center p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
                        <span className="text-zinc-300 font-bold">Yield Panen (Min 5)</span><span className="font-black text-white text-xl">{hasilBibit.totalWeed} <span className="text-xs text-zinc-500 font-normal">Pcs</span></span>
                      </div>
                      <div className="flex justify-between items-center p-2 px-3 border-b border-zinc-800/80 pb-3 mt-2">
                        <span className="text-zinc-400">Estimasi Uang Merah</span><span className="text-amber-500 font-black tracking-wide">+ ${hasilBibit.totalPendapatanMerah.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-green-950/20 rounded-xl border border-green-900/30 shadow-inner">
                        <span className="text-green-500 font-bold text-xs uppercase tracking-wider">Uang Putih (Post-Wash)</span><span className="text-green-500 font-black tracking-wide text-lg">+ ${hasilBibit.totalPendapatanPutih.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 px-3">
                        <span className="text-zinc-500">Cost Bibit</span><span className="text-red-500">- ${hasilBibit.totalBiayaBibit.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-zinc-800/80">
                      <div className="bg-blue-950/20 border border-blue-900/30 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-800/50 transition-colors">
                        <div className="absolute top-0 right-0 bg-blue-900/30 px-3 py-1 rounded-bl-xl text-[10px] font-black text-blue-400 tracking-widest">KANTOR</div>
                        <div className="flex justify-between items-center mb-1 mt-3 text-[10px] font-bold text-zinc-400 uppercase">
                          <span>Cost Baggy</span><span className="text-red-500">- ${hasilBibit.totalBiayaBaggyKantor.toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-400 mb-1 mt-1 uppercase tracking-wider">Profit Putih</p>
                        <span className="text-3xl font-black text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]">${hasilBibit.profitKantor.toLocaleString()}</span>
                      </div>
                      <div className="bg-purple-950/20 border border-purple-900/30 p-6 rounded-2xl relative overflow-hidden hover:border-purple-800/50 transition-colors">
                        <div className="absolute top-0 right-0 bg-purple-900/30 px-3 py-1 rounded-bl-xl text-[10px] font-black text-purple-400 tracking-widest">KALENG</div>
                        <div className="flex justify-between items-center mb-1 mt-3 text-[10px] font-bold text-zinc-400 uppercase">
                          <span>Cost Baggy</span><span className="text-red-500">- ${hasilBibit.totalBiayaBaggyKaleng.toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-bold text-zinc-400 mb-1 mt-1 uppercase tracking-wider">Profit Putih</p>
                        <span className="text-3xl font-black text-purple-500 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">${hasilBibit.profitKaleng.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- TAB 4: ADMIN PANEL --- */}
        {activeTab === 'admin' && isAdmin && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 relative z-10">
             
             <div className="bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-6 md:p-8 mb-10 shadow-2xl relative overflow-hidden">
               <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none"></div>
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-8 border-b border-zinc-800/80 pb-6 relative z-10">
                 <div>
                   <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
                     <TrendingUp className="text-green-500" size={32} /> Intel Keuangan
                   </h3>
                   <p className="text-sm text-zinc-400 mt-2 font-medium">Laporan omset dan kalkulasi profit global.</p>
                 </div>
                 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                   <select value={financeVendor} onChange={(e) => setFinanceVendor(e.target.value)}
                     className="bg-black/60 text-sm text-white px-5 py-4 rounded-2xl border border-zinc-800 outline-none focus:border-red-600 cursor-pointer shadow-inner">
                     <option value="">Semua Teritori (Global)</option>
                     {[...new Set(allVendorData.map(v => v.namaVendor))].filter(n => n !== "").map((v, i) => <option key={i} value={v}>{v}</option>)}
                   </select>
                   <button onClick={exportToCSV} className="bg-white text-black hover:bg-zinc-200 px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-95">
                     <Download size={18} /> <span className="hidden sm:inline">Export CSV</span>
                   </button>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                 <div className="bg-black/40 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-center shadow-inner hover:border-zinc-700 transition-colors">
                   <p className="text-xs font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-widest"><Wallet size={16} className="text-blue-500"/> Omset Kotor</p>
                   <p className="text-4xl font-black text-white">${financeStats.omset.toLocaleString()}</p>
                 </div>
                 <div className="bg-black/40 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-center shadow-inner hover:border-zinc-700 transition-colors">
                   <p className="text-xs font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-widest"><CreditCard size={16} className="text-red-500"/> Modal Vendor</p>
                   <p className="text-4xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.2)]">${financeStats.modal.toLocaleString()}</p>
                 </div>
                 <div className="bg-green-950/20 border border-green-900/30 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-center shadow-inner hover:border-green-800/50 transition-colors">
                   <p className="text-xs font-bold text-green-500 mb-3 flex items-center gap-2 uppercase tracking-widest z-10"><DollarSign size={16}/> Profit Organisasi</p>
                   <p className="text-5xl font-black text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)] z-10">${financeStats.profit.toLocaleString()}</p>
                   <TrendingUp size={120} className="absolute -right-8 -bottom-8 text-green-500/10 z-0 rotate-[-10deg]"/>
                 </div>
               </div>
             </div>

             <div className="mb-8 flex items-center gap-4">
                <div className="p-3 bg-red-950/40 rounded-2xl border border-red-900/50 text-red-600"><Shield size={28} /></div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">Manajemen Teritori</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...new Set(allVendorData.map(v => v.namaVendor))].filter(n => n !== "").map((vName) => {
                const vInfo = allVendorData.find(v => v.namaVendor === vName);
                const isOpen = vInfo?.statusOpen === "YES";
                const itemsRekap = getRekapVendor(vName);
                
                return (
                  <div key={vName} className={`p-6 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:shadow-2xl ${isOpen ? 'border-green-900/40 bg-green-950/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight">{vName}</h3>
                        <div className="flex items-center gap-2 mt-2">
                           <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isOpen ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-600 shadow-[0_0_8px_#dc2626]'}`}></span>
                           <span className="text-[10px] font-black tracking-widest uppercase text-zinc-400">{isOpen ? "Operasional" : "Ditutup"}</span>
                        </div>
                      </div>
                      <button disabled={loading} onClick={() => toggleVendorStatus(vName, vInfo.statusOpen)} 
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95 ${isOpen ? 'bg-black border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'bg-red-600 border-red-500 text-white hover:bg-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]'}`}>
                        {isOpen ? "Tutup" : "Buka"}
                      </button>
                    </div>

                    <div className="bg-black/50 rounded-2xl p-4 mb-6 space-y-3 border border-zinc-800 max-h-48 overflow-y-auto scrollbar-thin shadow-inner">
                      {allVendorData.filter(v => v.namaVendor === vName).map(item => {
                        const sisa = getSisaKuota(vName, item.namaBarang);
                        const dipesan = itemsRekap.find(r => r[0] === item.namaBarang)?.[1] || 0;
                        return (
                          <div key={item.namaBarang} className="flex justify-between items-center text-sm border-b border-zinc-800/80 last:border-0 pb-3 last:pb-0">
                            <span className="font-bold text-zinc-200">{item.namaBarang}</span> 
                            <div className="flex items-center gap-2 text-[10px] shrink-0 font-black tracking-wider">
                              <span className="text-amber-500 bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-900/50">PO: {dipesan}</span>
                              <span className="text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-md border border-zinc-800">Sisa: {sisa}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <AdminButton icon={<Bell size={14}/>} color="indigo" onClick={() => sendDiscordAnnouncement(isOpen ? "OPEN" : "CLOSED", vName)} disabled={loading}>
                        Notif
                      </AdminButton>
                      <AdminButton icon={<Package size={14}/>} color="green" onClick={() => requestMarkAllArrived(vName)} disabled={loading}>
                        Ready
                      </AdminButton>
                      <AdminButton icon={<Copy size={14}/>} color="slate" onClick={() => {
                        const text = itemsRekap.map(([n, q]) => `• ${n} (x${q})`).join("\n");
                        navigator.clipboard.writeText(`REKAP ${vName}:\n${text}`);
                        toast.success("List Rekap disalin ke Clipboard!");
                      }}>
                        Copy
                      </AdminButton>
                      <AdminButton icon={<Archive size={14}/>} color="red" onClick={() => requestArchive(vName)} disabled={loading}>
                        Arsip
                      </AdminButton>
                    </div>
                  </div>
                );
              })}
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Komponen Pendukung UI (Micro-interactions & Modern Style) ---
function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick}
      className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-2.5 py-2 px-3 md:px-5 md:py-2.5 rounded-full transition-all duration-300 relative group overflow-hidden ${active ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] scale-100' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/80 scale-95 hover:scale-100'}`}>
      {icon}
      <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">{label}</span>
      {badge > 0 && (
        <span className={`absolute top-0.5 right-1 md:static text-[9px] md:text-xs font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white text-red-600 shadow-sm' : 'bg-red-600 text-white'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function OrderCard({ order, isAdmin, loading, onUpdate, onCancel }) {
  const orderItems = order.Nama_Barang ? order.Nama_Barang.split(", ") : [];
  
  return (
    <div className="bg-black/40 backdrop-blur-md p-5 rounded-3xl border border-zinc-800 shadow-lg relative overflow-hidden group hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="font-black text-white text-lg md:text-xl tracking-tight uppercase">{order.Nama_Pemesan}</h3>
          <p className="text-xs text-zinc-500 mt-1 font-bold flex items-center gap-1.5 tracking-wider">
             <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>{order.Tanggal}
          </p>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="text-[9px] font-black tracking-widest text-zinc-300 uppercase bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 shadow-sm">
            {order.Nama_Vendor}
          </span>
          <p className="font-black text-amber-500 text-lg md:text-2xl mt-2 drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">${Number(order.Subtotal || 0).toLocaleString()}</p>
        </div>
      </div>
      
      {/* Item Chips */}
      <div className="flex flex-wrap gap-2 mb-6 relative z-10">
         {orderItems.map((item, idx) => (
            <span key={idx} className="bg-zinc-900 text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-800 shadow-inner flex items-center gap-2">
               <Package size={12} className="text-zinc-500" /> {item}
            </span>
         ))}
      </div>

      <div className="flex flex-wrap gap-2 md:gap-3 relative z-10">
        <StatusBadge label="Bayar" value={order.Status_Bayar} activeColor="bg-green-950/30 text-green-500 border-green-900/50" activeValue="LUNAS" glowColor="#22c55e" isAdmin={isAdmin} loading={loading} onClick={() => onUpdate(order.id, "Status_Bayar", order.Status_Bayar === "LUNAS" ? "BELUM" : "LUNAS")} />
        <StatusBadge label="Status" value={order.Status_Pesanan} activeColor="bg-amber-950/30 text-amber-500 border-amber-900/50" activeValue="READY" glowColor="#f59e0b" isAdmin={isAdmin} loading={loading} onClick={() => onUpdate(order.id, "Status_Pesanan", order.Status_Pesanan === "READY" ? "PROSES" : "READY")} />
        <StatusBadge label="Ambil" value={order.Status_Ambil} activeColor="bg-blue-950/30 text-blue-500 border-blue-900/50" activeValue="SUDAH" glowColor="#3b82f6" isAdmin={isAdmin} loading={loading} onClick={() => onUpdate(order.id, "Status_Ambil", order.Status_Ambil === "SUDAH" ? "BELUM" : "SUDAH")} />
      </div>

      {isAdmin && (
        <button disabled={loading} onClick={() => onCancel(order.id, order.Nama_Pemesan)} 
          className="w-full mt-4 bg-transparent border border-red-900/30 text-red-600 hover:bg-red-600 hover:text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-50 relative z-10 active:scale-[0.98]">
          Hapus Permanen
        </button>
      )}
    </div>
  );
}

function StatusBadge({ label, value, activeColor, activeValue, glowColor, isAdmin, loading, onClick }) {
  const isActive = value === activeValue;
  const baseClass = `flex-1 min-w-[90px] flex flex-col items-center justify-center py-2 px-2 rounded-xl border transition-all duration-300 relative overflow-hidden ${isAdmin && !loading ? 'cursor-pointer hover:shadow-md active:scale-95' : ''}`;
  
  const dotColor = isActive ? glowColor : '#dc2626';
  const dotShadow = `0 0 8px ${dotColor}`;
  
  return (
    <button type="button" disabled={!isAdmin || loading} onClick={onClick}
      className={`${baseClass} ${isActive ? activeColor : 'bg-black text-zinc-500 border-zinc-800 hover:bg-zinc-900'}`}
      style={isActive && isAdmin && !loading ? { boxShadow: `0 0 15px ${glowColor}22` } : {}}>
      <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</span>
      <div className="flex items-center gap-1.5 font-black text-xs md:text-sm">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: dotColor, boxShadow: dotShadow }}></span>
        <span className={isActive ? "" : "text-zinc-400"}>{value || "BELUM"}</span>
      </div>
    </button>
  );
}

function AdminButton({ icon, children, color, onClick, disabled }) {
  const colorMap = {
    indigo: 'bg-indigo-950/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border-indigo-900/40 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)]',
    green: 'bg-green-950/20 text-green-500 hover:bg-green-600 hover:text-white border-green-900/40 hover:shadow-[0_0_15px_rgba(22,163,74,0.4)]',
    slate: 'bg-zinc-900 text-zinc-300 hover:bg-white hover:text-black border-zinc-800 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]',
    red: 'bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white border-red-900/40 hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]',
  };
  
  return (
    <button disabled={disabled} onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:grayscale ${colorMap[color]}`}>
      {icon} {children}
    </button>
  );
}