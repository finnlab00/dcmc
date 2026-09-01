import React from "react";
import { Search, Archive, ClipboardList, ChevronLeft, ChevronRight, Package } from "lucide-react";

export default function TabRiwayat({
  showArchived, setShowArchived, searchNama, setSearchNama, setCurrentPage,
  filterVendor, setFilterVendor, orderList, filterBelumAmbil, setFilterBelumAmbil,
  paginatedOrders, totalPages, currentPage, isAdmin, loading, updateOrderStatus, requestCancelOrder
}) {
  return (
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
  
  return (
    <button type="button" disabled={!isAdmin || loading} onClick={onClick}
      className={`${baseClass} ${isActive ? activeColor : 'bg-black text-zinc-500 border-zinc-800 hover:bg-zinc-900'}`}
      style={isActive && isAdmin && !loading ? { boxShadow: `0 0 15px ${glowColor}22` } : {}}>
      <span className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</span>
      <div className="flex items-center gap-1.5 font-black text-xs md:text-sm">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}` }}></span>
        <span className={isActive ? "" : "text-zinc-400"}>{value || "BELUM"}</span>
      </div>
    </button>
  );
}