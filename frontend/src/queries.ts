import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Edge, Insight, ReadingStatus } from "./types";

export const queryKeys = {
  books: ["books"] as const,
  book: (id: string) => ["book", id] as const,
  insights: ["insights"] as const,
  insight: (id: string) => ["insight", id] as const,
  insightSuggestions: (id: string) => ["insight", id, "suggestions"] as const,
  themes: ["themes"] as const,
  edges: ["edges"] as const,
  readingSessions: ["reading-sessions"] as const,
};

type CreateInsightPayload = Parameters<typeof api.createInsight>[0];
type UpdateInsightPayload = Parameters<typeof api.updateInsight>[1];

// ---- Queries: read-side replacement for reloadAll()'s four GETs. ----

export function useBooks() {
  return useQuery({ queryKey: queryKeys.books, queryFn: api.listBooks });
}

export function useInsights() {
  return useQuery({ queryKey: queryKeys.insights, queryFn: () => api.listInsights() });
}

export function useThemes() {
  return useQuery({ queryKey: queryKeys.themes, queryFn: api.listThemes });
}

export function useEdges() {
  return useQuery({ queryKey: queryKeys.edges, queryFn: api.listEdges });
}

// Seeded from the already-loaded insights list when possible, so opening an
// insight that's already in cache is instant — no loading flicker, no
// redundant request. Falls back to a real fetch only on a cold cache (e.g.
// deep link to a single insight).
export function useInsight(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.insight(id ?? ""),
    queryFn: () => api.getInsight(id as string),
    enabled: !!id,
    initialData: () => {
      if (!id) return undefined;
      return qc.getQueryData<Insight[]>(queryKeys.insights)?.find((i) => i.id === id);
    },
    initialDataUpdatedAt: () => qc.getQueryState(queryKeys.insights)?.dataUpdatedAt,
  });
}

export function useSuggestions(insightId: string | null) {
  return useQuery({
    queryKey: queryKeys.insightSuggestions(insightId ?? ""),
    queryFn: () => api.suggestions(insightId as string, 4),
    enabled: !!insightId,
  });
}

// ---- Mutations: selective invalidation replacing reloadAll()'s refetch-everything. ----

export function useUpdateReadingStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, status }: { bookId: string; status: ReadingStatus }) => api.updateBook(bookId, { reading_status: status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books }),
  });
}

type UpdateBookPayload = Parameters<typeof api.updateBook>[1];

export function useUpdateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBookPayload }) => api.updateBook(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books }),
  });
}

export function useCreateBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title, author }: { title: string; author?: string }) => api.createBook(title, author),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books }),
  });
}

export function useCreateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bookId, label }: { bookId: string; label: string }) => api.createChapter(bookId, label),
    // Chapters live nested in Book.chapters (joinedload) — no separate list query to invalidate.
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.books }),
  });
}

export function useCreateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateInsightPayload) => api.createInsight(payload),
    onSuccess: (created) => {
      qc.setQueryData(queryKeys.insight(created.id), created);
      qc.invalidateQueries({ queryKey: queryKeys.insights });
    },
  });
}

export function useUpdateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateInsightPayload }) => api.updateInsight(id, payload),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.insight(updated.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.insights });
    },
  });
}

export function useDeleteInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteInsight(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.insights });
      qc.invalidateQueries({ queryKey: queryKeys.edges });
    },
  });
}

export function useReadingSessions() {
  return useQuery({ queryKey: queryKeys.readingSessions, queryFn: api.listReadingSessions });
}

export function useCreateReadingSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { book_id: string; duration_seconds: number; started_at: string }) => api.createReadingSession(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.readingSessions }),
  });
}

// Optimistic: the graph and the "already connected" suggestion state should
// react the instant the user clicks "Conectar", not after a round trip.
export function useCreateEdge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetId, kind, description }: { sourceId: string; targetId: string; kind: Edge["kind"]; description?: string }) =>
      api.createEdge(sourceId, targetId, kind, description),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: queryKeys.edges });
      const previous = qc.getQueryData<Edge[]>(queryKeys.edges);
      const optimistic: Edge = {
        id: `optimistic-${Date.now()}`,
        source_id: vars.sourceId,
        target_id: vars.targetId,
        kind: vars.kind,
        description: vars.description ?? null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<Edge[]>(queryKeys.edges, (old) => [...(old ?? []), optimistic]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.edges, context.previous);
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.edges });
      qc.invalidateQueries({ queryKey: queryKeys.insightSuggestions(vars.sourceId) });
    },
  });
}
