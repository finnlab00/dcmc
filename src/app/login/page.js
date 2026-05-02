"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [inputCode, setInputCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    sessionStorage.clear(); // Membersihkan sesi lama
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const SECRET_CODE = "DCMC2026";

    if (inputCode === SECRET_CODE) {
      sessionStorage.setItem("access_granted", "true");
      // Jeda 500ms agar storage tersimpan sempurna sebelum pindah
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
          <button type="submit" disabled={isLoading} style={styles.button}>
            {isLoading ? "Memverifikasi..." : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles = {
  main: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f4f4f4" },
  card: { width: "100%", maxWidth: "400px", padding: "2rem", textAlign: "center", backgroundColor: "#fff", borderRadius: "10px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  title: { fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" },
  description: { color: "#666", marginBottom: "1.5rem" },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  input: { width: "100%", padding: "0.8rem", borderRadius: "5px", border: "1px solid #ccc", boxSizing: "border-box" },
  button: { width: "100%", padding: "0.8rem", borderRadius: "5px", border: "none", backgroundColor: "#000", color: "#fff", fontWeight: "bold", cursor: "pointer" }
};