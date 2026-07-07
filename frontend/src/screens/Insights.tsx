import { useState, type MouseEvent } from "react";
import { DEMO_MODE } from "../api";
import type { Book, Insight, InsightKind } from "../types";
import { TYPES, excerpt, formatDate } from "../constants";
import { useDeleteInsight } from "../queries";

interface Props {
  insights: Insight[];
  books: Book[];
  onOpen: (id: string) => void;
}

export default function Insights({ insights, books, onOpen }: Props) {
  const [filter, setFilter] = useState<InsightKind | "todos">("todos");
  const deleteInsight = useDeleteInsight();
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));

  const handleDelete = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = window.confirm("Excluir este insight? As conexões dele com outros insights também serão removidas do grafo.");
    if (ok) deleteInsight.mutate(id);
  };
  const filtered = insights.filter((i) => filter === "todos" || i.kind === filter);
  const pills: (InsightKind | "todos")[] = ["todos", "observacao", "hipotese", "pergunta", "discordancia", "conexao"];

  return (
    <main style={{ flex: 1, overflowY: "auto" }}>
      <div className="fade-up" style={{ maxWidth: 900, margin: "0 auto", padding: "52px 40px 64px" }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: "-0.02em" }}>Insights</h1>
        <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "var(--mut)" }}>Toda a sua rede de ideias, em ordem de escrita.</p>

        <div style={{ marginTop: 24, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {pills.map((k) => {
            const on = filter === k;
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
                style={{ padding: "5px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500, border: "1px solid " + (on ? "var(--accent-line)" : "var(--line)"), background: on ? "var(--accent-soft)" : "#fff", color: on ? "var(--accent)" : "var(--mut)" }}
              >
                {k === "todos" ? "Todos" : TYPES[k].name}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {filtered.map((it) => {
            const ty = TYPES[it.kind];
            const book = bookById[it.book_id];
            const chips = [...it.themes.map((t) => t.label), ...it.free_tags].slice(0, 3);
            return (
              <div key={it.id} onClick={() => onOpen(it.id)} style={{ padding: "16px 18px", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ty.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--mut)" }}>{ty.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>{formatDate(it.created_at)}</span>
                  {!DEMO_MODE && (
                    <button
                      onClick={(e) => handleDelete(e, it.id)}
                      title="Excluir insight"
                      style={{ padding: "2px 7px", border: "1px solid var(--line)", borderRadius: 6, background: "#fff", color: "var(--faint)", fontSize: 12, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </div>
                <div style={{ marginTop: 7, fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em" }}>{it.title || excerpt(it.body, 60)}</div>
                <p style={{ margin: "6px 0 0", fontFamily: "var(--prose)", fontSize: 14, lineHeight: 1.55, color: "#43434C", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{excerpt(it.body)}</p>
                <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--mut)", fontStyle: "italic", fontFamily: "var(--prose)" }}>{book?.title}</span>
                  {chips.length > 0 && <span style={{ fontSize: 11, color: "var(--faint)" }}>·</span>}
                  {chips.map((c) => (
                    <span key={c} style={{ padding: "2px 8px", borderRadius: 20, background: "var(--panel)", border: "1px solid var(--line)", fontSize: 11.5, color: "var(--mut)" }}>{c}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
