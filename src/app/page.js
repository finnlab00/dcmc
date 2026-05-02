"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [inputCode, setInputCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Bersihkan sesi lama saat kembali ke login
  useEffect(() => {
    sessionStorage.clear();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const SECRET_CODE = "DCMC2026";

    if (inputCode === SECRET_CODE) {
      sessionStorage.setItem("access_granted", "true");
      
      // Jeda singkat agar storage tersimpan sempurna
      setTimeout(() => {
        router.push("/preorder");
      }, 500);
    } else {
      alert("KODE AKSES SALAH!");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans uppercase">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl text-center">
        
        {/* Header Identitas - Menyamakan dengan Header Preorder */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-red-600 italic tracking-tighter mb-2">
            DCMC LOGISTICS
          </h1>
          <div className="h-1 w-20 bg-red-600 mx-auto mb-4"></div>
          <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em]">
            SECURE ACCESS PORTAL
          </p>
        </div>

        {/* Form Login */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="text-left">
            <label className="text-[9px] font-black text-slate-400 mb-2 block tracking-widest">
              ENTER ACCESS CODE
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full p-4 rounded bg-slate-900 border border-slate-700 text-white text-center text-xl tracking-[0.5em] outline-none focus:border-red-600 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 p-4 rounded font-black text-[12px] tracking-[0.2em] transition-all disabled:bg-slate-700 shadow-lg shadow-red-900/20"
          >
            {isLoading ? "VERIFYING..." : "GRANT ACCESS"}
          </button>
        </form>

        <footer className="mt-12">
          <p className="text-[8px] text-slate-600 font-bold tracking-widest">
            © 2026 DCMC SYSTEM | INTERNAL USE ONLY
          </p>
        </footer>
      </div>
    </div>
  );
}