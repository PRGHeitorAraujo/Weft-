import { useEffect, useRef, useState } from "react";
import type { Book, InsightKind } from "../types";
import { READING_SESSION_PRESETS, TYPES } from "../constants";
import { useCreateInsight, useCreateReadingSession } from "../queries";
import BookCover from "../components/BookCover";

interface Props {
  book: Book;
  onExit: () => void;
}

type Step = "setup" | "active" | "done";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function ReadingSession({ book, onExit }: Props) {
  const [step, setStep] = useState<Step>("setup");
  const [minutes, setMinutes] = useState(30);
  const [plannedSeconds, setPlannedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [savedSeconds, setSavedSeconds] = useState(0);
  const startedAtRef = useRef<Date | null>(null);

  const [capturing, setCapturing] = useState(false);
  const [insightKind, setInsightKind] = useState<InsightKind>("observacao");
  const [insightTitle, setInsightTitle] = useState("");
  const [insightBody, setInsightBody] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const createSession = useCreateReadingSession();
  const createInsight = useCreateInsight();

  // Ticks once a second only while running; paused sessions simply stop
  // decrementing, so elapsed time never counts paused time.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemainingSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (step === "active" && running && remainingSeconds === 0) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  const start = (mins: number) => {
    const secs = mins * 60;
    setPlannedSeconds(secs);
    setRemainingSeconds(secs);
    startedAtRef.current = new Date();
    setRunning(true);
    setStep("active");
  };

  const finish = () => {
    setRunning(false);
    const elapsed = plannedSeconds - remainingSeconds;
    if (elapsed >= 1 && startedAtRef.current) {
      createSession.mutate({ book_id: book.id, duration_seconds: elapsed, started_at: startedAtRef.current.toISOString() });
      setSavedSeconds(elapsed);
    } else {
      setSavedSeconds(0);
    }
    setStep("done");
  };

  const saveInsight = async () => {
    if (!insightBody.trim()) return;
    await createInsight.mutateAsync({
      book_id: book.id,
      chapter_id: null,
      title: insightTitle.trim() || null,
      body: insightBody,
      kind: insightKind,
      free_tags: [],
      theme_ids: [],
    });
    setInsightTitle("");
    setInsightBody("");
    setInsightKind("observacao");
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2400);
    setCapturing(false);
  };

  const progress = plannedSeconds > 0 ? ((plannedSeconds - remainingSeconds) / plannedSeconds) * 100 : 0;

  return (
    <main style={{ flex: 1, overflowY: "auto" }}>
      <div className="fade-up wf-page" style={{ maxWidth: 640, margin: "0 auto" }}>
        <span onClick={onExit} style={{ fontSize: 13, fontWeight: 500, color: "var(--accent)", cursor: "pointer" }}>← Biblioteca</span>

        <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <BookCover title={book.title} coverUrl={book.cover_url} width={44} height={64} fontSize={17} />
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "var(--faint)" }}>SESSÃO DE LEITURA</div>
            <div style={{ marginTop: 3, fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>{book.title}</div>
          </div>
        </div>

        {step === "setup" && (
          <div style={{ marginTop: 36, padding: "28px 26px", background: "#fff", border: "1px solid var(--line)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.07em", color: "var(--faint)" }}>DURAÇÃO</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {READING_SESSION_PRESETS.map((m) => {
                const on = minutes === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMinutes(m)}
                    style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13.5, fontWeight: on ? 600 : 500, border: "1px solid " + (on ? "var(--accent)" : "var(--line)"), background: on ? "var(--accent)" : "#fff", color: on ? "#fff" : "var(--mut)" }}
                  >
                    {m} min
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12.5, color: "var(--mut)" }}>Ajustar</span>
              <button onClick={() => setMinutes((m) => Math.max(5, m - 5))} style={{ width: 28, height: 28, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 15, color: "var(--ink)" }}>−</button>
              <span style={{ minWidth: 56, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{minutes} min</span>
              <button onClick={() => setMinutes((m) => Math.min(180, m + 5))} style={{ width: 28, height: 28, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 15, color: "var(--ink)" }}>+</button>
            </div>

            <button
              onClick={() => start(minutes)}
              style={{ marginTop: 26, width: "100%", padding: "11px 0", border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 14.5, fontWeight: 600, boxShadow: "0 1px 2px rgba(28,28,36,0.18)" }}
            >
              Iniciar sessão
            </button>
          </div>
        )}

        {step === "active" && (
          <div style={{ marginTop: 36, padding: "36px 26px", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontFamily: "var(--prose)", fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{formatClock(remainingSeconds)}</div>
            <div style={{ margin: "14px auto 0", maxWidth: 280, height: 4, borderRadius: 2, background: "var(--line)", overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent)", transition: "width 1s linear" }} />
            </div>
            <div style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 10 }}>
              <button
                onClick={() => setRunning((r) => !r)}
                style={{ padding: "9px 20px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)", fontSize: 13.5, fontWeight: 600 }}
              >
                {running ? "Pausar" : "Retomar"}
              </button>
              <button
                onClick={finish}
                style={{ padding: "9px 20px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--mut)", fontSize: 13.5, fontWeight: 600 }}
              >
                Finalizar
              </button>
            </div>

            <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid var(--line)" }}>
              {!capturing ? (
                <button
                  onClick={() => setCapturing(true)}
                  style={{ padding: "9px 18px", border: "1px solid var(--accent-line)", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13.5, fontWeight: 600 }}
                >
                  + Capturar insight
                </button>
              ) : (
                <div style={{ textAlign: "left" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(Object.entries(TYPES) as [InsightKind, typeof TYPES[InsightKind]][]).map(([k, v]) => {
                      const on = insightKind === k;
                      return (
                        <button
                          key={k}
                          onClick={() => setInsightKind(k)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: on ? 600 : 500, border: "1px solid " + (on ? v.color : "var(--line)"), background: on ? `color-mix(in oklab,${v.color} 7%,white)` : "#fff", color: on ? v.color : "var(--mut)" }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.color, display: "inline-block" }} />{v.name}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    value={insightTitle}
                    onChange={(e) => setInsightTitle(e.target.value)}
                    placeholder="Título (opcional)"
                    style={{ width: "100%", marginTop: 12, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13.5 }}
                  />
                  <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <textarea
                      value={insightBody}
                      onChange={(e) => setInsightBody(e.target.value)}
                      placeholder="O que este trecho fez você pensar?"
                      rows={4}
                      style={{ flex: 1, padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13.5, fontFamily: "var(--prose)", lineHeight: 1.55, resize: "vertical" }}
                    />
                    {/* Extension point: voice capture. Wire a speech-to-text handler
                        here later to populate insightBody via setInsightBody — not
                        implemented yet, so the button stays disabled. */}
                    <button
                      type="button"
                      disabled
                      title="Captura por voz — em breve"
                      aria-label="Captura por voz (em breve)"
                      style={{ flexShrink: 0, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", borderRadius: 8, background: "var(--panel)", color: "var(--faint)", cursor: "not-allowed", opacity: 0.6 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a2 2 0 0 1 2 2v4a2 2 0 1 1-4 0v-4a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.3" /><path d="M4.5 7.5v.5a3.5 3.5 0 0 0 7 0v-.5M8 11.5v2.5M6 14h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={saveInsight}
                      disabled={createInsight.isPending || !insightBody.trim()}
                      style={{ padding: "8px 16px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)", opacity: createInsight.isPending ? 0.7 : 1 }}
                    >
                      {createInsight.isPending ? "Salvando…" : "Salvar insight"}
                    </button>
                    <button
                      onClick={() => setCapturing(false)}
                      style={{ padding: "8px 16px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--mut)", fontSize: 13, fontWeight: 500 }}
                    >
                      Cancelar
                    </button>
                    <span style={{ fontSize: 12.5, color: "#0F766E", fontWeight: 600, opacity: justSaved ? 1 : 0, transition: "opacity .3s" }}>Insight salvo</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === "done" && (
          <div style={{ marginTop: 36, padding: "32px 26px", background: "#fff", border: "1px solid var(--line)", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>Sessão concluída</div>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--mut)" }}>
              {savedSeconds >= 60
                ? <>Você leu <strong>{book.title}</strong> por {Math.round(savedSeconds / 60)} min.</>
                : savedSeconds > 0
                  ? <>Você leu <strong>{book.title}</strong> por menos de 1 min.</>
                  : "Sessão muito curta para registrar."}
            </p>
            <button
              onClick={onExit}
              style={{ marginTop: 20, padding: "9px 20px", border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 13.5, fontWeight: 600 }}
            >
              Voltar à biblioteca
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
