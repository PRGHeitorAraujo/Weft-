import { useState } from "react";
import { DEMO_MODE } from "./api";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Sidebar from "./components/Sidebar";
import { useBooks, useEdges, useInsights, useThemes, useUpdateReadingStatus } from "./queries";
import AuthScreen from "./screens/AuthScreen";
import BookDetail from "./screens/BookDetail";
import DemoProfilePicker from "./screens/DemoProfilePicker";
import Editor from "./screens/Editor";
import Graph from "./screens/Graph";
import Insights from "./screens/Insights";
import Library from "./screens/Library";
import Profile from "./screens/Profile";
import ReadingSession from "./screens/ReadingSession";
import type { Screen } from "./types";

function AppShell() {
  const { user, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>("home");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [viewingBookId, setViewingBookId] = useState<string | null>(null);
  const [bookEditIntentId, setBookEditIntentId] = useState<string | null>(null);
  const [graphEntryBookId, setGraphEntryBookId] = useState<string | null>(null);
  const [readingBookId, setReadingBookId] = useState<string | null>(null);

  const booksQuery = useBooks();
  const insightsQuery = useInsights();
  const themesQuery = useThemes();
  const edgesQuery = useEdges();
  const updateReadingStatus = useUpdateReadingStatus();

  const openInsight = (id: string | "new") => {
    setEditingId(id);
    setScreen("editor");
  };

  // Wraps setScreen for every "normal" navigation (sidebar clicks) so a
  // graph entry seeded by a specific book (see openGraphForBook) doesn't
  // leak into the next time the user opens the graph from the sidebar.
  const navigate = (s: Screen) => {
    setGraphEntryBookId(null);
    setReadingBookId(null);
    setBookEditIntentId(null);
    setScreen(s);
  };

  const openBook = (bookId: string) => {
    setBookEditIntentId(null);
    setViewingBookId(bookId);
    setScreen("book");
  };

  const openBookForEdit = (bookId: string) => {
    setBookEditIntentId(bookId);
    setViewingBookId(bookId);
    setScreen("book");
  };

  const openGraphForBook = (bookId: string) => {
    setGraphEntryBookId(bookId);
    setScreen("graph");
  };

  const openReadingSession = (bookId: string) => {
    setReadingBookId(bookId);
    setScreen("reading");
  };

  const isLoading = booksQuery.isLoading || insightsQuery.isLoading || themesQuery.isLoading || edgesQuery.isLoading;
  const isError = booksQuery.isError || insightsQuery.isError || themesQuery.isError || edgesQuery.isError;

  if (isLoading || !user) {
    return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--mut)" }}>Carregando…</div>;
  }
  if (isError) {
    return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--mut)" }}>Não foi possível carregar seus dados. Recarregue a página.</div>;
  }

  const books = booksQuery.data ?? [];
  const insights = insightsQuery.data ?? [];
  const themes = themesQuery.data ?? [];
  const edges = edgesQuery.data ?? [];

  const themeCount = new Set(insights.flatMap((i) => i.themes.map((t) => t.id))).size;
  const viewingBook = viewingBookId ? books.find((b) => b.id === viewingBookId) ?? null : null;
  const readingBook = readingBookId ? books.find((b) => b.id === readingBookId) ?? null : null;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar
        screen={screen}
        onNavigate={navigate}
        onNewInsight={() => openInsight("new")}
        user={user}
        insightCount={insights.length}
        bookCount={books.length}
        onLogout={logout}
      />
      {screen === "home" && (
        <Library
          insights={insights}
          books={books}
          themeCount={themeCount}
          userName={user.display_name || user.email.split("@")[0]}
          onOpen={openInsight}
          onNavigateInsights={() => navigate("insights")}
          onNewInsight={() => openInsight("new")}
          onReadingStatusChange={(bookId, status) => updateReadingStatus.mutate({ bookId, status })}
          onOpenBook={openBook}
          onEditBook={openBookForEdit}
          onStartReadingSession={openReadingSession}
        />
      )}
      {screen === "insights" && <Insights insights={insights} books={books} onOpen={openInsight} />}
      {screen === "book" && viewingBook && (
        <BookDetail
          key={viewingBook.id}
          book={viewingBook}
          insights={insights.filter((i) => i.book_id === viewingBook.id)}
          onBack={() => navigate("home")}
          onOpenInsight={openInsight}
          onOpenGraph={openGraphForBook}
          onStartReadingSession={openReadingSession}
          autoEdit={bookEditIntentId === viewingBook.id}
        />
      )}
      {screen === "reading" && readingBook && (
        <ReadingSession book={readingBook} onExit={() => navigate("home")} />
      )}
      {screen === "profile" && (
        <Profile
          user={user}
          books={books}
          insights={insights}
          onOpenBook={openBook}
          onNavigateInsights={() => navigate("insights")}
          onNavigateGraph={() => navigate("graph")}
          onLogout={logout}
        />
      )}
      {screen === "editor" && (
        <Editor
          insightId={editingId ?? "new"}
          books={books}
          themes={themes}
          edges={edges}
          insights={insights}
          onNavigateInsights={() => navigate("insights")}
          onCreated={(id) => setEditingId(id)}
          onOpenInsight={openInsight}
        />
      )}
      {screen === "graph" && (
        <Graph
          insights={insights}
          books={books}
          themes={themes}
          edges={edges}
          onOpenEditor={openInsight}
          initialBookFilter={graphEntryBookId}
        />
      )}
    </div>
  );
}

function Gate() {
  const { user, loading } = useAuth();
  // Demo mode shows the real AuthScreen's visual cover first (background
  // graph, tagline) as the product's first impression, then hands off to
  // the profile picker — never a functional login.
  const [demoEntered, setDemoEntered] = useState(false);
  if (loading) {
    return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--mut)" }}>Carregando…</div>;
  }
  if (!user) {
    if (!DEMO_MODE) return <AuthScreen />;
    return demoEntered ? <DemoProfilePicker /> : <AuthScreen demoMode onEnterDemo={() => setDemoEntered(true)} />;
  }
  return <AppShell />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
