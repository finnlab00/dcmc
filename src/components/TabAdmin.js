import React from "react";
import { TrendingUp, Download, Wallet, CreditCard, DollarSign, Shield, Bell, Package, Copy, Archive } from "lucide-react";
import toast from "react-hot-toast";

export default function TabAdmin({
  financeVendor, setFinanceVendor, allVendorData, exportToCSV, financeStats,
  loading, toggleVendorStatus, getRekapVendor, getSisaKuota, 
  sendDiscordAnnouncement, requestMarkAllArrived, requestArchive
}) {
  return (
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
              <AdminButton icon={<Bell size={14}/>} color="indigo" onClick={() => sendDiscordAnnouncement(isOpen ? "OPEN" : "CLOSED", vName)} disabled={loading}>Notif</AdminButton>
              <AdminButton icon={<Package size={14}/>} color="green" onClick={() => requestMarkAllArrived(vName)} disabled={loading}>Ready</AdminButton>
              <AdminButton icon={<Copy size={14}/>} color="slate" onClick={() => {
                const text = itemsRekap.map(([n, q]) => `• ${n} (x${q})`).join("\n");
                navigator.clipboard.writeText(`REKAP ${vName}:\n${text}`);
                toast.success("List Rekap disalin ke Clipboard!");
              }}>Copy</AdminButton>
              <AdminButton icon={<Archive size={14}/>} color="red" onClick={() => requestArchive(vName)} disabled={loading}>Arsip</AdminButton>
            </div>
          </div>
        );
      })}
      </div>
    </div>
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