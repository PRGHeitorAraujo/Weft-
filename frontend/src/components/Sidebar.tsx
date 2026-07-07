import type { CSSProperties } from "react";
import { DEMO_MODE } from "../api";
import type { Screen, User } from "../types";
import Logo from "./Logo";

function navStyle(on: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 7,
    fontSize: 13.5, fontWeight: on ? 600 : 500, cursor: "pointer",
    color: on ? "var(--accent)" : "var(--ink)", background: on ? "var(--accent-soft)" : "transparent",
  };
}

interface Props {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  onNewInsight: () => void;
  user: User;
  insightCount: number;
  bookCount: number;
  onLogout: () => void;
}

export default function Sidebar({ screen, onNavigate, onNewInsight, user, insightCount, bookCount, onLogout }: Props) {
  const initial = (user.display_name || user.email)[0]?.toUpperCase() ?? "?";
  return (
    <nav className="wf-sidebar" style={{ width: 224, flexShrink: 0, background: "var(--panel)", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", padding: "20px 12px 16px" }}>
      <div className="wf-sidebar-logo" style={{ display: "flex", alignItems: "center", padding: "0 10px 18px" }}>
        <Logo size={24} />
      </div>
      {!DEMO_MODE && (
        <button
          className="wf-sidebar-new"
          onClick={onNewInsight}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, margin: "0 2px 18px", padding: "9px 12px", border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 13.5, fontWeight: 600, boxShadow: "0 1px 2px rgba(28,28,36,0.18)" }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          Novo insight
        </button>
      )}
      <div className="wf-sidebar-nav" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div className="wf-sidebar-navitem" onClick={() => onNavigate("home")} style={navStyle(screen === "home" || screen === "book" || screen === "reading")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 3.4C6.7 2.5 4.9 2.1 2.6 2.2v10.4c2.3-.1 4.1.3 5.4 1.2 1.3-.9 3.1-1.3 5.4-1.2V2.2C11.1 2.1 9.3 2.5 8 3.4Zm0 0v10.4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          Biblioteca
        </div>
        <div className="wf-sidebar-navitem" onClick={() => onNavigate("insights")} style={navStyle(screen === "insights")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.8 9.5 6.5 14.2 8 9.5 9.5 8 14.2 6.5 9.5 1.8 8 6.5 6.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          Insights
        </div>
        <div className="wf-sidebar-navitem" onClick={() => onNavigate("graph")} style={navStyle(screen === "graph")}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="3.2" cy="12.4" r="1.9" stroke="currentColor" strokeWidth="1.4" /><circle cx="12" cy="3.6" r="1.9" stroke="currentColor" strokeWidth="1.4" /><circle cx="12.6" cy="12" r="1.6" stroke="currentColor" strokeWidth="1.4" /><path d="M4.6 11 10.6 5m-5.9 6.9 6.3.1" stroke="currentColor" strokeWidth="1.3" /></svg>
          Grafo de Ideias
        </div>
      </div>
      <div
        className="wf-sidebar-profile"
        onClick={() => onNavigate("profile")}
        style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 7, borderTop: "1px solid var(--line)", cursor: "pointer", background: screen === "profile" ? "var(--accent-soft)" : "transparent" }}
      >
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initial}</div>
        <div className="wf-sidebar-profile-detail" style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: screen === "profile" ? "var(--accent)" : "var(--ink)" }}>{user.display_name || user.email}</span>
          <span style={{ fontSize: 11.5, color: "var(--mut)" }}>{insightCount} insights · {bookCount} livros</span>
        </div>
        <span className="wf-sidebar-profile-label-mobile" style={{ color: screen === "profile" ? "var(--accent)" : "var(--ink)" }}>Perfil</span>
        <button
          className="wf-sidebar-logout"
          onClick={(e) => { e.stopPropagation(); onLogout(); }}
          title={DEMO_MODE ? "Trocar perfil" : "Sair"}
          aria-label={DEMO_MODE ? "Trocar perfil" : "Sair"}
          style={{ flexShrink: 0, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: 6, background: "transparent", color: "var(--mut)", cursor: "pointer" }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6.5 14H3.5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </nav>
  );
}
