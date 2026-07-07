// Static, read-only backend used when VITE_DEMO_MODE=true. Data comes from
// frontend/src/demo-data/*.json — real content exported from the local
// Postgres instance (see backend/app/export_demo_data.py), not invented
// sample data. There is no write path: every mutation throws
// ReadOnlyDemoError, and the UI hides the controls that would call them
// (see DEMO_MODE checks in Sidebar/Library/BookDetail/Editor/Insights).
import type { Book, Chapter, Edge, EdgeKind, Insight, InsightKind, ReadingSession, ReadingStatus, Suggestion, Theme, User } from "./types";
import alanData from "./demo-data/alan.json";
import helenaData from "./demo-data/helena.json";
import marinaData from "./demo-data/marina.json";

interface RawProfile {
  user: User;
  books: Book[];
  themes: Theme[];
  insights: Insight[];
  edges: Edge[];
}

interface DemoProfile extends RawProfile {
  tagline: string;
}

const TAGLINES: Record<string, string> = {
  "helena@example.com": "Existencialismo — Dostoiévski, Kafka, Camus",
  "alan@example.com": "Melhoria pessoal / estratégia — Greene, Peterson, Jackson",
  "marina@example.com": "Literatura clássica — London, Dostoiévski, Shakespeare",
};

export const DEMO_PROFILES: DemoProfile[] = [helenaData, alanData, marinaData].map((raw) => ({
  ...(raw as RawProfile),
  tagline: TAGLINES[(raw as RawProfile).user.email] ?? "",
}));

export class ReadOnlyDemoError extends Error {
  constructor(message = "Esta é uma demo somente leitura — ações de escrita estão desativadas.") {
    super(message);
  }
}

function readOnly(): never {
  throw new ReadOnlyDemoError();
}

const TOKEN_PREFIX = "demo:";

function currentEmail(): string | null {
  const token = localStorage.getItem("weft_token");
  return token?.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
}

function getProfile(): DemoProfile {
  const email = currentEmail();
  const profile = DEMO_PROFILES.find((p) => p.user.email === email);
  if (!profile) throw new Error("Selecione um perfil de demonstração.");
  return profile;
}

export const demoApi = {
  signup: async (_email: string, _password: string, _display_name?: string): Promise<{ access_token: string; user: User }> => readOnly(),
  login: async (email: string, _password: string): Promise<{ access_token: string; user: User }> => {
    const profile = DEMO_PROFILES.find((p) => p.user.email === email);
    if (!profile) throw new Error("Perfil de demonstração não encontrado.");
    return { access_token: `${TOKEN_PREFIX}${profile.user.email}`, user: profile.user };
  },
  me: async (): Promise<User> => getProfile().user,

  listBooks: async (): Promise<Book[]> => getProfile().books,
  createBook: async (_title: string, _author?: string): Promise<Book> => readOnly(),
  createChapter: async (_bookId: string, _label: string): Promise<Chapter> => readOnly(),
  updateBook: async (_id: string, _payload: Partial<{ title: string; author: string | null; cover_url: string | null; reading_status: ReadingStatus }>): Promise<Book> => readOnly(),

  listThemes: async (): Promise<Theme[]> => getProfile().themes,

  listInsights: async (params?: { kind?: InsightKind; book_id?: string }): Promise<Insight[]> => {
    const insights = getProfile().insights;
    return insights.filter((i) => (!params?.kind || i.kind === params.kind) && (!params?.book_id || i.book_id === params.book_id));
  },
  getInsight: async (id: string): Promise<Insight> => {
    const found = getProfile().insights.find((i) => i.id === id);
    if (!found) throw new Error("Insight não encontrado.");
    return found;
  },
  createInsight: async (_payload: {
    book_id: string;
    chapter_id?: string | null;
    title?: string | null;
    body: string;
    kind: InsightKind;
    free_tags: string[];
    theme_ids: string[];
  }): Promise<Insight> => readOnly(),
  updateInsight: async (_id: string, _payload: Partial<{
    book_id: string;
    chapter_id: string | null;
    title: string | null;
    body: string;
    kind: InsightKind;
    free_tags: string[];
    theme_ids: string[];
  }>): Promise<Insight> => readOnly(),
  // Semantic suggestions depend on server-side embeddings, which the static
  // demo doesn't have — disabled rather than faked.
  suggestions: async (_id: string, _limit = 4): Promise<Suggestion[]> => [],
  deleteInsight: async (_id: string): Promise<void> => readOnly(),

  listEdges: async (): Promise<Edge[]> => getProfile().edges,
  createEdge: async (_source_id: string, _target_id: string, _kind: EdgeKind, _description?: string): Promise<Edge> => readOnly(),

  createReadingSession: async (_payload: { book_id: string; duration_seconds: number; started_at: string }): Promise<ReadingSession> => readOnly(),
  listReadingSessions: async (): Promise<ReadingSession[]> => [],
};
