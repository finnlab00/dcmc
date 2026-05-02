"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [inputCode, setInputCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Bersihkan sisa-sisa sesi lama saat halaman dimuat
  useEffect(() => {
    sessionStorage.clear();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault(); // Mencegah reload halaman saat submit form
    setIsLoading(true);

    // KODE AKSES: Sesuaikan dengan keinginan Anda
    const SECRET_CODE = "DCMC2026";

    if (inputCode === SECRET_CODE) {
      // Simpan status akses ke sessionStorage
      sessionStorage.setItem("access_granted", "true");
      
      // Berikan sedikit jeda untuk memastikan storage tersimpan sebelum pindah halaman
      setTimeout(() => {
        router.push("/preorder");
      }, 500);
    } else {
      alert("Kode Akses Salah! Silakan hubungi Admin.");
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>DCMC Logistics</h1>
        <p style={styles.subtitle}>Masukkan Kode Akses untuk Melanjutkan</p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="password"
            placeholder="Kode Akses"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            style={styles.input}
            required
          />
          <button 
            type="submit" 
            disabled={isLoading}
            style={{
              ...styles.button,
              backgroundColor: isLoading ? "#ccc" : "#0070f3"
            }}
          >
            {isLoading ? "Memverifikasi..." : "Masuk Sekarang"}
          </button>
        </form>
        
        <p style={styles.footer}>&copy; 2026 DCMC System</p>
      </div>
    </div>
  );
}

// Styling sederhana agar tampilan rapi di HP & Laptop
const styles = {
  container: {
    display: "flex",
    height: "100vh",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f2f5",
    fontFamily: "sans-serif",
    padding: "20px"
  },
  card: {
    backgroundColor: "#fff",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: "400px",
    textAlign: "center"
  },
  title: {
    margin: "0 0 10px 0",
    color: "#333",
    fontSize: "24px"
  },
  subtitle: {
    color: "#666",
    marginBottom: "30px",
    fontSize: "14px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },
  input: {
    padding: "12px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    fontSize: "16px",
    outline: "none"
  },
  button: {
    padding: "12px",
    borderRadius: "6px",
    border: "none",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "0.3s"
  },
  footer: {
    marginTop: "30px",
    fontSize: "12px",
    color: "#999"
  }
};