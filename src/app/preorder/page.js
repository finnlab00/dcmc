"use client";

import React, { useState, useEffect } from "react";
// Jika menggunakan Next.js, pastikan baris ini di-uncomment:
import { useRouter } from "next/navigation"; 
import { ShoppingCart, Package, ClipboardList, Shield, Check, X, Search, Bell, Archive, Copy, Lock, Calculator, Wallet, CreditCard, TrendingUp, DollarSign, Download, ChevronLeft, ChevronRight, Loader2, User } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function PreOrderPage() {
  // State Data
  const [allVendorData, setAllVendorData] = useState([]);
  const [daftarVendorUnik, setDaftarVendorUnik] = useState([]);
  const [barangTersedia, setBarangTersedia] = useState([]);
  const [orderList, setOrderList] = useState([]);
  
  // State Form & Cart
  const [namaPemesan, setNamaPemesan] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedBarang, setSelectedBarang] = useState(null);
  const [jumlah, setJumlah] = useState("");
  const [keranjang, setKeranjang] = useState([]);
  
  // State Filter, UI & Tab
  const [filterBelumAmbil, setFilterBelumAmbil] = useState(false);
  const [filterVendor, setFilterVendor] = useState("");
  const [searchNama, setSearchNama] = useState(""); 
  const [activeTab, setActiveTab] = useState("order");
  
  // State Kalkulator Umer
  const [inputUmer, setInputUmer] = useState("");

  // State Dashboard Keuangan & Pagination
  const [financeVendor, setFinanceVendor] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // State Auth, Loading, & Custom Modal
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false); 
  const [isChecking, setIsChecking] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  
  const router = useRouter(); 

  // ==========================================
  // URL API & WEBHOOK
  // ==========================================
  const GAS_URL = "https://script.google.com/macros/s/AKfycbw-HfseHVrbFqUKdvM-1oxfQ1N3gCB-a-5M2Nvs-aQL7nVMe4bKDkGJ3yJILGLR7gGE/exec"; 
  const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1522683134620205160/lxJSiUlPFQ_9J24uZ6BwrrBJN4Ht3Y3H97ZXYAkWHJZVSF0TfjM6XzOhoWhS5WOa_8Ak";
  const WEBSITE_URL = "https://dcmc-sable.vercel.app/";

  // INIT & AUTH LOGIC (OPSI 1: 1 PINTU)
  useEffect(() => {
    const access = typeof window !== 'undefined' ? sessionStorage.getItem("access_granted") : null;
    const adminStatus = typeof window !== 'undefined' ? sessionStorage.getItem("is_admin") : null;
    
    if (access === "true") {
      setIsAuthorized(true);
      // Membaca status admin dari halaman login
      if (adminStatus === "true") {
        setIsAdmin(true);
      }
      refreshData();
    } else {
      setIsAuthorized(false);
      setIsChecking(false);
      router.replace("/");
    }
  }, [router]);

  // AUTO-REFRESH
  useEffect(() => {
    let interval;
    if (isAuthorized) {
      interval = setInterval(() => {
        refreshData(true); 
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [isAuthorized]);

  const refreshData = async (isSilent = false) => {
    try {
      const resV = await fetch(`${GAS_URL}?action=read&sheet=vendor`);
      const rawV = await resV.json();
      if (Array.isArray(rawV)) {
        const normalized = rawV.map(item => ({
          namaVendor: item.Nama_Vendor || "",
          namaBarang: item.Nama_Barang || "",
          hargaBarang: Number(item.Harga_Barang || item["# Harga_Barang"]) || 0,
          hargaModal: Number(item.Harga_Modal || item["# Harga_Modal"]) || 0,
          statusOpen: (String(item.Status_Open || "")).toUpperCase(),
          kuota: Number(item.Kuota) || 0
        }));
        setAllVendorData(normalized);
        const openVendors = normalized.filter(v => v.statusOpen === "YES");
        setDaftarVendorUnik([...new Set(openVendors.map(v => v.namaVendor))]);
      }
      
      const resO = await fetch(`${GAS_URL}?action=read&sheet=preOrder`);
      const rawO = await resO.json();
      if (Array.isArray(rawO)) {
        setOrderList(rawO.filter(o => o.Archived !== "YES").reverse());
      }
    } catch (err) { 
      if (!isSilent) toast.error("Gagal menyinkronkan data.");
    } finally {
      setIsChecking(false);
    }
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
      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "update", sheet: "vendor", condition: { Nama_Vendor: vName }, set: { Status_Open: nextStatus } })
      });
      toast.success(`Status ${vName} diubah menjadi ${nextStatus === "YES" ? "OPEN" : "CLOSED"}`);
      refreshData(true);
    } catch (err) { toast.error("Gagal mengubah status."); }
    setLoading(false);
  };

  // PENINGKATAN: All Arrived sekarang tembak Discord
  const requestMarkAllArrived = (vName) => {
    setConfirmDialog({
      isOpen: true,
      title: "Tandai Barang Tiba",
      message: `Tandai pesanan ${vName} menjadi READY sekaligus umumkan di Discord?`,
      onConfirm: async () => {
        const loadingToast = toast.loading(`Memperbarui & Announce ${vName}...`);
        setLoading(true);
        try {
          // 1. Update Database
          await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "update", sheet: "preOrder", condition: { Nama_Vendor: vName, Status_Pesanan: "PROSES" }, set: { Status_Pesanan: "READY" } })
          });
          
          refreshData(true);

          // 2. Announce ke Discord
          const message = {
            content: ` @everyone 📦 **BARANG TIBA!**`,
            embeds: [{
              title: `📦 PESANAN ${vName} SUDAH READY!`,
              description: `Semua pre-order untuk vendor **${vName}** telah tiba dan siap diambil.\n\nSilakan cek riwayat pesanan Anda di website.`,
              color: 3066993,
              timestamp: new Date()
            }]
          };
          await fetch(DISCORD_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(message) });
          
          toast.success("Barang tiba & Discord terkirim!", { id: loadingToast });
        } catch (err) { 
          toast.error("Gagal memproses data.", { id: loadingToast }); 
        }
        setLoading(false);
      }
    });
  };

  const requestArchive = (vName) => {
    setConfirmDialog({
      isOpen: true,
      title: "Arsipkan Vendor",
      message: `Yakin mengarsipkan SEMUA pesanan dari ${vName}? Data akan disembunyikan dari riwayat utama.`,
      onConfirm: async () => {
        const loadingToast = toast.loading(`Mengarsipkan ${vName}...`);
        setLoading(true);
        try {
          await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "update", sheet: "preOrder", condition: { Nama_Vendor: vName }, set: { Archived: "YES" } })
          });
          toast.success("PO berhasil diarsipkan.", { id: loadingToast });
          refreshData(true);
        } catch (err) { toast.error("Gagal mengarsipkan PO.", { id: loadingToast }); }
        setLoading(false);
      }
    });
  };

  // PENINGKATAN: Fix limit karakter Discord (Potong daftar panjang)
  const sendDiscordAnnouncement = async (type, vendorName) => {
    const isOpening = type === "OPEN";
    const vendorItems = allVendorData.filter(v => v.namaVendor === vendorName);
    
    const MAX_ITEMS = 12; // Batas aman agar tidak kena error 1024 char
    let itemsToShow = vendorItems.slice(0, MAX_ITEMS);
    
    let itemRows = itemsToShow.map(item => `🔹 **${item.namaBarang}** — \`$${Number(item.hargaBarang).toLocaleString()}\` *(Sisa: ${getSisaKuota(vendorName, item.namaBarang)})*`).join("\n");
    
    if (vendorItems.length > MAX_ITEMS) {
      const remaining = vendorItems.length - MAX_ITEMS;
      itemRows += `\n\n*...dan ${remaining} item lainnya. Cek selengkapnya di website!*`;
    }
    
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
          Nama_Pemesan: namaPemesan,
          Nama_Vendor: vendor,
          Nama_Barang: listBarangString,
          Jumlah: totalQty,
          Subtotal: totalBayar,
          Modal_Vendor: totalModalCheckout,
          Tanggal: new Date().toLocaleString("id-ID"),
          Status_Bayar: "BELUM",
          Status_Pesanan: "PROSES",
          Status_Ambil: "BELUM",
          Archived: "NO"
        };
      });

      await fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ action: "insert", sheet: "preOrder", data: dataToPost })
      });
      setKeranjang([]);
      setActiveTab("history"); 
      refreshData(true);
      toast.success("Checkout Berhasil! Pesanan diteruskan.", { id: loadingToast });
    } catch (err) { toast.error("Checkout Gagal. Coba lagi.", { id: loadingToast }); }
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
      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "update", sheet: "preOrder", condition: { Tanggal: tanggal, Nama_Pemesan: pemesan, Nama_Vendor: vendor }, set: { [field]: value } })
      });
      toast.success("Status berhasil diperbarui.");
    } catch (err) { 
      toast.error("Koneksi gagal, menyinkronkan ulang data...");
      refreshData(true); 
    }
  };

  const requestCancelOrder = (tanggal, pemesan, vendor) => {
    setConfirmDialog({
      isOpen: true,
      title: "Hapus Pesanan",
      message: `Yakin membatalkan pesanan untuk ${pemesan}? Data akan dihapus secara permanen.`,
      onConfirm: async () => {
        setOrderList(prevList => prevList.filter(o => !(o.Tanggal === tanggal && o.Nama_Pemesan === pemesan && o.Nama_Vendor === vendor)));
        try {
          await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: "delete", sheet: "preOrder", condition: { Tanggal: tanggal, Nama_Pemesan: pemesan, Nama_Vendor: vendor } })
          });
          toast.success("Pesanan berhasil dihapus.");
        } catch (err) {
          toast.error("Gagal menghapus pesanan.");
          refreshData(true);
        }
      }
    });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedVendor || !selectedBarang || !jumlah) return;

    const qtyNumber = parseInt(jumlah);
    if (qtyNumber <= 0) return;

    const sisaKuota = getSisaKuota(selectedVendor, selectedBarang.namaBarang);
    if (qtyNumber > sisaKuota) {
      toast.error(`Sisa kuota untuk ${selectedBarang.namaBarang} hanya ${sisaKuota}.`);
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
    toast.success("Berhasil ditambahkan ke keranjang!");
    setJumlah("");
  };

  const exportToCSV = () => {
    const headers = "Tanggal,Nama Pemesan,Vendor,Barang,Total Qty,Subtotal (Omset),Total Modal,Status Bayar,Status Pesanan,Status Ambil\n";
    const rows = orderList.map(o => {
      let modalData = Number(o.Modal_Vendor);
      if (isNaN(modalData) || o.Modal_Vendor === undefined || o.Modal_Vendor === "") {
         modalData = 0;
         if (o.Nama_Barang) {
            const items = o.Nama_Barang.split(", ");
            items.forEach(itemStr => {
              const match = itemStr.match(/(.+) \((\d+)\)/);
              if (match) {
                const bName = match[1];
                const bQty = parseInt(match[2]);
                const vendorItem = allVendorData.find(v => v.namaVendor === o.Nama_Vendor && v.namaBarang === bName);
                modalData += (vendorItem ? vendorItem.hargaModal * bQty : 0);
              }
            });
         }
      }
      return `"${o.Tanggal}","${o.Nama_Pemesan}","${o.Nama_Vendor}","${o.Nama_Barang}",${o.Jumlah},${o.Subtotal},${modalData},${o.Status_Bayar},${o.Status_Pesanan},${o.Status_Ambil}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_DCMC_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Laporan CSV berhasil diunduh!");
  };

  const hitungUmer = () => {
    const awal = Number(inputUmer) || 0;
    const pot10 = awal * 0.10;
    const sisaSetelah10 = awal - pot10;
    const pot15 = sisaSetelah10 * 0.15;
    const hasilMurni = sisaSetelah10 - pot15;
    const jumlahKartu = Math.ceil(awal / 50000);
    const totalBiayaKartu = jumlahKartu * 200;
    const hasilDenganKartu = Math.max(0, hasilMurni - totalBiayaKartu);
    return { awal, pot10, sisaSetelah10, pot15, hasilMurni, jumlahKartu, totalBiayaKartu, hasilDenganKartu };
  };
  const hasilUmer = hitungUmer();

  const hitungDashboardKeuangan = () => {
    let totalOmset = 0;
    let totalModal = 0;
    const filteredOrders = financeVendor ? orderList.filter(o => o.Nama_Vendor === financeVendor) : orderList;

    filteredOrders.forEach(order => {
      totalOmset += Number(order.Subtotal) || 0;
      
      if (order.Modal_Vendor !== undefined && order.Modal_Vendor !== "") {
        totalModal += Number(order.Modal_Vendor) || 0;
      } else {
        if (order.Nama_Barang && order.Nama_Vendor) {
          const items = order.Nama_Barang.split(", ");
          items.forEach(itemStr => {
            const match = itemStr.match(/(.+) \((\d+)\)/);
            if (match) {
              const bName = match[1];
              const bQty = parseInt(match[2]);
              const vendorItem = allVendorData.find(v => v.namaVendor === order.Nama_Vendor && v.namaBarang === bName);
              const modalPrice = vendorItem ? vendorItem.hargaModal : 0;
              totalModal += (modalPrice * bQty);
            }
          });
        }
      }
    });

    return { omset: totalOmset, modal: totalModal, profit: totalOmset - totalModal };
  };
  const financeStats = hitungDashboardKeuangan();

  const filteredOrders = orderList.filter(o => {
    const isBelumAmbil = filterBelumAmbil ? o.Status_Ambil !== "SUDAH" : true;
    const isVendorMatch = filterVendor ? o.Nama_Vendor === filterVendor : true;
    const isNamaMatch = searchNama ? (o.Nama_Pemesan || "").toLowerCase().includes(searchNama.toLowerCase()) : true;
    return isBelumAmbil && isVendorMatch && isNamaMatch;
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const sisaKuotaTerpilih = selectedBarang ? getSisaKuota(selectedVendor, selectedBarang.namaBarang) : 0;

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 size={48} className="text-red-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold tracking-widest animate-pulse">MENYINKRONKAN DATA...</h2>
      </div>
    );
  }

  // TAMPILAN JIKA BELUM LOGIN
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 p-6 text-center">
        <Lock size={64} className="text-red-500 mb-6 opacity-80" />
        <h2 className="text-2xl font-black italic text-white mb-2">AKSES DITOLAK</h2>
        <p className="text-slate-400 mb-8 max-w-sm">Anda harus login dari halaman utama untuk masuk ke halaman ini.</p>
        <button 
          onClick={() => window.location.href = "/"} 
          className="bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-bold transition-colors"
        >
          Kembali ke Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20 md:pb-6 selection:bg-red-500/30">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '12px', border: '1px solid #334155' } }} />
      
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-white mb-2">{confirmDialog.title}</h3>
            <p className="text-slate-400 text-sm mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog({isOpen: false})} className="flex-1 bg-slate-800 text-slate-300 py-2.5 rounded-xl font-bold hover:bg-slate-700 transition-colors">Batal</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({isOpen: false}); }} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-500 transition-colors">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER (Tombol Ganti Mode Dihapus, diganti Label Status) */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-sm">
        <h1 className="text-xl md:text-2xl font-black text-red-500 italic tracking-tight">
          DCMC HUB
        </h1>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isAdmin ? 'bg-red-600/20 text-red-500 border border-red-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
          {isAdmin ? <Shield size={14} /> : <User size={14} />}
          <span className="hidden sm:inline">{isAdmin ? "Admin Active" : "Member Active"}</span>
        </div>
      </header>

      {/* MOBILE TAB NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-40 md:static md:bg-transparent md:border-none md:max-w-5xl md:mx-auto md:mt-6 px-2 md:px-0">
        <div className="flex justify-around md:justify-start md:gap-2 p-2">
          <TabButton active={activeTab === 'order'} onClick={() => setActiveTab('order')} icon={<Package />} label="Pesan" badge={keranjang.length} />
          <TabButton active={activeTab === 'history'} onClick={() => {setActiveTab('history'); setCurrentPage(1);}} icon={<ClipboardList />} label="Riwayat" />
          <TabButton active={activeTab === 'kalkulator'} onClick={() => setActiveTab('kalkulator')} icon={<Calculator />} label="Kalkulator" />
          {isAdmin && (
            <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Shield />} label="Admin" />
          )}
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-6xl mx-auto p-4 mt-2">
        
        {/* --- TAB 1: FORM ORDER + CART --- */}
        {activeTab === 'order' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300 items-start">
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 md:p-8 rounded-2xl shadow-xl">
              <div className="mb-6 border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Package className="text-red-500" size={20} /> Buat Pesanan Baru
                </h2>
                <p className="text-sm text-slate-400 mt-1">Pilih vendor dan barang yang ingin Anda pre-order.</p>
              </div>

              <form onSubmit={handleAddToCart} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Nama Pemesan</label>
                  <input 
                    type="text" required placeholder="Masukkan nama Anda (Contoh: Budi)" 
                    className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all" 
                    value={namaPemesan} onChange={(e) => setNamaPemesan(e.target.value)} 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Vendor PO</label>
                    <select required 
                      className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all appearance-none" 
                      value={selectedVendor} 
                      onChange={(e) => { 
                        setSelectedVendor(e.target.value); 
                        setBarangTersedia(allVendorData.filter(v => v.namaVendor === e.target.value));
                        setSelectedBarang(null); 
                      }}
                    >
                      <option value="" disabled>-- Pilih Vendor --</option>
                      {daftarVendorUnik.map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Item Barang</label>
                    <select required 
                      className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all appearance-none" 
                      value={selectedBarang?.namaBarang || ""} 
                      disabled={!selectedVendor}
                      onChange={(e) => setSelectedBarang(barangTersedia.find(b => b.namaBarang === e.target.value))}>
                      <option value="" disabled>-- Pilih Item --</option>
                      {barangTersedia.map((b, i) => {
                        const sisa = getSisaKuota(selectedVendor, b.namaBarang);
                        const isHabis = sisa <= 0;
                        return (
                          <option key={i} value={b.namaBarang} disabled={isHabis}>
                            {b.namaBarang} {isHabis ? "(HABIS)" : `(Sisa: ${sisa})`}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Jumlah (Qty)</label>
                  <div className="flex gap-4 items-center">
                    <input 
                      type="number" required placeholder="0" 
                      value={jumlah} min="1" max={sisaKuotaTerpilih > 0 ? sisaKuotaTerpilih : 1} 
                      className="w-24 p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-red-500 outline-none disabled:opacity-50 text-center text-lg font-bold" 
                      onChange={(e) => setJumlah(e.target.value)} 
                      disabled={!selectedBarang || sisaKuotaTerpilih <= 0}
                    />
                    {selectedBarang && (
                      <div className="text-sm">
                        <span className="text-slate-400 block">Harga Satuan:</span>
                        <span className="font-bold text-green-400">${selectedBarang.hargaBarang.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  disabled={!selectedBarang || sisaKuotaTerpilih <= 0} type="submit" 
                  className="w-full bg-slate-800 text-white p-4 rounded-xl font-bold text-lg hover:bg-slate-700 border border-slate-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:bg-slate-900 mt-4 flex justify-center items-center gap-2"
                >
                  <ShoppingCart size={20} />
                  {sisaKuotaTerpilih <= 0 && selectedBarang ? "Stok Habis" : "Tambah ke Keranjang"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-2xl shadow-xl flex flex-col sticky top-20">
              <div className="mb-4 flex justify-between items-end border-b border-slate-800 pb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                  <ShoppingCart className="text-red-500" size={20} /> Keranjang
                </h2>
                <span className="text-sm text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">{keranjang.length} Item</span>
              </div>

              {keranjang.length === 0 ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Belum ada barang dipilih.</p>
                </div>
              ) : (
                <div className="flex flex-col flex-grow">
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 mb-6 scrollbar-thin">
                    {keranjang.map((item) => (
                      <div key={item.idTemp} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center shadow-sm">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{item.namaVendor}</span>
                          <p className="font-bold text-white mt-1 text-sm">{item.namaBarang}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Qty: {item.jumlah} <span className="mx-2">•</span> <span className="text-green-400 font-semibold">${item.subtotal.toLocaleString()}</span></p>
                        </div>
                        <button 
                          onClick={() => {
                            setKeranjang(keranjang.filter(i => i.idTemp !== item.idTemp));
                            toast.success("Barang dihapus dari keranjang.");
                          }} 
                          className="bg-red-500/10 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 mt-auto">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-slate-400 font-medium">Total Estimasi</span>
                      <span className="text-2xl font-black text-green-400">${keranjang.reduce((acc, curr) => acc + curr.subtotal, 0).toLocaleString()}</span>
                    </div>
                    <button 
                      disabled={loading} onClick={handleCheckout} 
                      className="w-full bg-red-600 text-white p-3.5 rounded-xl font-bold text-lg hover:bg-red-500 transition-all disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-red-900/20"
                    >
                      {loading ? <Loader2 size={20} className="animate-spin" /> : <><Check size={20} /> Checkout</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 2: HISTORY / ORDERS (WITH PAGINATION) --- */}
        {activeTab === 'history' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-lg font-bold min-w-fit">
                  <ClipboardList className="text-red-500" size={20} /> Riwayat Pesanan
                </div>
                
                <div className="flex flex-wrap lg:flex-nowrap gap-2 w-full lg:w-auto">
                  <div className="relative flex-grow lg:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input 
                      type="text"
                      placeholder="Cari nama..."
                      className="w-full bg-slate-950 text-sm text-slate-200 pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 outline-none focus:border-red-500 transition-colors"
                      value={searchNama}
                      onChange={(e) => { setSearchNama(e.target.value); setCurrentPage(1); }}
                    />
                  </div>

                  <div className="relative flex-grow lg:w-40">
                    <select 
                      className="w-full bg-slate-950 text-sm text-slate-200 px-3 py-2.5 rounded-lg border border-slate-700 outline-none focus:border-red-500 appearance-none cursor-pointer"
                      value={filterVendor}
                      onChange={(e) => { setFilterVendor(e.target.value); setCurrentPage(1); }}
                    >
                      <option value="">Semua Vendor</option>
                      {[...new Set(orderList.map(o => o.Nama_Vendor))].filter(v => v).map((v, i) => (
                        <option key={i} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => { setFilterBelumAmbil(!filterBelumAmbil); setCurrentPage(1); }} 
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${filterBelumAmbil ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-950 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                    >
                      {filterBelumAmbil ? "Tampil Semua" : "Belum Diambil"}
                    </button>
                    <button onClick={() => {toast.success("Menyinkronkan data..."); refreshData();}} className="px-4 py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-sm font-medium text-slate-300 transition-colors">
                      Refresh
                    </button>
                  </div>
                </div>
             </div>

             <div className="space-y-4 mb-6">
               {paginatedOrders.length === 0 ? (
                  <div className="text-center p-10 bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                    Tidak ada pesanan yang sesuai dengan filter.
                  </div>
               ) : (
                 paginatedOrders.map((order, idx) => (
                   <OrderCard 
                      key={idx} 
                      order={order} 
                      isAdmin={isAdmin} 
                      loading={loading}
                      onUpdate={updateOrderStatus}
                      onCancel={requestCancelOrder}
                   />
                 ))
               )}
             </div>

             {/* PAGINATION CONTROLS */}
             {totalPages > 1 && (
               <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800 mb-8">
                 <button 
                   disabled={currentPage === 1}
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   className="flex items-center gap-1 px-4 py-2 bg-slate-800 rounded-lg text-sm font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                 >
                   <ChevronLeft size={16} /> Prev
                 </button>
                 <span className="text-sm font-semibold text-slate-400">
                   Halaman {currentPage} dari {totalPages}
                 </span>
                 <button 
                   disabled={currentPage === totalPages}
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   className="flex items-center gap-1 px-4 py-2 bg-slate-800 rounded-lg text-sm font-bold text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
                 >
                   Next <ChevronRight size={16} />
                 </button>
               </div>
             )}
          </div>
        )}

        {/* --- TAB 3: KALKULATOR UMER --- */}
        {activeTab === 'kalkulator' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl mx-auto">
            <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl">
              <div className="mb-6 border-b border-slate-800 pb-4 text-center">
                <Calculator className="text-red-500 mx-auto mb-2" size={32} />
                <h2 className="text-xl font-bold text-white tracking-tight">Kalkulator Cuci Uang Merah</h2>
                <p className="text-sm text-slate-400 mt-1">Hitung estimasi uang putih yang didapat dari Umer.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Jumlah Umer (Uang Kotor)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                    <input 
                      type="number" 
                      placeholder="Contoh: 100000" 
                      className="w-full pl-9 pr-4 py-4 rounded-xl bg-slate-950 border border-slate-700 text-xl font-black text-red-400 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all" 
                      value={inputUmer} 
                      onChange={(e) => setInputUmer(e.target.value)} 
                    />
                  </div>
                </div>

                {hasilUmer.awal > 0 && (
                  <div className="bg-slate-950 rounded-xl p-5 border border-slate-800 space-y-5 animate-in fade-in slide-in-from-bottom-2">
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        <span className="text-slate-400">Total Umer</span>
                        <span className="font-bold text-white">${hasilUmer.awal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 px-3">
                        <span className="text-slate-500">Potongan 1 (10%)</span>
                        <span className="text-red-400 font-medium">- ${hasilUmer.pot10.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 px-3">
                        <span className="text-slate-500">Potongan 2 (15% dari sisa)</span>
                        <span className="text-red-400 font-medium">- ${hasilUmer.pot15.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="h-px bg-slate-800 w-full my-4"></div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-green-500/20 px-3 py-1 rounded-bl-lg text-[10px] font-bold text-green-400">TANPA KARTU</div>
                        <p className="text-xs font-semibold text-slate-400 mb-2 mt-2">Estimasi Uang Putih</p>
                        <span className="text-3xl font-black text-green-400 flex items-center gap-2">
                          ${hasilUmer.hasilMurni.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 bg-yellow-500/20 px-3 py-1 rounded-bl-lg text-[10px] font-bold text-yellow-500">DENGAN KARTU</div>
                        <div className="flex justify-between items-center mb-1 mt-2 text-xs">
                          <span className="text-slate-400">Biaya ({hasilUmer.jumlahKartu}x Kartu)</span>
                          <span className="text-red-400 font-medium">- ${hasilUmer.totalBiayaKartu.toLocaleString()}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-400 mb-1 mt-2">Estimasi Uang Putih</p>
                        <span className="text-3xl font-black text-yellow-400 flex items-center gap-2">
                          ${hasilUmer.hasilDenganKartu.toLocaleString()}
                        </span>
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
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
             
             {/* DASHBOARD KEUANGAN & CSV EXPORT */}
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-8 shadow-xl">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
                 <div>
                   <h3 className="text-lg font-bold text-white flex items-center gap-2">
                     <TrendingUp className="text-green-500" size={20} /> Dashboard Keuangan
                   </h3>
                   <p className="text-xs text-slate-400 mt-1">Ringkasan total tagihan dan estimasi profit.</p>
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                   <select 
                     className="bg-slate-950 text-sm text-slate-200 px-4 py-2.5 rounded-xl border border-slate-700 outline-none focus:border-red-500 appearance-none flex-grow sm:flex-none cursor-pointer"
                     value={financeVendor}
                     onChange={(e) => setFinanceVendor(e.target.value)}
                   >
                     <option value="">Semua Vendor (Global)</option>
                     {[...new Set(allVendorData.map(v => v.namaVendor))].filter(n => n !== "").map((v, i) => (
                       <option key={i} value={v}>{v}</option>
                     ))}
                   </select>
                   <button 
                     onClick={exportToCSV}
                     className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                   >
                     <Download size={16} /> <span className="hidden sm:inline">Export Laporan</span>
                   </button>
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                   <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5"><Wallet size={14} className="text-blue-400"/> Tagihan Member (Omset)</p>
                   <p className="text-2xl font-black text-white">${financeStats.omset.toLocaleString()}</p>
                 </div>
                 <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-center">
                   <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5"><CreditCard size={14} className="text-red-400"/> Bayar ke Vendor (Modal)</p>
                   <p className="text-2xl font-black text-red-400">${financeStats.modal.toLocaleString()}</p>
                 </div>
                 <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl relative overflow-hidden flex flex-col justify-center">
                   <p className="text-xs font-semibold text-green-500 mb-2 flex items-center gap-1.5"><DollarSign size={14}/> Profit Bersih Kantor</p>
                   <p className="text-2xl font-black text-green-400 relative z-10">${financeStats.profit.toLocaleString()}</p>
                   <div className="absolute -right-4 -bottom-4 text-green-500/10 z-0"><TrendingUp size={80}/></div>
                 </div>
               </div>
             </div>

             <div className="mb-6 flex items-center gap-2">
                <Shield className="text-red-500" size={24} />
                <h2 className="text-xl font-bold">Control Panel Admin</h2>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[...new Set(allVendorData.map(v => v.namaVendor))].filter(n => n !== "").map((vName) => {
                const vInfo = allVendorData.find(v => v.namaVendor === vName);
                const isOpen = vInfo?.statusOpen === "YES";
                const itemsRekap = getRekapVendor(vName);
                
                return (
                  <div key={vName} className={`p-5 rounded-2xl border transition-all ${isOpen ? 'border-green-500/30 bg-green-950/10' : 'border-slate-700 bg-slate-900'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-black text-white">{vName}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold mt-1 ${isOpen ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {isOpen ? "🟢 PO OPEN" : "🔴 PO CLOSED"}
                        </span>
                      </div>
                      <button 
                        disabled={loading} 
                        onClick={() => toggleVendorStatus(vName, vInfo.statusOpen)} 
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-semibold border border-slate-600 transition-colors"
                      >
                        {isOpen ? "Tutup PO" : "Buka PO"}
                      </button>
                    </div>

                    <div className="bg-slate-950/50 rounded-xl p-3 mb-4 space-y-2 border border-slate-800 max-h-40 overflow-y-auto scrollbar-thin">
                      {allVendorData.filter(v => v.namaVendor === vName).map(item => {
                        const sisa = getSisaKuota(vName, item.namaBarang);
                        const dipesan = itemsRekap.find(r => r[0] === item.namaBarang)?.[1] || 0;
                        return (
                          <div key={item.namaBarang} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                            <span className="font-medium pr-2">{item.namaBarang}</span> 
                            <div className="flex items-center gap-3 text-xs shrink-0">
                              <span className="text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">PO: {dipesan}</span>
                              <span className="text-slate-400">Sisa: {sisa}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <AdminButton icon={<Bell size={14}/>} color="indigo" onClick={() => sendDiscordAnnouncement(isOpen ? "OPEN" : "CLOSED", vName)} disabled={loading}>
                        Announce
                      </AdminButton>
                      <AdminButton icon={<Package size={14}/>} color="blue" onClick={() => requestMarkAllArrived(vName)} disabled={loading}>
                        All Arrived
                      </AdminButton>
                      <AdminButton icon={<Copy size={14}/>} color="slate" onClick={() => {
                        const text = itemsRekap.map(([n, q]) => `• ${n} (x${q})`).join("\n");
                        navigator.clipboard.writeText(`REKAP ${vName}:\n${text}`);
                        toast.success("List Rekap berhasil disalin!");
                      }}>
                        Copy List
                      </AdminButton>
                      <AdminButton icon={<Archive size={14}/>} color="red" onClick={() => requestArchive(vName)} disabled={loading}>
                        Archive PO
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

// --- Komponen Pendukung UI ---

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 md:flex-none flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 py-2 md:px-5 md:py-2.5 rounded-xl transition-all relative ${
        active ? 'text-red-500 bg-red-500/10 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
      }`}
    >
      {icon}
      <span className="text-[10px] md:text-sm">{label}</span>
      {badge > 0 && (
        <span className="absolute top-1 right-2 md:static md:top-auto md:right-auto bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}

function OrderCard({ order, isAdmin, loading, onUpdate, onCancel }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-white text-base">{order.Nama_Pemesan}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{order.Tanggal}</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
            {order.Nama_Vendor}
          </span>
          <p className="font-black text-green-400 mt-1">${Number(order.Subtotal || 0).toLocaleString()}</p>
        </div>
      </div>
      
      <div className="text-sm text-slate-300 mb-4 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
        {order.Nama_Barang}
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge 
          label="Bayar" value={order.Status_Bayar} 
          activeColor="bg-green-500/20 text-green-400 border-green-500/30" 
          activeValue="LUNAS"
          isAdmin={isAdmin} loading={loading}
          onClick={() => onUpdate(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor, "Status_Bayar", order.Status_Bayar === "LUNAS" ? "BELUM" : "LUNAS")}
        />
        <StatusBadge 
          label="Status" value={order.Status_Pesanan} 
          activeColor="bg-yellow-500/20 text-yellow-400 border-yellow-500/30" 
          activeValue="READY"
          isAdmin={isAdmin} loading={loading}
          onClick={() => onUpdate(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor, "Status_Pesanan", order.Status_Pesanan === "READY" ? "PROSES" : "READY")}
        />
        <StatusBadge 
          label="Ambil" value={order.Status_Ambil} 
          activeColor="bg-indigo-500/20 text-indigo-400 border-indigo-500/30" 
          activeValue="SUDAH"
          isAdmin={isAdmin} loading={loading}
          onClick={() => onUpdate(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor, "Status_Ambil", order.Status_Ambil === "SUDAH" ? "BELUM" : "SUDAH")}
        />
      </div>

      {isAdmin && (
        <button 
          disabled={loading} 
          onClick={() => onCancel(order.Tanggal, order.Nama_Pemesan, order.Nama_Vendor)} 
          className="w-full mt-3 bg-red-950/30 text-red-400 border border-red-900/30 hover:bg-red-900 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
        >
          HAPUS PESANAN
        </button>
      )}
    </div>
  );
}

function StatusBadge({ label, value, activeColor, activeValue, isAdmin, loading, onClick }) {
  const isActive = value === activeValue;
  const baseClass = `flex-1 min-w-[80px] flex flex-col items-center justify-center py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${isAdmin && !loading ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}`;
  const colorClass = isActive ? activeColor : 'bg-slate-800 text-slate-400 border-slate-700';
  
  return (
    <button 
      type="button"
      disabled={!isAdmin || loading}
      onClick={onClick}
      className={`${baseClass} ${colorClass}`}
    >
      <span className="text-[10px] font-medium opacity-70 mb-0.5">{label}</span>
      {value || "BELUM"}
    </button>
  );
}

function AdminButton({ icon, children, color, onClick, disabled }) {
  const colorMap = {
    indigo: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-indigo-500/20',
    blue: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20',
    slate: 'bg-slate-700 text-slate-200 hover:bg-slate-600 border-slate-600',
    red: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20',
  };
  
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${colorMap[color]}`}
    >
      {icon} {children}
    </button>
  );
}