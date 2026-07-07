import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api";

const input: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 13.5,
  background: "#fff",
  color: "var(--ink)",
};

const label: CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 };

function tabStyle(on: boolean): CSSProperties {
  return {
    padding: "7px 0",
    border: "none",
    borderRadius: 7,
    fontSize: 13,
    cursor: "pointer",
    fontWeight: on ? 600 : 500,
    color: on ? "var(--ink)" : "var(--mut)",
    background: on ? "#fff" : "transparent",
    boxShadow: on ? "0 1px 2px rgba(28,28,36,0.08)" : "none",
    transition: "background .15s",
  };
}

function fetchWikiThumb(page: string): Promise<string | null> {
  return fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`)
    .then((r) => r.json())
    .then((j) => j?.thumbnail?.source ?? null)
    .catch(() => null);
}

interface Props {
  // Demo mode: this screen is a visual cover only — no real auth form, no
  // network calls to a backend. A single CTA hands off to the profile
  // picker instead of logging in.
  demoMode?: boolean;
  onEnterDemo?: () => void;
}

export default function AuthScreen({ demoMode = false, onEnterDemo }: Props) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [holidayImg, setHolidayImg] = useState<string | null>(null);
  const [greeneImg, setGreeneImg] = useState<string | null>(null);

  useEffect(() => {
    fetchWikiThumb("Ryan_Holiday").then(setHolidayImg);
    fetchWikiThumb("Robert_Greene_(American_author)").then(setGreeneImg);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(email, password, displayName || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo deu errado. Tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  const avatarStyle = (url: string | null, borderColor: string): CSSProperties =>
    url
      ? { width: 56, height: 56, borderRadius: "50%", flexShrink: 0, backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "50% 15%", filter: "grayscale(1)", opacity: 0.65, border: `1.5px solid ${borderColor}`, backgroundColor: "#EDECF4" }
      : { display: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", overflowY: "auto" }}>
      <div aria-hidden="true" className="wf-auth-decor" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}>
          <path d="M170 210 L305 345 M305 345 L200 520 M305 345 L150 690 M1255 200 L1150 380 M1150 380 L1280 555 M1150 380 L1230 720 M1280 555 L1230 720" stroke="#DDDCE8" strokeWidth={1.2} strokeDasharray="3 6" fill="none" />
        </svg>

        <div style={{ position: "absolute", left: "22%", top: "6%", animation: "drift2 12s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="https://commons.wikimedia.org/wiki/Special:FilePath/Jordan%20Peterson%20June%202018.jpg?width=120"
              alt=""
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", objectPosition: "50% 15%", filter: "grayscale(1)", opacity: 0.65, border: "1.5px solid #DDDCE8", background: "#EDECF4" }}
            />
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 14, color: "#B4B3C2" }}>Jordan Peterson</span>
          </div>
        </div>

        <div style={{ position: "absolute", right: "20%", top: "6%", animation: "drift1 13s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 14, color: "#B4B3C2" }}>Ryan Holiday</span>
            <span style={avatarStyle(holidayImg, "var(--accent-line)")} />
          </div>
        </div>

        <div style={{ position: "absolute", right: "24%", top: "87%", animation: "drift3 12s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={avatarStyle(greeneImg, "#DDDCE8")} />
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 14, color: "#B4B3C2" }}>Robert Greene</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: "24%", top: "88%", animation: "drift1 14s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2.5, background: "#E4E3EC" }} />
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 13, color: "#BEBDCB" }}>O Obstáculo é o Caminho</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: "9%", top: "20%", animation: "drift1 11s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="https://commons.wikimedia.org/wiki/Special:FilePath/Vasily%20Perov%20-%20%D0%9F%D0%BE%D1%80%D1%82%D1%80%D0%B5%D1%82%20%D0%A4.%D0%9C.%D0%94%D0%BE%D1%81%D1%82%D0%BE%D0%B5%D0%B2%D1%81%D0%BA%D0%BE%D0%B3%D0%BE%20-%20Google%20Art%20Project.jpg?width=120"
              alt=""
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", objectPosition: "50% 20%", filter: "grayscale(1)", opacity: 0.65, border: "1.5px solid var(--accent-line)", background: "#EDECF4" }}
            />
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 14, color: "#B4B3C2" }}>Dostoiévski</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: "19%", top: "36%", animation: "drift2 13s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--accent-soft)", border: "1.5px solid var(--accent-line)" }} />
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "#B4B3C2" }}>culpa</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: "12%", top: "56%", animation: "drift3 12s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: 2.5, background: "#E4E3EC" }} />
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 13, color: "#BEBDCB" }}>O Processo</span>
          </div>
        </div>

        <div style={{ position: "absolute", left: "8%", top: "75%", animation: "drift2 14s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="https://commons.wikimedia.org/wiki/Special:FilePath/Albert%20Camus%2C%20gagnant%20de%20prix%20Nobel%2C%20portrait%20en%20buste%2C%20pos%C3%A9%20au%20bureau%2C%20faisant%20face%20%C3%A0%20gauche%2C%20cigarette%20de%20tabagisme.jpg?width=120"
              alt=""
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", objectPosition: "50% 15%", filter: "grayscale(1)", opacity: 0.65, border: "1.5px solid #DDDCE8", background: "#EDECF4" }}
            />
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 14, color: "#B4B3C2" }}>Camus</span>
          </div>
        </div>

        <div style={{ position: "absolute", right: "9%", top: "19%", animation: "drift3 12s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 14, color: "#B4B3C2" }}>Kafka</span>
            <img
              src="https://commons.wikimedia.org/wiki/Special:FilePath/Kafka1906_cropped.jpg?width=120"
              alt=""
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", objectPosition: "50% 20%", filter: "grayscale(1)", opacity: 0.65, border: "1.5px solid var(--accent-line)", background: "#EDECF4" }}
            />
          </div>
        </div>

        <div style={{ position: "absolute", right: "16%", top: "39%", animation: "drift1 13s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", color: "#B4B3C2" }}>consciência</span>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: "var(--accent-soft)", border: "1.5px solid var(--accent-line)" }} />
          </div>
        </div>

        <div style={{ position: "absolute", right: "8%", top: "58%", animation: "drift2 11s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 14, color: "#B4B3C2" }}>Nietzsche</span>
            <img
              src="https://commons.wikimedia.org/wiki/Special:FilePath/Nietzsche187a.jpg?width=120"
              alt=""
              onError={(e) => { e.currentTarget.style.display = "none"; }}
              style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", objectPosition: "50% 20%", filter: "grayscale(1)", opacity: 0.65, border: "1.5px solid #DDDCE8", background: "#EDECF4" }}
            />
          </div>
        </div>

        <div style={{ position: "absolute", right: "12%", top: "77%", animation: "drift3 14s ease-in-out infinite" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--prose)", fontStyle: "italic", fontSize: 13, color: "#BEBDCB" }}>Crime e Castigo</span>
            <span style={{ width: 9, height: 9, borderRadius: 2.5, background: "#E4E3EC" }} />
          </div>
        </div>
      </div>

      <div className="fade-up" style={{ position: "relative", width: "100%", maxWidth: 360, padding: "40px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--prose)", fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>Weft</span>
        </div>
        <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 14, color: "var(--mut)", lineHeight: 1.5 }}>
          Os livros passam. As suas ideias ficam
          <br />
          — conectadas.
        </p>

        {demoMode ? (
          <div style={{ marginTop: 30 }}>
            <button
              onClick={onEnterDemo}
              style={{ width: "100%", padding: "12px 0", border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(28,28,36,0.18)" }}
            >
              Explorar a demo →
            </button>
            <p style={{ margin: "12px 0 0", textAlign: "center", fontSize: 12, color: "var(--faint)" }}>
              Demonstração somente leitura, sem cadastro — escolha um dos 3 perfis de exemplo.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, padding: 3, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 9 }}>
              <button onClick={() => { setMode("login"); setError(null); }} style={tabStyle(mode === "login")}>Entrar</button>
              <button onClick={() => { setMode("signup"); setError(null); }} style={tabStyle(mode === "signup")}>Criar conta</button>
            </div>

            <form onSubmit={submit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {mode === "signup" && (
                <div>
                  <label style={label}>Nome</label>
                  <input style={input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como devemos te chamar" />
                </div>
              )}
              <div>
                <label style={label}>E-mail</label>
                <input style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
              </div>
              <div>
                <label style={label}>Senha</label>
                <input style={input} type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "login" ? "Sua senha" : "Mínimo de 8 caracteres"} />
              </div>

              {error && <p style={{ margin: 0, fontSize: 13, color: "#B91C1C" }}>{error}</p>}

              <button
                type="submit"
                disabled={busy}
                style={{ marginTop: 10, width: "100%", padding: "10px 0", border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(28,28,36,0.18)", opacity: busy ? 0.7 : 1 }}
              >
                {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
