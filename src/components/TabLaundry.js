import React, { useState, useEffect } from "react";
import { RefreshCcw, Lock, Clock, MapPin, BellRing, CheckCircle2, Archive, Key, Check, Plus, AlertCircle, XCircle, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function TabLaundry({ isAdmin, webhookUrl }) {
  const [queue, setQueue] = useState([]);
  const [settings, setSettings] = useState({ is_open: false, active_batch: "MENUNGGU INSTRUKSI", batch_number: 1, lokasi: "" });
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // State Form Member
  const [nama, setNama] = useState("");
  const [uangKotor, setUangKotor] = useState("");

  // State Admin Panel
  const [inputLokasi, setInputLokasi] = useState("");

  const MAKS_KUOTA = 8000000;

  const fetchData = async (isSilent = false) => {
    try {
      const [resSettings, resQueue] = await Promise.all([
        supabase.from('laundry_settings').select('*').eq('id', 1).single(),
        supabase.from('laundry_queue').select('*').eq('archived', false).order('created_at', { ascending: true })
      ]);
      if (resSettings.data) setSettings(resSettings.data);
      if (resQueue.data) setQueue(resQueue.data);
    } catch (err) {
      if (!isSilent) toast.error("Gagal sinkronisasi data.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    const initialLoad = setTimeout(() => fetchData(), 0);
    const interval = setInterval(() => fetchData(true), 10000); // Auto-refresh 10 detik
    return () => {
      clearTimeout(initialLoad);
      clearInterval(interval);
    };
  }, []);

  // FILTERING: Memisahkan "Hantu Penjaga Kamar" dari data asli
  const actualQueue = queue.filter(q => q.nama_pemesan !== "_SYSTEM_ROOM_");
  
  // Mendapatkan nama-nama kamar yang sedang aktif
  const uniqueBatches = [...new Set(queue.map(q => q.batch))].sort((a, b) => {
    if (a === 'WAITING LIST') return 1;
    if (b === 'WAITING LIST') return -1;
    return a.localeCompare(b);
  });

  // Kalkulasi Kuota (Hanya menghitung member asli di Pintu Depan)
  const activeQueue = actualQueue.filter(q => q.batch === settings.active_batch);
  const totalTerpakai = activeQueue.reduce((acc, curr) => acc + Number(curr.uang_kotor), 0);
  const sisaKuota = Math.max(0, MAKS_KUOTA - totalTerpakai);

  // Rumus Cuci
  const hitungBersih = (kotor) => {
    const pot10 = kotor * 0.10;
    const sisa1 = kotor - pot10;
    return sisa1 - (sisa1 * 0.15);
  };


  // ==========================================
  // 1. FUNGSI MEMBER (INPUT & SMART SPLIT)
  // ==========================================
  const handleSetor = async (e) => {
    e.preventDefault();
    const kotorInput = Number(uangKotor) || 0;
    if (!nama || kotorInput <= 0) return;
    if (!settings.is_open) { toast.error("Pintu depan ditutup!"); return; }

    setLoading(true);
    const loadingToast = toast.loading("Memasukkan ke brankas...");

    const masukSekarang = Math.min(kotorInput, sisaKuota);
    const masukNanti = kotorInput - masukSekarang; 

    try {
      if (masukSekarang > 0) {
        await supabase.from("laundry_queue").insert([{
          nama_pemesan: nama, uang_kotor: masukSekarang, uang_bersih: hitungBersih(masukSekarang), 
          status: "MENUNGGU", batch: settings.active_batch
        }]);
      }
      if (masukNanti > 0) {
        await supabase.from("laundry_queue").insert([{
          nama_pemesan: nama, uang_kotor: masukNanti, uang_bersih: hitungBersih(masukNanti), 
          status: "MENUNGGU", batch: "WAITING LIST"
        }]);
      }

      let msg = `📥 **${nama}** setor $${kotorInput.toLocaleString()} Umer.`;
      if (masukNanti > 0 && masukSekarang > 0) {
        msg += `\n*(Auto-Split: $${masukSekarang.toLocaleString()} ke ${settings.active_batch} | $${masukNanti.toLocaleString()} ke Waiting List)*`;
      } else if (masukNanti > 0 && masukSekarang === 0) {
        msg += `\n*(Penuh! Uang otomatis dialihkan $${masukNanti.toLocaleString()} ke WAITING LIST)*`;
      } else {
        msg += `\n*(Sisa Kuota ${settings.active_batch}: $${(sisaKuota - masukSekarang).toLocaleString()})*`;
      }

      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) });
      toast.success("Setoran berhasil diproses!", { id: loadingToast });
      setNama(""); setUangKotor(""); fetchData(true);
    } catch (err) { toast.error("Gagal menyetorkan uang.", { id: loadingToast }); }
    setLoading(false);
  };


  // ==========================================
  // 2. FUNGSI ADMIN (KONTROL KAMAR & DISCORD)
  // ==========================================
  const bukaKamarBaru = async () => {
    if (!inputLokasi) { toast.error("Ketik lokasi RP terlebih dahulu!"); return; }
    
    const namaKamarBaru = `MENCUCI KE ${inputLokasi.toUpperCase()}`;

    setLoading(true);
    try {
      await supabase.from("laundry_queue").insert([{
        nama_pemesan: "_SYSTEM_ROOM_", uang_kotor: 0, uang_bersih: 0, status: "SYSTEM", batch: namaKamarBaru
      }]);

      await supabase.from("laundry_queue").update({ batch: namaKamarBaru }).eq("batch", "WAITING LIST");
      
      await supabase.from("laundry_settings").update({ 
        is_open: true, active_batch: namaKamarBaru, batch_number: settings.batch_number + 1, lokasi: inputLokasi 
      }).eq("id", 1);
      
      const msg = `🟢 @everyone **PENCUCIAN DIBUKA!**\n📍 **Tujuan:** ${namaKamarBaru}\n*(Sistem telah menarik antrean dari Waiting List otomatis)*`;
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) });
      
      toast.success(`Kamar ${namaKamarBaru} Diciptakan!`);
      setInputLokasi(""); fetchData(true);
    } catch (err) { toast.error("Gagal membuat kamar."); }
    setLoading(false);
  };

  const tutupPintuDepan = async () => {
    setLoading(true);
    try {
      await supabase.from("laundry_settings").update({ is_open: false }).eq("id", 1);
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: `⛔ @everyone **PINTU DEPAN PABRIK DITUTUP.**\nSetoran baru dihentikan. Proses cuci di dalam tetap berlanjut.` }) });
      toast.success("Pintu depan dikunci."); fetchData(true);
    } catch (err) { toast.error("Gagal mengunci pintu."); }
    setLoading(false);
  };

  const aksiSelesaiKamar = async (targetBatch) => {
    if (!confirm(`Kirim rekap uang putih ${targetBatch} ke Discord?`)) return;
    setLoading(true);
    try {
      const orangDiKamar = actualQueue.filter(q => q.batch === targetBatch);
      let listHasil = orangDiKamar.map(o => `• **${o.nama_pemesan}** : $${Number(o.uang_bersih).toLocaleString()}`).join('\n');
      if (!listHasil) listHasil = "*(Tidak ada setoran di kamar ini)*";

      const msg = `✅ @everyone **${targetBatch} SELESAI!**\n\n**Rekap Uang Putih:**\n${listHasil}\n\n*Silakan temui Admin di lokasi untuk pengambilan.*`;
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) });
      
      await supabase.from("laundry_queue").update({ status: "SELESAI" }).eq("batch", targetBatch).neq("nama_pemesan", "_SYSTEM_ROOM_");
      
      toast.success(`Rekap ${targetBatch} terkirim!`); fetchData(true);
    } catch (err) { toast.error("Gagal mengirim rekap."); }
    setLoading(false);
  };

  const aksiHapusKamar = async (targetBatch) => {
    if (!confirm(`Tutup permanen dan hilangkan ${targetBatch} dari layar?`)) return;
    setLoading(true);
    try {
      await supabase.from("laundry_queue").update({ archived: true }).eq("batch", targetBatch);
      if (settings.active_batch === targetBatch) {
          await supabase.from("laundry_settings").update({ is_open: false }).eq("id", 1);
      }
      toast.success(`${targetBatch} dihapus dari layar.`); fetchData(true);
    } catch (err) { toast.error("Gagal menghapus kamar."); }
    setLoading(false);
  };

  // KARTU INTERAKTIF & EDIT DATA
  const handleKlikStatus = async (id, currentStatus) => {
    const alur = ["MENUNGGU", "DITERIMA", "PROSES", "SELESAI"];
    const nextStatus = alur[alur.indexOf(currentStatus) === alur.length - 1 ? 0 : alur.indexOf(currentStatus) + 1];
    try {
      setQueue(prev => prev.map(q => q.id === id ? { ...q, status: nextStatus } : q));
      await supabase.from("laundry_queue").update({ status: nextStatus }).eq("id", id);
      toast.success(`Status: ${nextStatus}`);
    } catch (err) { toast.error("Gagal mengubah status."); fetchData(true); }
  };

  const handleEditNominal = async (id, currentNominal) => {
    const input = window.prompt("Ubah nominal uang kotor:", currentNominal);
    if (input === null) return; // Batal
    
    const newNominal = Number(input);
    if (isNaN(newNominal) || newNominal <= 0) {
      toast.error("Angka tidak valid!");
      return;
    }

    setLoading(true);
    try {
      const newBersih = hitungBersih(newNominal);
      await supabase.from("laundry_queue").update({ uang_kotor: newNominal, uang_bersih: newBersih }).eq("id", id);
      toast.success("Nominal berhasil diperbarui!");
      fetchData(true);
    } catch (err) { toast.error("Gagal mengupdate data."); }
    setLoading(false);
  };

  const handleHapusAntrean = async (id, namaPemesan) => {
    if (!window.confirm(`Yakin ingin MEMBATALKAN dan MENGHAPUS setoran milik ${namaPemesan}?`)) return;
    setLoading(true);
    try {
      await supabase.from("laundry_queue").delete().eq("id", id);
      toast.success(`Antrean ${namaPemesan} dihapus.`);
      fetchData(true);
    } catch (err) { toast.error("Gagal menghapus antrean."); }
    setLoading(false);
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case "DITERIMA": return "bg-amber-950/50 text-amber-500 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
      case "PROSES": return "bg-blue-950/50 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
      case "SELESAI": return "bg-green-950/50 text-green-500 border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]";
      default: return "bg-zinc-900 text-zinc-400 border-zinc-700"; // MENUNGGU
    }
  };


  if (isFetching) return <div className="py-20 text-center text-zinc-500 animate-pulse font-black">Membuka Brankas Laundry...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      
      {/* ==================================================== */}
      {/* KOLOM KIRI: INFO KUOTA, FORM MEMBER, PANEL ADMIN */}
      {/* ==================================================== */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* INFO PINTU DEPAN */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-800">
             <div className="h-full bg-red-600 shadow-[0_0_15px_#dc2626] transition-all duration-1000" style={{ width: `${(totalTerpakai / MAKS_KUOTA) * 100}%` }}></div>
          </div>
          <div className="flex justify-between items-end mt-2">
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  Pintu Depan:
                  {settings.is_open ? <span className="bg-green-500/20 text-green-500 px-2 py-0.5 rounded-sm text-[8px] animate-pulse">BUKA</span> : <span className="bg-red-500/20 text-red-500 px-2 py-0.5 rounded-sm text-[8px]">TUTUP</span>}
              </p>
              {settings.is_open && <p className="text-xs font-bold text-indigo-400 mb-1">{settings.active_batch}</p>}
              <p className={`text-3xl font-black tracking-tight ${sisaKuota === 0 ? 'text-red-500' : 'text-white'}`}>
                ${sisaKuota.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Kapasitas</p>
              <p className="text-sm font-bold text-zinc-400">${MAKS_KUOTA.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* FORM SETOR MEMBER */}
        <div className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl transition-all duration-300">
          {!settings.is_open && (
             <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm rounded-3xl border border-zinc-800 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                 <div className="w-20 h-20 bg-red-950/40 border border-red-900/50 rounded-full flex items-center justify-center mb-4"><Lock className="text-red-500" size={32} /></div>
                 <h3 className="text-2xl font-black text-white mb-2 tracking-tight">PABRIK DITUTUP</h3>
                 <p className="text-sm font-bold text-zinc-400">Pintu depan saat ini sedang digembok.</p>
             </div>
          )}

          <div className="mb-8 flex items-center gap-4">
            <div className="p-3 bg-red-950/40 rounded-2xl text-red-500 border border-red-900/50">
              <RefreshCcw size={24} className={loading ? "animate-spin" : ""} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Setor Cucian</h2>
              <p className="text-xs text-zinc-400 mt-1 font-bold">Uang otomatis dipecah jika kuota limit.</p>
            </div>
          </div>

          <form onSubmit={handleSetor} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Callsign / Nama</label>
              <input type="text" required placeholder="Contoh: Budi" value={nama} onChange={(e) => setNama(e.target.value)} 
                className="w-full p-4 rounded-2xl bg-black/50 border border-zinc-800 text-white focus:border-red-600 outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Total Uang Merah</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600 font-black">$</span>
                <input type="number" required placeholder="0" value={uangKotor} onChange={(e) => setUangKotor(e.target.value)} 
                  className="w-full pl-10 pr-4 py-4 rounded-2xl bg-black/50 border border-zinc-800 text-xl font-black text-white focus:border-red-600 outline-none transition-all" />
              </div>
            </div>
            {Number(uangKotor) > sisaKuota && sisaKuota > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/40 p-4 rounded-2xl animate-in zoom-in-95">
                <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5"><AlertCircle size={14}/> Auto-Split Aktif</p>
                <p className="text-[10px] text-zinc-400 mt-1">Sisa $ {(Number(uangKotor) - sisaKuota).toLocaleString()} akan otomatis dimasukkan ke dalam <strong className="text-white">Waiting List</strong>.</p>
              </div>
            )}
            <button disabled={loading || !settings.is_open} type="submit" 
              className="w-full bg-red-600 text-white p-4 rounded-2xl font-black text-lg hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all active:scale-95 disabled:opacity-40">
              Kirim Setoran
            </button>
          </form>
        </div>

        {/* ==================================================== */}
        {/* PUSAT KENDALI PABRIK (KHUSUS ADMIN) */}
        {/* ==================================================== */}
        {isAdmin && (
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl shadow-2xl border-t-4 border-t-indigo-600/50">
            <h3 className="text-sm font-black text-white mb-5 flex items-center gap-2"><Key size={16} className="text-indigo-400"/> Pusat Kendali Pabrik</h3>
            
            <div className="space-y-4">
               {/* BLOK 1: PINTU DEPAN (BUKA KAMAR BARU & KUNCI) */}
               <div className="bg-black/50 border border-zinc-800 p-4 rounded-2xl space-y-3 shadow-inner">
                   <p className="text-[10px] font-black tracking-widest uppercase text-zinc-500">Pintu Utama (Bikin Kamar Baru)</p>
                   <div className="flex gap-2">
                       <input type="text" placeholder="Lokasi RP (Cth: Bank)" value={inputLokasi} onChange={e => setInputLokasi(e.target.value)}
                         className="flex-grow bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-3 rounded-xl outline-none focus:border-indigo-500" />
                       <button disabled={loading} onClick={bukaKamarBaru} 
                         className="bg-indigo-600 text-white px-4 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all active:scale-95 flex items-center gap-1 shrink-0">
                         <Plus size={14}/> Buka Kamar
                       </button>
                   </div>
                   
                   {settings.is_open && (
                     <button disabled={loading} onClick={tutupPintuDepan} 
                       className="w-full bg-red-950/20 border border-red-900/50 text-red-500 hover:bg-red-600 hover:text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex justify-center items-center gap-2">
                       <Lock size={12}/> Kunci Pintu Depan (Stop Setoran)
                     </button>
                   )}
               </div>

               {/* BLOK 2: KARTU-KARTU KAMAR YANG PERNAH DIBUKA */}
               <div className="space-y-3">
                  {uniqueBatches.filter(b => b !== 'WAITING LIST').map(batchName => (
                     <div key={batchName} className="bg-zinc-950/80 border border-zinc-700/80 p-4 rounded-2xl relative overflow-hidden group">
                         <div className={`absolute top-0 right-0 w-2 h-full ${batchName === settings.active_batch && settings.is_open ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                         
                         <div className="flex justify-between items-center mb-3">
                             <h4 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                                {batchName} 
                                {batchName === settings.active_batch && settings.is_open && <span className="text-[9px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-md uppercase tracking-widest">Pintu Utama Aktif</span>}
                             </h4>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => aksiSelesaiKamar(batchName)} className="flex items-center justify-center gap-1.5 bg-green-950/30 text-green-500 border border-green-900/50 hover:bg-green-600 hover:text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                               <CheckCircle2 size={12}/> Selesai & Rekap
                            </button>
                            <button onClick={() => aksiHapusKamar(batchName)} className="flex items-center justify-center gap-1.5 bg-transparent text-zinc-500 border border-zinc-800 hover:bg-red-950/50 hover:border-red-900/50 hover:text-red-500 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all">
                               <XCircle size={12}/> Tutup & Hapus
                            </button>
                         </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================== */}
      {/* KOLOM KANAN: PAPAN ANTREAN LIVE (DIKELOMPOKKAN) */}
      {/* ==================================================== */}
      <div className="lg:col-span-7 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col h-[calc(100vh-140px)] sticky top-28">
        <div className="mb-6 flex justify-between items-center border-b border-zinc-800/80 pb-5">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
             <Clock className="text-zinc-400" size={24} /> Papan Antrean Live
          </h2>
          {settings.is_open && <div className="text-[10px] font-bold text-indigo-400 animate-pulse hidden lg:block flex-grow text-center">📍 RP: {settings.lokasi}</div>}
          <span className="text-xs font-bold text-zinc-400 bg-black px-3 py-1.5 rounded-full border border-zinc-800">{actualQueue.length} Total</span>
        </div>

        {uniqueBatches.length === 0 ? (
          <div className="py-20 text-center text-zinc-600 flex flex-col items-center flex-grow justify-center">
            {settings.is_open ? <RefreshCcw size={64} className="mb-4 opacity-20" /> : <Lock size={64} className="mb-4 opacity-20" />}
            <p className="text-sm font-medium">{settings.is_open ? "Pabrik dibuka. Menunggu setoran..." : "Pabrik digembok. Tidak ada aktivitas."}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 flex-grow pb-4">
            
            {uniqueBatches.map(batchName => {
               const orangDiKamar = actualQueue.filter(q => q.batch === batchName);
               return (
                 <div key={batchName} className="space-y-3">
                    <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md py-2.5 px-4 rounded-xl border border-zinc-800 flex justify-between items-center shadow-lg">
                       <span className={`text-[11px] font-black uppercase tracking-widest ${batchName === 'WAITING LIST' ? 'text-amber-500' : 'text-indigo-400'}`}>{batchName}</span>
                       <span className="text-[10px] font-bold text-zinc-500">{orangDiKamar.length} Orang</span>
                    </div>

                    {orangDiKamar.length === 0 && batchName !== 'WAITING LIST' && (
                        <div className="text-center py-6 text-zinc-600 text-xs font-bold border border-zinc-800/50 rounded-2xl border-dashed">
                            Kosong. Belum ada setoran masuk ke kamar ini.
                        </div>
                    )}

                    {orangDiKamar.map((item) => (
                      <div key={item.id} className={`p-4 md:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 shadow-inner border ${item.status === 'SELESAI' ? 'bg-green-950/10 border-green-900/30' : batchName === 'WAITING LIST' ? 'bg-amber-950/5 border-amber-900/20' : 'bg-black/40 border-zinc-800/80 hover:border-zinc-700'}`}>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs text-zinc-500 font-bold">
                              {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-black text-white text-lg uppercase tracking-tight">{item.nama_pemesan}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm font-bold">
                             <span className="text-red-500 drop-shadow-[0_0_8px_rgba(220,38,38,0.2)]">${Number(item.uang_kotor).toLocaleString()}</span>
                             <span className="text-zinc-600">➔</span>
                             <span className="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.2)]">${Number(item.uang_bersih).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* ================================== */}
                        {/* UPDATE TOMBOL EDIT & HAPUS (ADMIN) */}
                        {/* ================================== */}
                        <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                           {isAdmin && batchName !== 'WAITING LIST' ? (
                               <>
                                   <button onClick={() => handleKlikStatus(item.id, item.status)} title="Klik untuk mengubah status uang"
                                     className={`w-28 sm:w-32 py-2.5 sm:py-3 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all active:scale-95 ${getStatusStyle(item.status)}`}>
                                     {item.status === "DITERIMA" && <Check size={12} className="inline mr-1 -mt-0.5"/>}
                                     {item.status}
                                   </button>
                                   <div className="flex gap-1.5">
                                      <button onClick={() => handleEditNominal(item.id, item.uang_kotor)} title="Edit Nominal (Jika member salah ketik)" 
                                        className="p-2 sm:p-2.5 bg-black text-zinc-500 border border-zinc-800 rounded-xl hover:text-blue-500 hover:bg-blue-950/30 hover:border-blue-900/50 transition-all flex justify-center items-center">
                                         <Edit2 size={14}/>
                                      </button>
                                      <button onClick={() => handleHapusAntrean(item.id, item.nama_pemesan)} title="Hapus Antrean Ini" 
                                        className="p-2 sm:p-2.5 bg-black text-zinc-500 border border-zinc-800 rounded-xl hover:text-red-500 hover:bg-red-950/30 hover:border-red-900/50 transition-all flex justify-center items-center">
                                         <Trash2 size={14}/>
                                      </button>
                                   </div>
                               </>
                           ) : (
                               <div className={`w-28 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase text-center border shadow-sm ${getStatusStyle(item.status)} pointer-events-none`}>
                                 {item.status}
                               </div>
                           )}
                        </div>

                      </div>
                    ))}
                 </div>
               )
            })}
          </div>
        )}
      </div>
    </div>
  );
}