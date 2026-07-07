import { useState } from "react";
import { DEMO_MODE } from "../api";
import type { Book, Insight, ReadingStatus } from "../types";
import { READING_STATUS, TYPES, excerpt, formatDate } from "../constants";
import BookCover from "../components/BookCover";

interface Props {
  insights: Insight[];
  books: Book[];
  themeCount: number;
  userName: string;
  onOpen: (id: string) => void;
  onNavigateInsights: () => void;
  onNewInsight: () => void;
  onReadingStatusChange: (bookId: string, status: ReadingStatus) => void;
  onOpenBook: (bookId: string) => void;
  onEditBook: (bookId: string) => void;
  onStartReadingSession: (bookId: string) => void;
}

const READING_STATUSES: ReadingStatus[] = ["quero_ler", "lendo", "lido"];

export default function Library({ insights, books, themeCount, userName, onOpen, onNavigateInsights, onNewInsight, onReadingStatusChange, onOpenBook, onEditBook, onStartReadingSession }: Props) {
  const bookById = Object.fromEntries(books.map((b) => [b.id, b]));
  const recent = insights.slice(0, 4);
  const lastBookId = insights[0]?.book_id;
  const readingNow = books.find((b) => b.reading_status === "lendo");
  const lastBook = readingNow ?? (lastBookId ? bookById[lastBookId] : undefined);
  const readBooks = books.filter((b) => b.reading_status === "lido");
  const insightCountByBook = new Map<string, number>();
  insights.forEach((i) => insightCountByBook.set(i.book_id, (insightCountByBook.get(i.book_id) ?? 0) + 1));
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Boa noite" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const [statusBookId, setStatusBookId] = useState<string>(books[0]?.id ?? "");
  const selectedStatusBook = bookById[statusBookId] ?? books[0];

  return (
    <main style={{ flex: 1, overflowY: "auto" }}>
      <div className="fade-up" style={{ maxWidth: 820, margin: "0 auto", padding: "52px 40px 64px" }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 600, letterSpacing: "-0.02em" }}>{greeting}, {userName}.</h1>
        <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "var(--mut)" }}>
          Sua rede tem <span style={{ color: "var(--accent)", fontWeight: 600 }}>{insights.length} insights</span> conectando {themeCount} temas em {books.length} livros.
        </p>

        {lastBook && (
          <div style={{ marginTop: 32, display: "flex", alignItems: "center", gap: 20, padding: "18px 20px", background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
            <BookCover title={lastBook.title} coverUrl={lastBook.cover_url} width={52} height={76} fontSize={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "var(--faint)" }}>CONTINUE LENDO</div>
              <div style={{ marginTop: 4, fontSize: 16.5, fontWeight: 600, letterSpacing: "-0.01em" }}>
                {lastBook.title} <span style={{ fontWeight: 400, color: "var(--mut)" }}>· {lastBook.author}</span>
              </div>
            </div>
            {!DEMO_MODE && (
              <>
                <button onClick={() => onEditBook(lastBook.id)} style={{ flexShrink: 0, padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)", fontSize: 13, fontWeight: 600 }}>
                  Editar
                </button>
                <button onClick={() => onStartReadingSession(lastBook.id)} style={{ flexShrink: 0, padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)", fontSize: 13, fontWeight: 600 }}>
                  Iniciar sessão
                </button>
                <button onClick={onNewInsight} style={{ flexShrink: 0, padding: "8px 14px", border: "1px solid var(--accent-line)", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>
                  Registrar insight
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ marginTop: 40, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Seus últimos insights</h2>
          <span onClick={onNavigateInsights} style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", cursor: "pointer" }}>Ver todos</span>
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {recent.length === 0 && <p style={{ fontSize: 13.5, color: "var(--mut)" }}>Nenhum insight ainda. Crie o primeiro com "Novo insight".</p>}
          {recent.map((it) => {
            const ty = TYPES[it.kind];
            const book = bookById[it.book_id];
            const chips = [...it.themes.map((t) => t.label), ...it.free_tags].slice(0, 3);
            return (
              <div key={it.id} onClick={() => onOpen(it.id)} style={{ padding: "16px 18px", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ty.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--mut)" }}>{ty.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>{formatDate(it.created_at)}</span>
                </div>
                <div style={{ marginTop: 7, fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{it.title || excerpt(it.body, 60)}</div>
                <p style={{ margin: "6px 0 0", fontFamily: "var(--prose)", fontSize: 14.5, lineHeight: 1.55, color: "#43434C", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{excerpt(it.body)}</p>
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

        {readBooks.length > 0 && (
          <>
            <h2 style={{ margin: "40px 0 0", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Livros lidos</h2>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {readBooks.map((b) => (
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
          </>
        )}

        {!DEMO_MODE && books.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--mut)" }}>Status de leitura</span>
            <select
              value={statusBookId}
              onChange={(e) => setStatusBookId(e.target.value)}
              style={{ fontSize: 12.5, padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)" }}
            >
              {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              {READING_STATUSES.map((s) => {
                const on = selectedStatusBook?.reading_status === s;
                return (
                  <button
                    key={s}
                    onClick={() => selectedStatusBook && onReadingStatusChange(selectedStatusBook.id, s)}
                    style={{
                      padding: "5px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500,
                      border: "1px solid " + (on ? "var(--accent-line)" : "var(--line)"),
                      background: on ? "var(--accent-soft)" : "#fff",
                      color: on ? "var(--accent)" : "var(--mut)",
                    }}
                  >
                    {READING_STATUS[s].label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
