import type { Book, Chapter, Edge, EdgeKind, Insight, InsightKind, ReadingSession, ReadingStatus, Suggestion, Theme, User } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "weft_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers as Record<string, string> | undefined) } });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  signup: (email: string, password: string, display_name?: string) =>
    request<{ access_token: string; user: User }>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, display_name }) }),
  login: (email: string, password: string) =>
    request<{ access_token: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<User>("/auth/me"),

  listBooks: () => request<Book[]>("/books"),
  createBook: (title: string, author?: string) => request<Book>("/books", { method: "POST", body: JSON.stringify({ title, author }) }),
  createChapter: (bookId: string, label: string) => request<Chapter>(`/books/${bookId}/chapters`, { method: "POST", body: JSON.stringify({ label }) }),
  updateBook: (id: string, payload: Partial<{
    title: string;
    author: string | null;
    cover_url: string | null;
    reading_status: ReadingStatus;
  }>) => request<Book>(`/books/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  listThemes: () => request<Theme[]>("/themes"),

  listInsights: (params?: { kind?: InsightKind; book_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.kind) qs.set("kind", params.kind);
    if (params?.book_id) qs.set("book_id", params.book_id);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<Insight[]>(`/insights${suffix}`);
  },
  getInsight: (id: string) => request<Insight>(`/insights/${id}`),
  createInsight: (payload: {
    book_id: string;
    chapter_id?: string | null;
    title?: string | null;
    body: string;
    kind: InsightKind;
    free_tags: string[];
    theme_ids: string[];
  }) => request<Insight>("/insights", { method: "POST", body: JSON.stringify(payload) }),
  updateInsight: (id: string, payload: Partial<{
    book_id: string;
    chapter_id: string | null;
    title: string | null;
    body: string;
    kind: InsightKind;
    free_tags: string[];
    theme_ids: string[];
  }>) => request<Insight>(`/insights/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  suggestions: (id: string, limit = 4) => request<Suggestion[]>(`/insights/${id}/suggestions?limit=${limit}`),
  deleteInsight: (id: string) => request<void>(`/insights/${id}`, { method: "DELETE" }),

  listEdges: () => request<Edge[]>("/edges"),
  createEdge: (source_id: string, target_id: string, kind: EdgeKind, description?: string) =>
    request<Edge>("/edges", { method: "POST", body: JSON.stringify({ source_id, target_id, kind, description }) }),

  createReadingSession: (payload: { book_id: string; duration_seconds: number; started_at: string }) =>
    request<ReadingSession>("/reading-sessions", { method: "POST", body: JSON.stringify(payload) }),
  listReadingSessions: () => request<ReadingSession[]>("/reading-sessions"),
};

export { ApiError };
