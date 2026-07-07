import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { DEMO_PROFILES } from "../demoApi";

export default function DemoProfilePicker() {
  const { login } = useAuth();
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (email: string) => {
    setError(null);
    setBusyEmail(email);
    try {
      await login(email, "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado. Tente novamente.");
      setBusyEmail(null);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: 520, padding: "40px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--prose)", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>Weft</span>
        </div>
        <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 14, color: "var(--mut)", lineHeight: 1.5 }}>
          Demonstração somente leitura — escolha um leitor para explorar o grafo de ideias.
        </p>

        <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 12 }}>
          {DEMO_PROFILES.map((p) => {
            const busy = busyEmail === p.user.email;
            return (
              <button
                key={p.user.email}
                onClick={() => choose(p.user.email)}
                disabled={busyEmail !== null}
                style={{
                  textAlign: "left", padding: "18px 20px", border: "1px solid var(--line)", borderRadius: 12,
                  background: "#fff", cursor: busyEmail !== null ? "default" : "pointer",
                  opacity: busyEmail !== null && !busy ? 0.5 : 1,
                  display: "flex", alignItems: "center", gap: 16,
                }}
              >
                <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700 }}>
                  {(p.user.display_name || p.user.email)[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{p.user.display_name}</div>
                  <div style={{ marginTop: 3, fontSize: 12.5, color: "var(--mut)" }}>{p.tagline}</div>
                  <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--faint)" }}>{p.books.length} livros · {p.insights.length} insights · {p.edges.length} conexões</div>
                </div>
                <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 600, color: "var(--accent)" }}>{busy ? "Entrando…" : "Explorar →"}</span>
              </button>
            );
          })}
        </div>

        {error && <p style={{ marginTop: 16, textAlign: "center", fontSize: 13, color: "#B91C1C" }}>{error}</p>}

        <p style={{ margin: "28px 0 0", textAlign: "center", fontSize: 12, color: "var(--faint)" }}>
          Dados reais de leitura, sem cadastro. Ações de criação/edição ficam desativadas nesta demo.
        </p>
      </div>
    </div>
  );
}
