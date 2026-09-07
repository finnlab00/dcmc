import React, { useState, useEffect } from "react";
import { RefreshCcw, Target, Pickaxe, CheckCircle2, XCircle, Clock, AlertCircle, Trash2, Coins, Play, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";

export default function TabMisi({ isAdmin, webhookUrl }) {
  const [missions, setMissions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  
  // State untuk Live Timer
  const [now, setNow] = useState(() => Date.now());

  // Form Buat Misi (Admin)
  const [formMisi, setFormMisi] = useState({ nama: "", target: "", harga: "", slot: "" });
  
  // Form Ambil Misi (Member)
  const [namaPekerja, setNamaPekerja] = useState("");

  const fetchData = async (isSilent = false) => {
    try {
      const [resMissions, resTasks] = await Promise.all([
        supabase.from('missions').select('*').order('created_at', { ascending: false }),
        supabase.from('mission_tasks').select('*').order('created_at', { ascending: true })
      ]);
      if (resMissions.data) setMissions(resMissions.data);
      if (resTasks.data) setTasks(resTasks.data);
    } catch (err) {
      if (!isSilent) toast.error("Gagal sinkronisasi data misi.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchData());
    // Auto refresh data dari Supabase tiap 10 detik
    const intervalData = setInterval(() => fetchData(true), 10000);
    // Detak jantung Live Timer setiap 1 detik
    const intervalTimer = setInterval(() => setNow(Date.now()), 1000);
    
    return () => {
      clearInterval(intervalData);
      clearInterval(intervalTimer);
    };
  }, []);

  // Helper Hitung Waktu
  const getElapsedTime = (startwaktu, endwaktu) => {
    const startTime = new Date(startwaktu).getTime();
    const endTime = endwaktu ? new Date(endwaktu).getTime() : now;
    const diffInSeconds = Math.floor((endTime - startTime) / 1000);
    
    if (diffInSeconds < 0) return "00:00:00";
    const h = Math.floor(diffInSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((diffInSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (diffInSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // ==========================================
  // 1. FUNGSI ADMIN
  // ==========================================
  const handleBuatMisi = async (e) => {
    e.preventDefault();
    if (!formMisi.nama || !formMisi.target || !formMisi.harga || !formMisi.slot) return;
    
    setLoading(true);
    try {
      await supabase.from("missions").insert([{
        nama_misi: formMisi.nama,
        target_pekerjaan: formMisi.target,
        harga_per_item: Number(formMisi.harga),
        total_slot: Number(formMisi.slot)
      }]);
      
      const msg = `📢 @everyone **LOWONGAN KERJA BARU!**\n**Misi:** ${formMisi.nama}\n**Kapasitas:** ${formMisi.slot} Pekerja\n**Upah:** $${Number(formMisi.harga).toLocaleString()} / ${formMisi.target}\n*Segera cek DCMC HUB untuk mengambil misi! https://dcmc-sable.vercel.app/*`;
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) });
      
      toast.success("Misi berhasil diterbitkan!");
      setFormMisi({ nama: "", target: "", harga: "", slot: "" });
      fetchData(true);
    } catch (err) { toast.error("Gagal membuat misi."); }
    setLoading(false);
  };

  const aksiHapusMisi = async (id, nama) => {
    if (!confirm(`Tutup permanen dan hapus misi "${nama}" beserta semua pekerja di dalamnya?`)) return;
    setLoading(true);
    try {
      await supabase.from("missions").delete().eq("id", id);
      toast.success("Misi dihapus."); fetchData(true);
    } catch (err) { toast.error("Gagal menghapus misi."); }
    setLoading(false);
  };

  const aksiValidasiGaji = async (task, missionName) => {
    if (!confirm(`Validasi barang sudah diterima dan cairkan $${Number(task.total_gaji).toLocaleString()} untuk ${task.nama_pekerja}?`)) return;
    setLoading(true);
    try {
      await supabase.from("mission_tasks").update({ status: 'SELESAI' }).eq("id", task.id);
      
      const durasi = getElapsedTime(task.created_at, task.waktu_selesai);
      const msg = `✅ **MISI SELESAI!**\n**Pekerja:** ${task.nama_pekerja}\n**Misi:** ${missionName}\n**Total Panen:** ${task.hasil_panen} Pcs\n**Durasi Kerja:** ${durasi}\n💵 **Gaji Diterima:** $${Number(task.total_gaji).toLocaleString()}`;
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) });
      
      toast.success("Gaji divalidasi!"); fetchData(true);
    } catch (err) { toast.error("Gagal memvalidasi."); }
    setLoading(false);
  };

  // ==========================================
  // 2. FUNGSI MEMBER
  // ==========================================
  const handleAmbilMisi = async (misiId) => {
    if (!namaPekerja) { toast.error("Ketik Callsign / Nama Anda di pojok kiri atas dulu!"); return; }
    
    // Cek apakah member ini sudah ngambil misi ini (Mencegah spam klik)
    const isAlreadyWorking = tasks.find(t => t.mission_id === misiId && t.nama_pekerja.toLowerCase() === namaPekerja.toLowerCase() && t.status !== 'SELESAI');
    if (isAlreadyWorking) { toast.error("Anda sedang/sudah mengerjakan misi ini!"); return; }

    // Cari detail misi yang sedang diambil
    const targetMisi = missions.find(m => m.id === misiId);

    // Hitung Sisa Slot 
    // (Total slot awal dikurangi jumlah pekerja saat ini, lalu dikurangi 1 lagi karena baru saja diambil)
    const pekerjaSaatIni = tasks.filter(t => t.mission_id === misiId).length;
    const sisaSlot = Math.max(0, targetMisi.total_slot - (pekerjaSaatIni + 1));

    setLoading(true);
    try {
      await supabase.from("mission_tasks").insert([{
        mission_id: misiId, nama_pekerja: namaPekerja, status: 'DIKERJAKAN'
      }]);

      // === LOGIKA PENGUMUMAN SISA KUOTA ===
      let msg = `👷 **MISI DIAMBIL!**\n**${namaPekerja}** baru saja mengambil dan mulai mengerjakan misi **${targetMisi.nama_misi}**.\n*Timer stopwatch telah berjalan!*`;
      
      if (sisaSlot > 0) {
          msg += `\n\n📌 **Sisa Kuota Misi:** Tersisa **${sisaSlot} Slot** lagi!`;
      } else {
          msg += `\n\n🚫 **KUOTA HABIS:** Misi ini sekarang sudah terisi penuh!`;
      }

      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) });

      toast.success("Misi berhasil diambil! Waktu mulai berjalan.");
      fetchData(true);
    } catch (err) { toast.error("Gagal mengambil misi."); }
    setLoading(false);
  };

  const handleSetorHasil = async (task, hargaPerItem) => {
    const input = window.prompt("Berapa banyak barang/weed yang berhasil Anda kumpulkan?");
    if (input === null) return;
    
    const hasilPanen = Number(input);
    if (isNaN(hasilPanen) || hasilPanen <= 0) { toast.error("Jumlah harus berupa angka yang valid!"); return; }

    setLoading(true);
    try {
      const totalGaji = hasilPanen * hargaPerItem;
      await supabase.from("mission_tasks").update({ 
        status: 'MENUNGGU_VALIDASI', 
        hasil_panen: hasilPanen,
        total_gaji: totalGaji,
        waktu_selesai: new Date().toISOString() // Waktu dihentikan
      }).eq("id", task.id);
      
      const msg = `🔔 **MENUNGGU VALIDASI**\n**${task.nama_pekerja}** telah menyetor ${hasilPanen} pcs barang dan menagih **$${totalGaji.toLocaleString()}**.\nAdmin harap merapat ke kota untuk pengecekan!`;
      await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg }) });
      
      toast.success("Berhasil lapor! Hubungi admin di kota."); fetchData(true);
    } catch (err) { toast.error("Gagal lapor misi."); }
    setLoading(false);
  };

  const handleBatalMisi = async (taskId) => {
    if (!confirm("Batal mengerjakan? Data waktu Anda akan dihapus dan slot akan kosong kembali.")) return;
    setLoading(true);
    try {
      await supabase.from("mission_tasks").delete().eq("id", taskId);
      toast.success("Misi dibatalkan."); fetchData(true);
    } catch (err) { toast.error("Gagal membatalkan misi."); }
    setLoading(false);
  };


  if (isFetching) return <div className="py-20 text-center text-zinc-500 animate-pulse font-black">Memuat Papan Bounty...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      
      {/* KOLOM KIRI: FORM PEKERJA & PANEL ADMIN */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* INPUT NAMA PEKERJA (KHUSUS MEMBER) */}
        {!isAdmin && (
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl shadow-2xl relative">
             <h2 className="text-xl font-black text-white tracking-tight mb-4 flex items-center gap-2"><Pickaxe className="text-zinc-400"/> Identitas Pekerja</h2>
             <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">Callsign Anda</label>
                <input type="text" placeholder="Contoh: Budi" value={namaPekerja} onChange={(e) => setNamaPekerja(e.target.value)} 
                  className="w-full p-4 rounded-2xl bg-black/50 border border-zinc-800 text-white focus:border-red-600 outline-none transition-all" />
             </div>
             <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">* Wajib diisi sebelum Anda bisa mengambil (Apply) misi di papan kanan.</p>
          </div>
        )}

        {/* PEMBUAT LOWONGAN MISI (KHUSUS ADMIN) */}
        {isAdmin && (
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-3xl shadow-2xl border-t-4 border-t-indigo-600/50">
            <h3 className="text-sm font-black text-white mb-5 flex items-center gap-2"><Target size={16} className="text-indigo-400"/> Buka Lowongan Misi</h3>
            
            <form onSubmit={handleBuatMisi} className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Judul Pekerjaan</label>
                 <input type="text" required placeholder="Cth: Panen & Bungkus Bibit" value={formMisi.nama} onChange={e => setFormMisi({...formMisi, nama: e.target.value})}
                   className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-3 rounded-xl outline-none focus:border-indigo-500" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Target Item (Satuan)</label>
                 <input type="text" required placeholder="Cth: Weed" value={formMisi.target} onChange={e => setFormMisi({...formMisi, target: e.target.value})}
                   className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-3 rounded-xl outline-none focus:border-indigo-500" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Harga / Item ($)</label>
                    <input type="number" required placeholder="Cth: 25" value={formMisi.harga} onChange={e => setFormMisi({...formMisi, harga: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-3 rounded-xl outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Kuota Pekerja</label>
                    <input type="number" required placeholder="Cth: 5" value={formMisi.slot} onChange={e => setFormMisi({...formMisi, slot: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs px-3 py-3 rounded-xl outline-none focus:border-indigo-500" />
                  </div>
               </div>
               <button disabled={loading} type="submit" 
                 className="w-full mt-2 bg-indigo-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2">
                 Publikasikan Lowongan
               </button>
            </form>
          </div>
        )}
      </div>

      {/* KOLOM KANAN: PAPAN LOWONGAN LIVE */}
      <div className="lg:col-span-8 bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col h-[calc(100vh-140px)] sticky top-28">
        <div className="mb-6 flex justify-between items-center border-b border-zinc-800/80 pb-5">
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
             <CheckSquare className="text-zinc-400" size={24} /> Bounty Board
          </h2>
        </div>

        {missions.length === 0 ? (
          <div className="py-20 text-center text-zinc-600 flex flex-col items-center flex-grow justify-center">
            <Target size={64} className="mb-4 opacity-20" />
            <p className="text-sm font-medium">Belum ada lowongan pekerjaan dibuka.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 flex-grow pb-4">
            
            {missions.map(misi => {
               // Ambil semua task/kartu pekerja yang terhubung dengan misi ini
               const misiTasks = tasks.filter(t => t.mission_id === misi.id);
               // Hitung slot yang terpakai
               const slotTerpakai = misiTasks.length;
               const isFull = slotTerpakai >= misi.total_slot;

               return (
                 <div key={misi.id} className="bg-black/40 border border-zinc-800 rounded-2xl overflow-hidden">
                    
                    {/* Header Papan Induk (Lowongan) */}
                    <div className="bg-zinc-950/80 p-5 border-b border-zinc-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4 relative">
                       {/* Indikator Penuh */}
                       {isFull && <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>}
                       
                       <div>
                         <h3 className="text-xl font-black text-white uppercase tracking-tight">{misi.nama_misi}</h3>
                         <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-bold">
                            <span className="text-green-500 bg-green-950/30 px-2 py-1 rounded-md border border-green-900/50 flex items-center gap-1"><Coins size={12}/> ${Number(misi.harga_per_item).toLocaleString()} / {misi.target_pekerjaan}</span>
                            <span className="text-zinc-400">|</span>
                            <span className={`${isFull ? 'text-red-500' : 'text-indigo-400'}`}>SISA SLOT: {misi.total_slot - slotTerpakai} / {misi.total_slot}</span>
                         </div>
                       </div>

                       <div className="flex gap-2">
                         {!isAdmin && !isFull && (
                            <button onClick={() => handleAmbilMisi(misi.id)} className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                              Ambil Misi
                            </button>
                         )}
                         {isAdmin && (
                            <button onClick={() => aksiHapusMisi(misi.id, misi.nama_misi)} title="Tutup Lowongan Ini" className="bg-transparent border border-zinc-700 text-zinc-500 hover:text-red-500 hover:bg-red-950/30 hover:border-red-900/50 px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all">
                              Tutup Misi
                            </button>
                         )}
                       </div>
                    </div>

                    {/* Daftar Kartu Pekerja (Orang-orang yang mengambil misi ini) */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950/40">
                       {misiTasks.length === 0 ? (
                          <div className="col-span-full py-4 text-center text-[11px] font-bold text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800 rounded-xl">
                            Belum ada pekerja yang mengambil misi ini
                          </div>
                       ) : (
                          misiTasks.map(task => (
                             <div key={task.id} className={`p-4 rounded-xl border flex flex-col justify-between transition-all shadow-inner ${task.status === 'DIKERJAKAN' ? 'bg-blue-950/10 border-blue-900/30' : task.status === 'MENUNGGU_VALIDASI' ? 'bg-amber-950/10 border-amber-900/30' : 'bg-green-950/5 border-green-900/20'}`}>
                                
                                <div className="flex justify-between items-start mb-3">
                                   <div>
                                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Pekerja Aktif</p>
                                      <p className="text-base font-black text-white uppercase">{task.nama_pekerja}</p>
                                   </div>
                                   <div className={`text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-md border ${task.status === 'DIKERJAKAN' ? 'text-blue-400 border-blue-900/50 bg-blue-950/30' : task.status === 'MENUNGGU_VALIDASI' ? 'text-amber-500 border-amber-900/50 bg-amber-950/30' : 'text-green-500 border-green-900/50 bg-green-950/30'}`}>
                                      {task.status.replace("_", " ")}
                                   </div>
                                </div>

                                {/* LIVE TIMER (Stopwatch) */}
                                <div className="bg-black/50 border border-zinc-800/80 rounded-lg p-3 mb-4 flex items-center justify-between">
                                   <div className="flex items-center gap-2">
                                      <Clock size={16} className={task.status === 'DIKERJAKAN' ? 'text-blue-500 animate-spin-slow' : 'text-zinc-500'} />
                                      <div>
                                         <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-0.5">Durasi Kerja</p>
                                         <p className={`text-xl font-black font-mono tracking-tighter drop-shadow-md ${task.status === 'DIKERJAKAN' ? 'text-blue-400' : 'text-white'}`}>
                                            {getElapsedTime(task.created_at, task.waktu_selesai)}
                                         </p>
                                      </div>
                                   </div>
                                   {/* Jika sudah lapor, munculkan hasil tagihan */}
                                   {task.status !== 'DIKERJAKAN' && (
                                      <div className="text-right">
                                         <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider mb-0.5">Tagihan Gaji</p>
                                         <p className="text-sm font-black text-green-500">+ ${Number(task.total_gaji).toLocaleString()}</p>
                                      </div>
                                   )}
                                </div>

                                {/* Tombol Interaksi (Member & Admin) */}
                                <div className="flex gap-2 mt-auto">
                                   {/* TOMBOL MEMBER */}
                                   {!isAdmin && task.status === 'DIKERJAKAN' && (
                                      <>
                                         <button onClick={() => handleSetorHasil(task, misi.harga_per_item)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                           Setor Hasil
                                         </button>
                                         <button onClick={() => handleBatalMisi(task.id)} className="px-3 bg-red-950/30 text-red-500 hover:bg-red-600 hover:text-white border border-red-900/50 rounded-lg transition-all" title="Batal Mengerjakan">
                                           <Trash2 size={14}/>
                                         </button>
                                      </>
                                   )}
                                   {!isAdmin && task.status !== 'DIKERJAKAN' && (
                                       <div className="w-full text-center py-2.5 text-[10px] font-bold text-zinc-500 bg-black/40 rounded-lg">
                                           MENUNGGU ADMIN...
                                       </div>
                                   )}

                                   {/* TOMBOL ADMIN */}
                                   {isAdmin && task.status === 'MENUNGGU_VALIDASI' && (
                                      <button onClick={() => aksiValidasiGaji(task, misi.nama_misi)} className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                                         <CheckCircle2 size={14}/> Validasi & Bayar
                                      </button>
                                   )}
                                   {isAdmin && task.status === 'DIKERJAKAN' && (
                                      <div className="w-full text-center py-2.5 text-[10px] font-bold text-zinc-500 bg-black/40 rounded-lg">
                                           PEKERJA SEDANG SIBUK...
                                      </div>
                                   )}
                                   {isAdmin && task.status === 'SELESAI' && (
                                       <button onClick={() => handleBatalMisi(task.id)} className="w-full flex items-center justify-center gap-1 bg-transparent text-zinc-500 hover:bg-zinc-800 hover:text-white border border-zinc-800 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                         <XCircle size={14}/> Arsipkan Kartu Ini
                                       </button>
                                   )}
                                </div>

                             </div>
                          ))
                       )}
                    </div>

                 </div>
               )
            })}
          </div>
        )}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .animate-spin-slow { animation: spin 3s linear infinite; }
      `}} />
    </div>
  );
}