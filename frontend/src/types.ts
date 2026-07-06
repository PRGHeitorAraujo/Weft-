export type InsightKind = "observacao" | "hipotese" | "pergunta" | "discordancia" | "conexao";
export type EdgeKind = "conflita_com" | "e_precondicao_de" | "desenvolve" | "mesma_ideia";
export type ReadingStatus = "quero_ler" | "lendo" | "lido";
export type Screen = "home" | "insights" | "editor" | "graph" | "book" | "reading" | "profile";

export interface User {
  id: string;
  email: string;
  display_name: string | null;
}

export interface Chapter {
  id: string;
  book_id: string;
  label: string | null;
  position: number | null;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  reading_status: ReadingStatus;
  created_at: string;
  chapters: Chapter[];
}

export interface Theme {
  id: string;
  slug: string;
  label: string;
}

export interface Insight {
  id: string;
  book_id: string;
  chapter_id: string | null;
  title: string | null;
  body: string;
  kind: InsightKind;
  free_tags: string[];
  created_at: string;
  themes: Theme[];
}

export interface Suggestion {
  insight: Insight;
  book_title: string;
  distance: number;
}

export interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  kind: EdgeKind;
  description: string | null;
  created_at: string;
}

export interface ReadingSession {
  id: string;
  book_id: string;
  duration_seconds: number;
  started_at: string;
  created_at: string;
}
