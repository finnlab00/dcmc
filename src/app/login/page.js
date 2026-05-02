"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [inputCode, setInputCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Pastikan sesi bersih saat kembali ke halaman login
  useEffect(() => {
    sessionStorage.clear();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Kode akses yang Anda gunakan
    const SECRET_CODE = "DCMC2026";

    if (inputCode === SECRET_CODE) {
      sessionStorage.setItem("access_granted", "true");
      
      // Jeda singkat untuk memastikan storage tersimpan sebelum pindah halaman
      setTimeout(() => {
        router.push("/preorder");
      }, 500);
    } else {
      alert("Kode Akses Salah!");
      setIsLoading(false);
    }
  };

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>DCMC Logistics</h1>
        <p style={styles.description}>Portal Pre-Order Anggota</p>
        
        <form onSubmit={handleLogin} style={styles.form}>
          <input
            type="password"
            placeholder="Masukkan Kode Akses"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            style={styles.input}
            required
          />
          <button 
            type="submit" 
            disabled={isLoading}
            style={styles.button}
          >
            {isLoading ? "Memverifikasi..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

// Gaya minimalis yang biasanya cocok dengan tampilan awal Next.js
const styles = {
  main: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    padding: "1rem",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "2rem",
    textAlign: "center",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
  },
  description: {
    color: "#666",
    marginBottom: "2rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#000",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
  },
};