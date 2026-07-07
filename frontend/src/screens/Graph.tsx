import { drag as d3drag } from "d3-drag";
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from "d3-force";
import { select } from "d3-selection";
import "d3-transition";
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { useEffect, useMemo, useRef, useState } from "react";
import { EDGE_STYLE, TYPES } from "../constants";
import type { Book, Edge, Insight, Theme } from "../types";

interface Props {
  insights: Insight[];
  books: Book[];
  themes: Theme[];
  edges: Edge[];
  onOpenEditor: (id: string) => void;
  // Set when arriving here from a specific book (e.g. "Ver no grafo" in the
  // book detail view) — seeds the filter so the entry feels targeted. "Ver
  // tudo" is still one click away and the default for every other entry.
  initialBookFilter?: string | null;
}

type NodeKind = "theme" | "book" | "insight";
type FilterMode = "all" | "theme" | "book";

interface SimNode {
  id: string;
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  r: number;
  initial?: string;
  insight?: Insight;
  book?: Book;
  theme?: Theme;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink {
  source: string | SimNode;
  target: string | SimNode;
  kind: "tema" | "livro" | Edge["kind"];
}

const WIDTH = 1200;
const HEIGHT = 780;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const LOD_THRESHOLD = 0.7;

function idOf(x: string | SimNode): string {
  return typeof x === "string" ? x : x.id;
}

function endpointNode(x: string | SimNode, nodeById: Map<string, SimNode>): SimNode | undefined {
  return typeof x === "string" ? nodeById.get(x) : x;
}

function bookInitial(book: Book): string {
  const surname = book.author?.trim().split(/\s+/).pop();
  return (surname || book.title)[0]?.toUpperCase() ?? "?";
}

// Collision radius per node: themes/books carry their label inside or right
// against the shape, but insight labels hang below the dot as a two-line
// caption — without padding for that footprint, the force layout only keeps
// circles from touching and lets neighboring labels crash into each other.
function collideRadius(n: SimNode): number {
  if (n.kind === "insight") return Math.min(95, 44 + n.label.length * 1.5);
  if (n.kind === "book") return Math.min(100, n.r + 36 + n.label.length * 1.1);
  return n.r + 18;
}

function useLayout(insights: Insight[], books: Book[], themes: Theme[], edges: Edge[]) {
  return useMemo(() => {
    const themeInsightCount = new Map<string, number>();
    insights.forEach((i) => i.themes.forEach((t) => themeInsightCount.set(t.id, (themeInsightCount.get(t.id) ?? 0) + 1)));
    const usedThemes = themes.filter((t) => (themeInsightCount.get(t.id) ?? 0) > 0);

    const nodes: SimNode[] = [
      ...usedThemes.map((t): SimNode => ({
        id: `theme:${t.id}`, kind: "theme", label: t.label,
        x: WIDTH / 2 + (Math.random() - 0.5) * 200, y: HEIGHT / 2 + (Math.random() - 0.5) * 200,
        r: Math.min(46, 26 + (themeInsightCount.get(t.id) ?? 0) * 3), theme: t,
      })),
      ...books.map((b): SimNode => ({
        id: `book:${b.id}`, kind: "book", label: b.title, initial: bookInitial(b),
        x: WIDTH / 2 + (Math.random() - 0.5) * 400, y: HEIGHT / 2 + (Math.random() - 0.5) * 400, r: 14, book: b,
      })),
      ...insights.map((i): SimNode => ({
        id: `insight:${i.id}`, kind: "insight", label: i.title || i.body.slice(0, 26),
        x: WIDTH / 2 + (Math.random() - 0.5) * 500, y: HEIGHT / 2 + (Math.random() - 0.5) * 500, r: 8, insight: i,
      })),
    ];

    const links: SimLink[] = [];
    insights.forEach((i) => {
      i.themes.forEach((t) => links.push({ source: `theme:${t.id}`, target: `insight:${i.id}`, kind: "tema" }));
      links.push({ source: `book:${i.book_id}`, target: `insight:${i.id}`, kind: "livro" });
    });
    edges.forEach((e) => links.push({ source: `insight:${e.source_id}`, target: `insight:${e.target_id}`, kind: e.kind }));

    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    return { nodes, links, nodeById };
  }, [insights, books, themes, edges]);
}

export default function Graph({ insights, books, themes, edges, onOpenEditor, initialBookFilter }: Props) {
  const { nodes, links, nodeById } = useLayout(insights, books, themes, edges);
  const [selected, setSelected] = useState<string | null>(null);
  const [showInsightLabels, setShowInsightLabels] = useState(true);
  const [panning, setPanning] = useState(false);
  const [, setBump] = useState(0);

  // Filter: "Ver tudo" is the default and the point of the whole screen (a
  // theme reaching across books only reads as a thesis when the other books
  // are on screen too). Theme/book filters narrow *which* nodes are visible
  // and interactive without touching the underlying simulation, so switching
  // filters never re-triggers the explosive first-layout settle — nodes that
  // stay visible simply keep their position and fade their neighbors in/out.
  const [filterMode, setFilterMode] = useState<FilterMode>(initialBookFilter ? "book" : "all");
  const [filterThemeId, setFilterThemeId] = useState<string>("");
  const [filterBookId, setFilterBookId] = useState<string>(initialBookFilter ?? "");

  const themeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    insights.forEach((i) => i.themes.forEach((t) => counts.set(t.id, (counts.get(t.id) ?? 0) + 1)));
    return themes.filter((t) => (counts.get(t.id) ?? 0) > 0).sort((a, b) => a.label.localeCompare(b.label));
  }, [themes, insights]);

  const bookOptions = useMemo(() => [...books].sort((a, b) => a.title.localeCompare(b.title)), [books]);

  const visibleIds = useMemo<Set<string> | null>(() => {
    if (filterMode === "theme" && filterThemeId) {
      const related = insights.filter((i) => i.themes.some((t) => t.id === filterThemeId));
      const ids = new Set<string>([`theme:${filterThemeId}`]);
      related.forEach((i) => { ids.add(`insight:${i.id}`); ids.add(`book:${i.book_id}`); });
      return ids;
    }
    if (filterMode === "book" && filterBookId) {
      const related = insights.filter((i) => i.book_id === filterBookId);
      const ids = new Set<string>([`book:${filterBookId}`]);
      related.forEach((i) => { ids.add(`insight:${i.id}`); i.themes.forEach((t) => ids.add(`theme:${t.id}`)); });
      return ids;
    }
    return null;
  }, [filterMode, filterThemeId, filterBookId, insights]);

  const isVisible = (id: string) => visibleIds === null || visibleIds.has(id);

  const filterSummary = useMemo(() => {
    if (filterMode === "theme" && filterThemeId) {
      const related = insights.filter((i) => i.themes.some((t) => t.id === filterThemeId));
      const bookCount = new Set(related.map((i) => i.book_id)).size;
      return `${related.length} insight${related.length === 1 ? "" : "s"} · ${bookCount} livro${bookCount === 1 ? "" : "s"}`;
    }
    if (filterMode === "book" && filterBookId) {
      const related = insights.filter((i) => i.book_id === filterBookId);
      return `${related.length} insight${related.length === 1 ? "" : "s"}`;
    }
    return null;
  }, [filterMode, filterThemeId, filterBookId, insights]);

  // Clicking a node the active filter then hides shouldn't leave its detail
  // panel open with nothing selectable behind it.
  useEffect(() => {
    if (selected && visibleIds && !visibleIds.has(selected)) setSelected(null);
  }, [visibleIds, selected]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomGroupRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodeElRefs = useRef(new Map<string, SVGGElement>());
  const nodeRefCallbacks = useRef(new Map<string, (el: SVGGElement | null) => void>());
  const getNodeRefCallback = (id: string) => {
    let cb = nodeRefCallbacks.current.get(id);
    if (!cb) {
      cb = (el) => { if (el) nodeElRefs.current.set(id, el); else nodeElRefs.current.delete(id); };
      nodeRefCallbacks.current.set(id, cb);
    }
    return cb;
  };

  // Physics: create a live simulation for this dataset, pre-settle it so the
  // graph doesn't visibly explode into place, then keep it around (reheating
  // on node drag) instead of freezing positions after one pass.
  useEffect(() => {
    const sim = forceSimulation(nodes as any)
      .force("link", forceLink(links as any).id((d: any) => d.id).distance((l: any) => (l.kind === "tema" ? 110 : l.kind === "livro" ? 90 : 140)).strength(0.6))
      .force("charge", forceManyBody().strength(-220))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collide", forceCollide((d: any) => collideRadius(d)))
      .stop();

    for (let i = 0; i < 300; i++) sim.tick();
    setBump((b) => b + 1);
    sim.on("tick", () => setBump((b) => b + 1));

    // (Re)bind drag for every currently-mounted node element against this
    // simulation's fresh node objects — needed because React reuses <g>
    // elements (same key) across data reloads, so a mount-only ref callback
    // would otherwise stay bound to stale, no-longer-simulated node objects.
    nodeElRefs.current.forEach((el, id) => {
      const node = nodeById.get(id);
      if (!node) return;
      select(el).call(
        d3drag<SVGGElement, unknown>()
          .on("start", (event) => {
            event.sourceEvent.stopPropagation();
            if (!event.active) sim.alphaTarget(0.3).restart();
            node.fx = node.x;
            node.fy = node.y;
          })
          .on("drag", (event) => {
            node.fx = event.x;
            node.fy = event.y;
          })
          .on("end", (event) => {
            if (!event.active) sim.alphaTarget(0);
            node.fx = null;
            node.fy = null;
          }),
      );
    });

    return () => {
      sim.stop();
    };
  }, [nodes, links]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan/zoom: native d3-zoom bound to the svg, driving the inner group's
  // transform directly (no React state on the hot path) plus a throttled
  // label-visibility flag that only updates when it actually flips.
  useEffect(() => {
    if (!svgRef.current) return;
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_ZOOM, MAX_ZOOM])
      .filter((event) => {
        const isWheel = event.type === "wheel";
        if ((event.ctrlKey && !isWheel) || event.button) return false;
        if (isWheel) return true;
        const target = event.target as Element;
        return !target.closest("[data-graph-node]");
      })
      .on("start", () => setPanning(true))
      .on("end", () => setPanning(false))
      .on("zoom", (event) => {
        zoomGroupRef.current?.setAttribute("transform", event.transform.toString());
        const k = event.transform.k;
        setShowInsightLabels((prev) => {
          const next = k >= LOD_THRESHOLD;
          return prev === next ? prev : next;
        });
      });

    zoomBehaviorRef.current = zoomBehavior;
    select(svgRef.current).call(zoomBehavior);
    return () => {
      select(svgRef.current!).on(".zoom", null);
    };
  }, []);

  const zoomBy = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy as any, factor);
  };

  const fitToView = () => {
    const targets = visibleIds ? nodes.filter((n) => visibleIds.has(n.id)) : nodes;
    if (!svgRef.current || !zoomBehaviorRef.current || targets.length === 0) return;
    const PAD = 60;
    const xs = targets.map((n) => n.x);
    const ys = targets.map((n) => n.y);
    const minX = Math.min(...xs) - PAD, maxX = Math.max(...xs) + PAD;
    const minY = Math.min(...ys) - PAD, maxY = Math.max(...ys) + PAD;
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(WIDTH / bw, HEIGHT / bh)));
    const tx = WIDTH / 2 - scale * (minX + maxX) / 2;
    const ty = HEIGHT / 2 - scale * (minY + maxY) / 2;
    select(svgRef.current).transition().duration(400).call(
      zoomBehaviorRef.current.transform as any,
      zoomIdentity.translate(tx, ty).scale(scale),
    );
  };

  // Reframe on the new subset whenever the filter changes. On first mount,
  // "Ver tudo" keeps its usual unfitted framing — but arriving pre-filtered
  // (via initialBookFilter) should immediately frame that book's subset.
  const mountedFilterRef = useRef(!!initialBookFilter);
  useEffect(() => {
    if (!mountedFilterRef.current) { mountedFilterRef.current = true; return; }
    fitToView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, filterThemeId, filterBookId]);

  const neighborIds = useMemo(() => {
    if (!selected) return null;
    const s = new Set([selected]);
    links.forEach((l) => {
      const sid = idOf(l.source), tid = idOf(l.target);
      if (sid === selected) s.add(tid);
      if (tid === selected) s.add(sid);
    });
    return s;
  }, [selected, links]);

  const nodeOpacity = (id: string) => {
    if (!isVisible(id)) return 0;
    return !neighborIds ? 1 : neighborIds.has(id) ? 1 : 0.18;
  };

  const selNode = selected ? nodeById.get(selected) : null;

  return (
    <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div className="wf-graph-header" style={{ padding: "26px 32px 0", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: "-0.015em" }}>Grafo de Ideias</h1>
          <span style={{ fontSize: 13, color: "var(--mut)" }}>Arraste para navegar (ou belisque para zoom), toque em um nó para ver conexões.</span>
        </div>

        <div className="wf-graph-filters" style={{ padding: "14px 32px 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterMode("all")}
            style={{
              padding: "5px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500,
              border: "1px solid " + (filterMode === "all" ? "var(--accent-line)" : "var(--line)"),
              background: filterMode === "all" ? "var(--accent-soft)" : "#fff",
              color: filterMode === "all" ? "var(--accent)" : "var(--mut)",
            }}
          >
            Ver tudo
          </button>
          <button
            onClick={() => { setFilterMode("theme"); if (!filterThemeId && themeOptions[0]) setFilterThemeId(themeOptions[0].id); }}
            style={{
              padding: "5px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500,
              border: "1px solid " + (filterMode === "theme" ? "var(--accent-line)" : "var(--line)"),
              background: filterMode === "theme" ? "var(--accent-soft)" : "#fff",
              color: filterMode === "theme" ? "var(--accent)" : "var(--mut)",
            }}
          >
            Por tema
          </button>
          {filterMode === "theme" && (
            <select
              value={filterThemeId}
              onChange={(e) => setFilterThemeId(e.target.value)}
              style={{ fontSize: 12.5, padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)" }}
            >
              {themeOptions.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          )}
          <button
            onClick={() => { setFilterMode("book"); if (!filterBookId && bookOptions[0]) setFilterBookId(bookOptions[0].id); }}
            style={{
              padding: "5px 13px", borderRadius: 20, fontSize: 12.5, fontWeight: 500,
              border: "1px solid " + (filterMode === "book" ? "var(--accent-line)" : "var(--line)"),
              background: filterMode === "book" ? "var(--accent-soft)" : "#fff",
              color: filterMode === "book" ? "var(--accent)" : "var(--mut)",
            }}
          >
            Por livro
          </button>
          {filterMode === "book" && (
            <select
              value={filterBookId}
              onChange={(e) => setFilterBookId(e.target.value)}
              style={{ fontSize: 12.5, padding: "4px 8px", border: "1px solid var(--line)", borderRadius: 8, background: "#fff", color: "var(--ink)" }}
            >
              {bookOptions.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          )}
          {filterSummary && <span style={{ fontSize: 12, color: "var(--mut)" }}>{filterSummary}</span>}
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            className="fade-in"
            style={{ width: "100%", height: "100%", display: "block", cursor: panning ? "grabbing" : "grab", touchAction: "none" }}
          >
            <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="transparent" />
            <g ref={zoomGroupRef}>
              <defs>
                <marker id="arr-dev" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4338CA" /></marker>
                <marker id="arr-pre" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#7C3AED" /></marker>
              </defs>

              {links.map((l, idx) => {
                const A = endpointNode(l.source, nodeById);
                const B = endpointNode(l.target, nodeById);
                if (!A || !B) return null;
                const typed = l.kind !== "tema" && l.kind !== "livro";
                const style = typed ? EDGE_STYLE[l.kind as Edge["kind"]] : l.kind === "tema" ? { stroke: "#DFDEE9" } : { stroke: "#DCDAD3", dash: "2 5" };
                const sid = idOf(l.source), tid = idOf(l.target);
                const op = !isVisible(sid) || !isVisible(tid)
                  ? 0
                  : !neighborIds ? (typed ? 0.95 : 0.7) : (neighborIds.has(sid) && neighborIds.has(tid) ? 1 : 0.08);
                return (
                  <line
                    key={idx}
                    x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                    stroke={style.stroke} strokeWidth={typed ? 2 : 1.3}
                    strokeDasharray={style.dash ?? "none"}
                    strokeLinecap="round"
                    markerEnd={typed && (style as any).arrow ? `url(#${l.kind === "desenvolve" ? "arr-dev" : "arr-pre"})` : undefined}
                    opacity={op}
                    style={{ transition: "opacity 260ms ease" }}
                  />
                );
              })}

              {nodes.filter((n) => n.kind === "theme").map((n) => (
                <g
                  key={n.id}
                  data-graph-node="true"
                  ref={getNodeRefCallback(n.id)}
                  onClick={() => setSelected(selected === n.id ? null : n.id)}
                  style={{ cursor: "pointer", transition: "opacity 260ms ease", pointerEvents: isVisible(n.id) ? "auto" : "none" }}
                  opacity={nodeOpacity(n.id)}
                >
                  <circle cx={n.x} cy={n.y} r={n.r} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={selected === n.id ? 2.5 : 1.5} />
                  <foreignObject x={n.x - 80} y={n.y - 13} width={160} height={26} style={{ overflow: "visible", pointerEvents: "none" }}>
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--ui)", fontWeight: 600, color: "var(--accent)", fontSize: 12 }}>{n.label}</div>
                  </foreignObject>
                </g>
              ))}

              {nodes.filter((n) => n.kind === "book").map((n) => (
                <g
                  key={n.id}
                  data-graph-node="true"
                  ref={getNodeRefCallback(n.id)}
                  onClick={() => setSelected(selected === n.id ? null : n.id)}
                  style={{ cursor: "pointer", transition: "opacity 260ms ease", pointerEvents: isVisible(n.id) ? "auto" : "none" }}
                  opacity={nodeOpacity(n.id)}
                >
                  <rect x={n.x - 13.5} y={n.y - 13.5} width={27} height={27} rx={5} fill="#26232E" stroke={selected === n.id ? "var(--accent)" : "none"} strokeWidth={2} />
                  <foreignObject x={n.x - 13.5} y={n.y - 9} width={27} height={18} style={{ overflow: "visible", pointerEvents: "none" }}>
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 12, color: "#D6D2E8" }}>{n.initial}</div>
                  </foreignObject>
                  <foreignObject x={n.x - 90} y={n.y + 20} width={180} height={30} style={{ overflow: "visible", pointerEvents: "none" }}>
                    <div style={{ width: "100%", textAlign: "center", fontFamily: "var(--ui)", fontSize: 11.5, fontWeight: 600, color: "#4B4B55", textShadow: "0 0 4px #FAFAF8,0 0 4px #FAFAF8,0 0 6px #FAFAF8" }}>{n.label}</div>
                  </foreignObject>
                </g>
              ))}

              {nodes.filter((n) => n.kind === "insight").map((n) => {
                const color = n.insight ? TYPES[n.insight.kind].color : "#999";
                return (
                  <g
                    key={n.id}
                    data-graph-node="true"
                    ref={getNodeRefCallback(n.id)}
                    onClick={() => setSelected(selected === n.id ? null : n.id)}
                    style={{ cursor: "pointer", transition: "opacity 260ms ease", pointerEvents: isVisible(n.id) ? "auto" : "none" }}
                    opacity={nodeOpacity(n.id)}
                  >
                    <circle cx={n.x} cy={n.y} r={8} fill={selected === n.id ? color : "#fff"} stroke={color} strokeWidth={2.5} />
                    {showInsightLabels && (
                      <foreignObject x={n.x - 90} y={n.y + 13} width={180} height={28} style={{ overflow: "visible", pointerEvents: "none" }}>
                        <div style={{ width: "100%", textAlign: "center", fontFamily: "var(--ui)", fontSize: 10.5, color: "#70707B", textShadow: "0 0 4px #FAFAF8,0 0 4px #FAFAF8,0 0 6px #FAFAF8" }}>{n.label}</div>
                      </foreignObject>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="wf-graph-zoom-controls" style={{ position: "absolute", right: 24, top: 20, display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => zoomBy(1.3)} title="Aumentar zoom" style={{ width: 32, height: 32, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 16, fontWeight: 600, color: "var(--ink)", boxShadow: "0 1px 2px rgba(28,28,36,0.08)" }}>+</button>
            <button onClick={() => zoomBy(1 / 1.3)} title="Diminuir zoom" style={{ width: 32, height: 32, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 16, fontWeight: 600, color: "var(--ink)", boxShadow: "0 1px 2px rgba(28,28,36,0.08)" }}>−</button>
            <button onClick={fitToView} title="Ajustar à tela" style={{ width: 32, height: 32, border: "1px solid var(--line)", borderRadius: 8, background: "#fff", fontSize: 13, color: "var(--ink)", boxShadow: "0 1px 2px rgba(28,28,36,0.08)" }}>⤢</button>
          </div>

          <div className="wf-graph-legend" style={{ position: "absolute", left: 24, bottom: 20, padding: "13px 15px", background: "rgba(255,255,255,0.92)", border: "1px solid var(--line)", borderRadius: 10, backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", gap: 7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--mut)" }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: "var(--accent-soft)", border: "1.5px solid var(--accent)", flexShrink: 0 }} />Tema</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--mut)" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: "#fff", border: "2px solid #0F766E", margin: "0 2.5px", flexShrink: 0 }} />Insight <span style={{ color: "var(--faint)" }}>(cor = tipo)</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--mut)" }}><span style={{ width: 11, height: 11, borderRadius: 3, background: "#26232E", margin: "0 1.5px", flexShrink: 0 }} />Livro</div>
            <div style={{ height: 1, background: "var(--line)", margin: "2px 0" }} />
            {(Object.entries(EDGE_STYLE) as [Edge["kind"], typeof EDGE_STYLE[Edge["kind"]]][]).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--mut)" }}>
                <svg width="22" height="6" viewBox="0 0 22 6"><line x1="1" y1="3" x2="21" y2="3" stroke={v.stroke} strokeWidth="2" strokeDasharray={v.dash ?? "none"} /></svg>{v.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selNode && (
        <>
          <div className="wf-graph-backdrop" onClick={() => setSelected(null)} />
          <aside className="wf-graph-aside fade-in" style={{ width: 316, flexShrink: 0, borderLeft: "1px solid var(--line)", background: "#fff", overflowY: "auto", padding: "28px 24px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: selNode.kind === "insight" && selNode.insight ? TYPES[selNode.insight.kind].color : "var(--accent)" }}>
              {selNode.kind === "theme" ? "TEMA CANÔNICO" : selNode.kind === "book" ? "LIVRO" : selNode.insight ? TYPES[selNode.insight.kind].label : ""}
            </span>
            <span onClick={() => setSelected(null)} style={{ cursor: "pointer", color: "var(--faint)", fontSize: 17, lineHeight: 1 }}>×</span>
          </div>

          {selNode.kind === "theme" && selNode.theme && (() => {
            const related = insights.filter((i) => i.themes.some((t) => t.id === selNode.theme!.id));
            const bookCount = new Set(related.map((i) => i.book_id)).size;
            return (
              <>
                <h3 style={{ margin: "10px 0 0", fontFamily: "var(--prose)", fontSize: 19, fontWeight: 600 }}>{selNode.theme.label}</h3>
                <div style={{ marginTop: 5, fontSize: 12.5, color: "var(--mut)" }}>{related.length} insights · {bookCount} livros</div>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                  {related.map((r) => (
                    <div key={r.id} onClick={() => setSelected(`insight:${r.id}`)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title || r.body.slice(0, 40)}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {selNode.kind === "book" && selNode.book && (() => {
            const related = insights.filter((i) => i.book_id === selNode.book!.id);
            return (
              <>
                <h3 style={{ margin: "10px 0 0", fontFamily: "var(--prose)", fontSize: 19, fontWeight: 600 }}>{selNode.book.title}</h3>
                <div style={{ marginTop: 5, fontSize: 12.5, color: "var(--mut)" }}>{selNode.book.author}</div>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 4 }}>
                  {related.map((r) => (
                    <div key={r.id} onClick={() => setSelected(`insight:${r.id}`)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: TYPES[r.kind].color }}>{TYPES[r.kind].name}</div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title || r.body.slice(0, 40)}</div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {selNode.kind === "insight" && selNode.insight && (() => {
            const rec = selNode.insight;
            const book = books.find((b) => b.id === rec.book_id);
            const rel = edges.filter((e) => e.source_id === rec.id || e.target_id === rec.id);
            return (
              <>
                <h3 style={{ margin: "10px 0 0", fontFamily: "var(--prose)", fontSize: 19, fontWeight: 600, lineHeight: 1.3 }}>{rec.title || rec.body.slice(0, 50)}</h3>
                <div style={{ marginTop: 5, fontSize: 12.5, color: "var(--mut)" }}>{book?.title}</div>
                <p style={{ margin: "14px 0 0", fontFamily: "var(--prose)", fontSize: 14.5, lineHeight: 1.6, color: "#3A3A43" }}>{rec.body}</p>
                <div style={{ marginTop: 14, display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {[...rec.themes.map((t) => t.label), ...rec.free_tags].map((c) => (
                    <span key={c} style={{ padding: "2px 9px", borderRadius: 20, background: "var(--panel)", border: "1px solid var(--line)", fontSize: 11.5, color: "var(--mut)" }}>{c}</span>
                  ))}
                </div>
                {rel.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", color: "var(--faint)" }}>CONECTADO A</div>
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                      {rel.map((e) => {
                        const otherId = e.source_id === rec.id ? e.target_id : e.source_id;
                        const other = insights.find((i) => i.id === otherId);
                        const style = EDGE_STYLE[e.kind];
                        return (
                          <div key={e.id} onClick={() => setSelected(`insight:${otherId}`)} style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer" }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: style.stroke }}>{style.label}{e.source_id === rec.id ? " →" : " ←"}</div>
                            <div style={{ marginTop: 2, fontSize: 13, fontWeight: 500 }}>{other?.title || other?.body.slice(0, 40)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <button onClick={() => onOpenEditor(rec.id)} style={{ marginTop: 18, width: "100%", padding: "9px 0", border: "1px solid var(--accent-line)", borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>Abrir no editor</button>
              </>
            );
          })()}
          </aside>
        </>
      )}
    </main>
  );
}
