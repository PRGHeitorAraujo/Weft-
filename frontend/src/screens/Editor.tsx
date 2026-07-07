import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { DEMO_MODE } from "../api";
import { EDGE_STYLE, TYPES } from "../constants";
import { useCreateBook, useCreateChapter, useCreateEdge, useCreateInsight, useDeleteInsight, useInsight, useSuggestions, useUpdateInsight } from "../queries";
import type { Book, Edge, EdgeKind, Insight, InsightKind, Theme } from "../types";

interface Props {
  insightId: string | "new";
  books: Book[];
  themes: Theme[];
  edges: Edge[];
  insights: Insight[];
  onNavigateInsights: () => void;
  onCreated: (id: string) => void;
  onOpenInsight: (id: string) => void;
}

const NEW_BOOK = "__new__";

export default function Editor({ insightId, books, themes, edges, insights, onNavigateInsights, onCreated, onOpenInsight }: Props) {
  const isNew = insightId === "new";
  const insightQuery = useInsight(isNew ? null : insightId);
  const insight = insightQuery.data ?? null;

  const createBook = useCreateBook();
  const createChapter = useCreateChapter();
  const createInsight = useCreateInsight();
  const updateInsight = useUpdateInsight();
  const createEdge = useCreateEdge();
  const deleteInsight = useDeleteInsight();

  const suggestionsQuery = useSuggestions(insight?.id ?? null);
  const suggestions = suggestionsQuery.data ?? [];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<InsightKind>("observacao");
  const [bookId, setBookId] = useState<string>(books[0]?.id ?? "");
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("");
  const [chapterLabel, setChapterLabel] = useState("");
  const [themeIds, setThemeIds] = useState<string[]>([]);
  const [freeTags, setFreeTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pickedKind, setPickedKind] = useState<Record<string, EdgeKind>>({});

  useEffect(() => {
    if (insight) {
      setTitle(insight.title ?? "");
      setBody(insight.body);
      setKind(insight.kind);
      setBookId(insight.book_id);
      const book = books.find((b) => b.id === insight.book_id);
      const chapter = book?.chapters.find((c) => c.id === insight.chapter_id);
      setChapterLabel(chapter?.label ?? "");
      setThemeIds(insight.themes.map((t) => t.id));
      setFreeTags(insight.free_tags);
    } else {
      setTitle("");
      setBody("");
      setKind("observacao");
      setBookId(books[0]?.id ?? "");
      setChapterLabel("");
      setThemeIds([]);
      setFreeTags([]);
    }
    setSaved(false);
    setTagInput("");
  }, [insightId]); // eslint-disable-line react-hooks/exhaustive-deps

  const draftBook = books.find((b) => b.id === bookId);

  const addTag = () => {
    const v = tagInput.trim().replace(/,$/, "");
    if (v && !freeTags.includes(v)) setFreeTags([...freeTags, v]);
    setTagInput("");
  };
  const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let targetBookId = bookId;
      if (bookId === NEW_BOOK) {
        if (!newBookTitle.trim()) return;
        const book = await createBook.mutateAsync({ title: newBookTitle.trim(), author: newBookAuthor.trim() || undefined });
        targetBookId = book.id;
      }

      let chapterId: string | null = null;
      const label = chapterLabel.trim();
      if (label) {
        const book = books.find((b) => b.id === targetBookId);
        const existing = book?.chapters.find((c) => (c.label ?? "").toLowerCase() === label.toLowerCase());
        chapterId = existing ? existing.id : (await createChapter.mutateAsync({ bookId: targetBookId, label })).id;
      }

      const payload = { book_id: targetBookId, chapter_id: chapterId, title: title || null, body, kind, free_tags: freeTags, theme_ids: themeIds };

      if (insight) {
        await updateInsight.mutateAsync({ id: insight.id, payload });
      } else {
        const created = await createInsight.mutateAsync(payload);
        onCreated(created.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2600);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!insight) return;
    const ok = window.confirm("Excluir este insight? As conexões dele com outros insights também serão removidas do grafo.");
    if (!ok) return;
    await deleteInsight.mutateAsync(insight.id);
    onNavigateInsights();
  };

  const connect = async (targetId: string) => {
    if (!insight) return;
    const kindPicked = pickedKind[targetId] ?? "mesma_ideia";
    await createEdge.mutateAsync({ sourceId: insight.id, targetId, kind: kindPicked });
  };

  const connectedIds = useMemo(() => {
    if (!insight) return new Set<string>();
    const s = new Set<string>();
    edges.forEach((e) => {
      if (e.source_id === insight.id) s.add(e.target_id);
      if (e.target_id === insight.id) s.add(e.source_id);
    });
    return s;
  }, [edges, insight]);

  // Read-only substitute for the suggestions panel in demo mode: the edges
  // this insight already has, resolved to the other side's title.
  const relatedEdges = useMemo(() => {
    if (!insight) return [];
    return edges
      .filter((e) => e.source_id === insight.id || e.target_id === insight.id)
      .map((e) => ({ edge: e, other: insights.find((i) => i.id === (e.source_id === insight.id ? e.target_id : e.source_id)) }))
      .filter((r): r is { edge: Edge; other: Insight } => !!r.other);
  }, [edges, insight, insights]);

  return (
    <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div className="fade-up" style={{ maxWidth: 680, margin: "0 auto", padding: "44px 44px 96px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--mut)" }}>
            <span onClick={onNavigateInsights} style={{ cursor: "pointer" }}>Insights</span>
            <span style={{ color: "var(--faint)" }}>/</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", border: "1px solid var(--line)", borderRadius: 20, background: "#fff", fontSize: 12.5 }}>
              <span style={{ fontFamily: "var(--prose)", fontStyle: "italic" }}>{draftBook?.title ?? "Selecione um livro"}</span>
              {chapterLabel && <span style={{ color: "var(--faint)" }}>{chapterLabel}</span>}
            </span>
          </div>

          <input readOnly={DEMO_MODE} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)" style={{ width: "100%", marginTop: 26, padding: 0, border: "none", background: "transparent", fontFamily: "var(--prose)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.015em", color: "var(--ink)" }} />
          <textarea readOnly={DEMO_MODE} value={body} onChange={(e) => setBody(e.target.value)} placeholder="O que este trecho fez você pensar? Escreva a interpretação, não o resumo." rows={9} style={{ width: "100%", marginTop: 14, padding: 0, border: "none", background: "transparent", resize: "vertical", fontFamily: "var(--prose)", fontSize: 17, lineHeight: 1.7, color: "#2B2B33", minHeight: 220 }} />

          <div style={{ marginTop: 28, paddingTop: 26, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>LIVRO</div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select disabled={DEMO_MODE} value={bookId} onChange={(e) => setBookId(e.target.value)} style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff" }}>
                {books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                {!DEMO_MODE && <option value={NEW_BOOK}>+ novo livro</option>}
              </select>
              {!DEMO_MODE && bookId === NEW_BOOK && (
                <>
                  <input value={newBookTitle} onChange={(e) => setNewBookTitle(e.target.value)} placeholder="Título do livro" style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }} />
                  <input value={newBookAuthor} onChange={(e) => setNewBookAuthor(e.target.value)} placeholder="Autor" style={{ padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }} />
                </>
              )}
              <input readOnly={DEMO_MODE} value={chapterLabel} onChange={(e) => setChapterLabel(e.target.value)} placeholder="Capítulo / localização (ex: Parte II, cap. 1)" style={{ flex: 1, minWidth: 200, padding: "7px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }} />
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>TIPO DE IDEIA</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(Object.entries(TYPES) as [InsightKind, typeof TYPES[InsightKind]][]).map(([k, v]) => {
                const on = kind === k;
                return (
                  <button key={k} disabled={DEMO_MODE} onClick={() => setKind(k)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 13px", borderRadius: 20, fontSize: 13, fontWeight: on ? 600 : 500, border: "1px solid " + (on ? v.color : "var(--line)"), background: on ? `color-mix(in oklab,${v.color} 7%,white)` : "#fff", color: on ? v.color : "var(--mut)", cursor: DEMO_MODE ? "default" : "pointer" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: v.color, display: "inline-block", marginRight: 2 }} />{v.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>TEMAS</div>
            <div style={{ marginTop: 12, display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: 1.2, minWidth: 250 }}>
                <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 9 }}>Canônicos</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {themes.map((t) => {
                    const on = themeIds.includes(t.id);
                    return (
                      <button key={t.id} disabled={DEMO_MODE} onClick={() => setThemeIds(on ? themeIds.filter((x) => x !== t.id) : [...themeIds, t.id])} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: on ? 600 : 400, border: "1px solid " + (on ? "var(--accent)" : "var(--line)"), background: on ? "var(--accent)" : "#fff", color: on ? "#fff" : "var(--mut)", cursor: DEMO_MODE ? "default" : "pointer" }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
              <div style={{ flex: 1, minWidth: 230 }}>
                <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 9 }}>Nuances suas <span style={{ color: "var(--faint)" }}>— tags livres</span></div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", padding: "8px 10px", border: "1px dashed var(--line)", borderRadius: 9, background: "#fff" }}>
                  {freeTags.map((t) => (
                    <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "var(--accent-soft)", border: "1px solid var(--accent-line)", fontSize: 12.5, color: "var(--accent)", fontWeight: 500 }}>
                      {t}
                      {!DEMO_MODE && (
                        <span onClick={() => setFreeTags(freeTags.filter((x) => x !== t))} style={{ cursor: "pointer", opacity: 0.55, fontSize: 13, lineHeight: 1 }}>×</span>
                      )}
                    </span>
                  ))}
                  {!DEMO_MODE && (
                    <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={onTagKey} placeholder={freeTags.length ? "adicionar…" : "ex: culpa-preventiva"} style={{ flex: 1, minWidth: 90, border: "none", background: "transparent", fontSize: 13, padding: "3px 2px" }} />
                  )}
                </div>
                <div style={{ marginTop: 7, fontSize: 11.5, color: "var(--faint)" }}>Enter para adicionar</div>
              </div>
            </div>
          </div>

          {DEMO_MODE ? (
            <p style={{ marginTop: 36, fontSize: 12.5, color: "var(--faint)" }}>Demo somente leitura — edição e exclusão desativadas.</p>
          ) : (
            <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 14 }}>
              <button onClick={save} disabled={saving || !body.trim() || (bookId === NEW_BOOK && !newBookTitle.trim())} style={{ padding: "9px 20px", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: "#fff", background: saved ? "#0F766E" : "var(--accent)", boxShadow: "0 1px 2px rgba(28,28,36,0.18)", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Salvando…" : saved ? "Salvo" : "Salvar insight"}
              </button>
              <span style={{ fontSize: 12.5, color: "var(--mut)", opacity: saved ? 1 : 0, transition: "opacity .3s" }}>Conexões atualizadas ao lado</span>
              {insight && (
                <button
                  onClick={remove}
                  disabled={deleteInsight.isPending}
                  style={{ marginLeft: "auto", padding: "9px 16px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: "#B42318", background: "#fff", opacity: deleteInsight.isPending ? 0.7 : 1 }}
                >
                  {deleteInsight.isPending ? "Excluindo…" : "Excluir insight"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <aside style={{ width: 324, flexShrink: 0, borderLeft: "1px solid var(--line)", background: "#fff", overflowY: "auto", padding: "36px 24px 48px" }}>
        {DEMO_MODE ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>CONECTADO A</div>
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>Sugestões por similaridade semântica desativadas nesta demo.</p>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {relatedEdges.map(({ edge, other }) => {
                const style = EDGE_STYLE[edge.kind];
                return (
                  <div key={edge.id} onClick={() => onOpenInsight(other.id)} style={{ padding: "12px 13px", border: "1px solid var(--line)", borderRadius: 9, cursor: "pointer" }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: style.stroke }}>{style.label}{edge.source_id === insight?.id ? " →" : " ←"}</div>
                    <div style={{ marginTop: 2, fontSize: 13, fontWeight: 500 }}>{other.title || other.body.slice(0, 40)}</div>
                  </div>
                );
              })}
              {relatedEdges.length === 0 && (
                <p style={{ fontSize: 12.5, color: "var(--faint)" }}>Nenhuma conexão para este insight.</p>
              )}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>INSIGHTS RELACIONADOS</div>
            {!insight ? (
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>Salve o insight para ver sugestões de conexão.</p>
            ) : (
              <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--mut)", lineHeight: 1.5 }}>Por proximidade semântica. Escolha o tipo de relação e conecte.</p>
            )}
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {suggestions.map((s) => {
                const already = connectedIds.has(s.insight.id);
                return (
                  <div key={s.insight.id} style={{ padding: "12px 13px", border: "1px solid var(--line)", borderRadius: 9 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-0.01em", cursor: "pointer" }} onClick={() => onOpenInsight(s.insight.id)}>{s.insight.title || s.insight.body.slice(0, 40)}</div>
                    <div style={{ marginTop: 3, fontSize: 11.5, color: "var(--faint)", fontStyle: "italic", fontFamily: "var(--prose)" }}>{s.book_title}</div>
                    {already ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#0F766E", fontWeight: 600 }}>Conectado</div>
                    ) : (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                        <select value={pickedKind[s.insight.id] ?? "mesma_ideia"} onChange={(e) => setPickedKind({ ...pickedKind, [s.insight.id]: e.target.value as EdgeKind })} style={{ fontSize: 11.5, padding: "3px 5px", border: "1px solid var(--line)", borderRadius: 6 }}>
                          {(Object.entries(EDGE_STYLE) as [EdgeKind, typeof EDGE_STYLE[EdgeKind]][]).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                        <button onClick={() => connect(s.insight.id)} style={{ padding: "4px 10px", border: "1px solid var(--accent-line)", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 11.5, fontWeight: 600 }}>Conectar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </main>
  );
}
