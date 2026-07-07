import { DEMO_MODE } from "../api";
import type { Book, Insight, ReadingStatus, User } from "../types";
import { READING_STATUS, formatDuration } from "../constants";
import { useReadingSessions } from "../queries";
import BookCover from "../components/BookCover";

interface Props {
  user: User;
  books: Book[];
  insights: Insight[];
  onOpenBook: (bookId: string) => void;
  onNavigateInsights: () => void;
  onNavigateGraph: () => void;
  onLogout: () => void;
}

const STATUS_ORDER: ReadingStatus[] = ["lendo", "quero_ler", "lido"];

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ flex: 1, minWidth: 120, padding: "16px 18px", background: "#fff", border: "1px solid var(--line)", borderRadius: 10 }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>{value}</div>
      <div style={{ marginTop: 2, fontSize: 12.5, color: "var(--mut)" }}>{label}</div>
    </div>
  );
}

export default function Profile({ user, books, insights, onOpenBook, onNavigateInsights, onNavigateGraph, onLogout }: Props) {
  const readingSessionsQuery = useReadingSessions();
  const totalSeconds = (readingSessionsQuery.data ?? []).reduce((sum, s) => sum + s.duration_seconds, 0);
  const insightCountByBook = new Map<string, number>();
  insights.forEach((i) => insightCountByBook.set(i.book_id, (insightCountByBook.get(i.book_id) ?? 0) + 1));
  const initial = (user.display_name || user.email)[0]?.toUpperCase() ?? "?";

  return (
    <main style={{ flex: 1, overflowY: "auto" }}>
      <div className="fade-up" style={{ maxWidth: 780, margin: "0 auto", padding: "52px 40px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{user.display_name || user.email.split("@")[0]}</h1>
            <div style={{ marginTop: 2, fontSize: 13.5, color: "var(--mut)" }}>{user.email}</div>
          </div>
          <button
            onClick={onLogout}
            style={{ flexShrink: 0, padding: "9px 16px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--mut)", fontSize: 13, fontWeight: 600 }}
          >
            {DEMO_MODE ? "Trocar perfil" : "Sair da conta"}
          </button>
        </div>

        <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatTile value={String(books.length)} label={`livro${books.length === 1 ? "" : "s"}`} />
          <StatTile value={String(insights.length)} label={`insight${insights.length === 1 ? "" : "s"}`} />
          <StatTile value={readingSessionsQuery.isLoading ? "—" : formatDuration(totalSeconds)} label="tempo de leitura" />
        </div>

        <div style={{ marginTop: 40, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Seus insights</h2>
          <span onClick={onNavigateInsights} style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", cursor: "pointer" }}>Ver todos</span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--mut)" }}>
          {insights.length === 0
            ? "Nenhum insight ainda."
            : `${insights.length} ${insights.length === 1 ? "interpretação registrada" : "interpretações registradas"}, à espera de novas conexões.`}
        </p>

        <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Seu grafo de ideias</h2>
            <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--mut)" }}>Todos os insights e conexões, em um só mapa.</p>
          </div>
          <button
            onClick={onNavigateGraph}
            style={{ flexShrink: 0, padding: "9px 16px", border: "1px solid var(--accent-line)", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}
          >
            Abrir grafo
          </button>
        </div>

        <h2 style={{ margin: "40px 0 0", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Sua biblioteca</h2>
        {books.length === 0 && <p style={{ marginTop: 8, fontSize: 13.5, color: "var(--mut)" }}>Nenhum livro ainda.</p>}
        {STATUS_ORDER.map((status) => {
          const group = books.filter((b) => b.reading_status === status);
          if (group.length === 0) return null;
          return (
            <div key={status} style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: READING_STATUS[status].color }}>
                {READING_STATUS[status].label.toUpperCase()} · {group.length}
              </div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {group.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onOpenBook(b.id)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer" }}
                  >
                    <BookCover title={b.title} coverUrl={b.cover_url} width={34} height={48} fontSize={14} radius={3} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{b.title}</div>
                      <div style={{ marginTop: 2, fontSize: 12.5, color: "var(--mut)" }}>
                        {b.author} · {insightCountByBook.get(b.id) ?? 0} insight{(insightCountByBook.get(b.id) ?? 0) === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span style={{ color: "var(--faint)", fontSize: 15 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
