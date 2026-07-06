import { useState } from "react";
import type { Book, Insight } from "../types";
import { READING_STATUS, TYPES, excerpt, formatDate } from "../constants";
import BookCover from "../components/BookCover";
import { useUpdateBook } from "../queries";

interface Props {
  book: Book;
  insights: Insight[];
  onBack: () => void;
  onOpenInsight: (id: string) => void;
  onOpenGraph: (bookId: string) => void;
  onStartReadingSession: (bookId: string) => void;
  // Set when arriving here via "Editar" from the Library's "Continue lendo"
  // card, so the edit panel is already open instead of making the user
  // click "Editar" again for a book they explicitly asked to edit.
  autoEdit?: boolean;
}

export default function BookDetail({ book, insights, onBack, onOpenInsight, onOpenGraph, onStartReadingSession, autoEdit }: Props) {
  const status = READING_STATUS[book.reading_status];
  const updateBook = useUpdateBook();

  const [editing, setEditing] = useState(!!autoEdit);
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? "");
  const [coverUrl, setCoverUrl] = useState(book.cover_url ?? "");

  const startEdit = () => {
    setTitle(book.title);
    setAuthor(book.author ?? "");
    setCoverUrl(book.cover_url ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (!title.trim()) return;
    await updateBook.mutateAsync({
      id: book.id,
      payload: { title: title.trim(), author: author.trim() || null, cover_url: coverUrl.trim() || null },
    });
    setEditing(false);
  };

  return (
    <main style={{ flex: 1, overflowY: "auto" }}>
      <div className="fade-up" style={{ maxWidth: 820, margin: "0 auto", padding: "52px 40px 64px" }}>
        <span onClick={onBack} style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", cursor: "pointer" }}>← Biblioteca</span>

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 20 }}>
          <BookCover title={book.title} coverUrl={book.cover_url} width={52} height={76} fontSize={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: status.color }}>{status.label.toUpperCase()}</span>
            <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{book.title}</h1>
            {book.author && <div style={{ marginTop: 4, fontSize: 14, color: "var(--mut)" }}>{book.author}</div>}
          </div>
          <button
            onClick={startEdit}
            style={{ flexShrink: 0, padding: "9px 16px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)", fontSize: 13, fontWeight: 600 }}
          >
            Editar
          </button>
          <button
            onClick={() => onStartReadingSession(book.id)}
            style={{ flexShrink: 0, padding: "9px 16px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)", fontSize: 13, fontWeight: 600 }}
          >
            Iniciar sessão de leitura
          </button>
          <button
            onClick={() => onOpenGraph(book.id)}
            style={{ flexShrink: 0, padding: "9px 16px", border: "1px solid var(--accent-line)", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}
          >
            Ver no grafo
          </button>
        </div>

        {editing && (
          <div style={{ marginTop: 20, padding: "18px 20px", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>TÍTULO</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>AUTOR</div>
              <input value={author} onChange={(e) => setAuthor(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14 }} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>URL DA CAPA</div>
              <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" style={{ marginTop: 6, width: "100%", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 14 }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={save}
                disabled={updateBook.isPending || !title.trim()}
                style={{ padding: "8px 16px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)", opacity: updateBook.isPending ? 0.7 : 1 }}
              >
                {updateBook.isPending ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={() => setEditing(false)} style={{ padding: "8px 16px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--mut)", fontSize: 13, fontWeight: 500 }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <h2 style={{ margin: "36px 0 0", fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {insights.length} insight{insights.length === 1 ? "" : "s"} deste livro
        </h2>

        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {insights.length === 0 && <p style={{ fontSize: 13.5, color: "var(--mut)" }}>Nenhum insight registrado para este livro ainda.</p>}
          {insights.map((it) => {
            const ty = TYPES[it.kind];
            const chips = [...it.themes.map((t) => t.label), ...it.free_tags].slice(0, 3);
            return (
              <div key={it.id} onClick={() => onOpenInsight(it.id)} style={{ padding: "16px 18px", background: "#fff", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: ty.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: "var(--mut)" }}>{ty.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--faint)" }}>{formatDate(it.created_at)}</span>
                </div>
                <div style={{ marginTop: 7, fontSize: 15.5, fontWeight: 600, letterSpacing: "-0.01em" }}>{it.title || excerpt(it.body, 60)}</div>
                <p style={{ margin: "6px 0 0", fontFamily: "var(--prose)", fontSize: 14.5, lineHeight: 1.55, color: "#43434C", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{excerpt(it.body)}</p>
                {chips.length > 0 && (
                  <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {chips.map((c) => (
                      <span key={c} style={{ padding: "2px 8px", borderRadius: 20, background: "var(--panel)", border: "1px solid var(--line)", fontSize: 11.5, color: "var(--mut)" }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
