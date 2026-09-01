import React from "react";
import { ShoppingCart, Package, Check, X, Loader2 } from "lucide-react";

export default function TabPesan({
  namaPemesan, setNamaPemesan, selectedVendor, setSelectedVendor,
  selectedBarang, setSelectedBarang, jumlah, setJumlah,
  keranjang, setKeranjang, allVendorData, daftarVendorUnik,
  barangTersedia, setBarangTersedia, handleAddToCart,
  handleCheckout, getSisaKuota, loading
}) {
  const sisaKuotaTerpilih = selectedBarang ? getSisaKuota(selectedVendor, selectedBarang.namaBarang) : 0;

  return (
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
  );
}