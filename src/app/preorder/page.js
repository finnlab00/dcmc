"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PreorderPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const access = sessionStorage.getItem("access_granted");
    
    if (access === "true") {
      setIsAuthorized(true);
      setLoading(false);
    } else {
      // Jika akses tidak ditemukan, langsung tendang ke halaman login
      router.replace("/");
    }
  }, [router]);

  // JANGAN HAPUS: Ini mencegah halaman muncul sebelum verifikasi selesai
  if (loading || !isAuthorized) {
    return null; 
  }

  return (
    <main style={{ padding: "20px", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #eee", paddingBottom: "10px" }}>
        <h2>Portal Pre-Order DCMC</h2>
        <button 
          onClick={() => { sessionStorage.clear(); router.push("/"); }}
          style={{ backgroundColor: "#ff4444", color: "white", border: "none", padding: "5px 15px", borderRadius: "5px", cursor: "pointer" }}
        >
          Logout
        </button>
      </header>

      {/* --- AWAL KONTEN SISTEM PRE-ORDER ANDA --- */}
      <section style={{ marginTop: "30px" }}>
        <h3>Daftar Barang & Vendor</h3>
        <p>Silakan pilih barang untuk dimasukkan ke keranjang.</p>
        
        {/* Masukkan tabel vendor atau fitur cart Anda di sini */}
        <div style={{ padding: "40px", border: "2px dashed #ccc", textAlign: "center", color: "#888" }}>
          [ Tempelkan Kode Tabel/Cart Anda di Sini ]
        </div>
      </section>
      {/* --- AKHIR KONTEN SISTEM PRE-ORDER ANDA --- */}

    </main>
  );
}