import type { EdgeKind, InsightKind, ReadingStatus } from "./types";

export const TYPES: Record<InsightKind, { label: string; name: string; color: string }> = {
  observacao: { label: "OBSERVAÇÃO", name: "Observação", color: "#0F766E" },
  hipotese: { label: "HIPÓTESE", name: "Hipótese", color: "#B45309" },
  pergunta: { label: "PERGUNTA", name: "Pergunta", color: "#1D4ED8" },
  discordancia: { label: "DISCORDÂNCIA", name: "Discordância", color: "#B91C1C" },
  conexao: { label: "CONEXÃO", name: "Conexão", color: "#7C3AED" },
};

export const EDGE_STYLE: Record<EdgeKind, { stroke: string; dash?: string; label: string; arrow?: boolean }> = {
  mesma_ideia: { stroke: "#0F766E", label: "mesma ideia" },
  conflita_com: { stroke: "#C2410C", dash: "7 5", label: "conflita" },
  desenvolve: { stroke: "var(--accent)", label: "desenvolve", arrow: true },
  e_precondicao_de: { stroke: "#7C3AED", dash: "8 4", label: "pré-condição", arrow: true },
};

export const READING_SESSION_PRESETS = [15, 30, 45, 60];

export const READING_STATUS: Record<ReadingStatus, { label: string; color: string }> = {
  quero_ler: { label: "Quero ler", color: "#71717D" },
  lendo: { label: "Lendo", color: "#B45309" },
  lido: { label: "Lido", color: "#0F766E" },
};

export function excerpt(body: string, len = 220): string {
  const first = body.split("\n")[0];
  return first.length > len ? first.slice(0, len - 1).trimEnd() + "…" : first;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return "menos de 1 min";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.round((totalSeconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 7) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "há 1 semana";
  if (weeks < 5) return `há ${weeks} semanas`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "há 1 mês";
  return `há ${months} meses`;
}
