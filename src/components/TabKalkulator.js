import React from "react";
import { Calculator, Leaf } from "lucide-react";

export default function TabKalkulator({ inputUmer, setInputUmer, inputBibit, setInputBibit, hasilUmer, hasilBibit }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 max-w-3xl mx-auto space-y-8 relative z-10">
      
      {/* KALKULATOR UMER */}
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

      {/* KALKULATOR LADANG */}
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
  );
}