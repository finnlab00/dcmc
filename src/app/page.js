"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  // Tentukan kode akses tunggal Anda di sini
  const KODE_RAHASIA = "DCMC2026"; 

  const handleLogin = (e) => {
    e.preventDefault();
    if (accessCode === KODE_RAHASIA) {
      // Simpan status login sederhana di session
      sessionStorage.setItem("isLoggedIn", "true");
      router.push("/preorder");
    } else {
      setError(true);
      setAccessCode("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-sm w-full bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center">
        <h1 className="text-4xl font-black text-red-600 italic uppercase mb-2 tracking-tighter">DCMC</h1>
        <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mb-8">Logistics Access</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="password" 
            placeholder="ENTER ACCESS CODE" 
            className={`w-full p-4 rounded-lg bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-700'} text-white text-center font-black tracking-[0.5em] outline-none focus:border-red-600 transition-all`}
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value);
              setError(false);
            }}
          />
          {error && <p className="text-red-500 text-[9px] uppercase font-bold tracking-widest">Invalid Access Code</p>}
          
          <button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95"
          >
            Authorize
          </button>
        </form>
        
        <p className="mt-8 text-slate-600 text-[8px] uppercase tracking-widest italic">Authorized Personnel Only</p>
      </div>
    </div>
  );
}