-- =====================================================================
-- Grafo de Insights do Leitor — Schema v1
-- Postgres + pgvector
--
-- Entidade central: insight (a interpretação do leitor, não o livro).
-- Book/Chapter são apenas CONTEXTO.
-- Arestas entre insights são TIPADAS (enum) + descrição livre.
-- Temas em meio-termo: canônicos (tabela) + tags livres (array).
--
-- CORTADO do v1 (fase 2): evolução temporal / mudança de opinião.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------

-- Tipo do insight: o que a anotação É.
-- Saiu das suas 5 anotações (observação, hipótese, pergunta, discordância).
CREATE TYPE insight_kind AS ENUM (
    'observacao',    -- constata algo sobre o texto
    'hipotese',      -- propõe uma leitura/tese
    'pergunta',      -- levanta uma questão em aberto
    'discordancia',  -- discorda do autor/personagem/ideia
    'conexao'        -- aponta relação com outra leitura
);

-- Tipo da ARESTA entre dois insights: enum fechado, para permitir query
-- por tipo de relação. Cada valor tem exemplo real das suas anotações.
CREATE TYPE edge_kind AS ENUM (
    'conflita_com',      -- culpa (Dostoiévski) vs 48 Leis do Poder
    'e_precondicao_de',  -- isolamento (4) é condição da teoria em (1)
    'desenvolve',        -- Sonya (3) estende a resposta ao sofrimento de (5)
    'mesma_ideia'         -- 'culpa' reaparecendo em outro livro
);

-- Estado de leitura do livro: gestão de biblioteca, não o núcleo do produto.
CREATE TYPE reading_status AS ENUM (
    'quero_ler',
    'lendo',
    'lido'
);

-- ---------------------------------------------------------------------
-- CONTEXTO: livros e capítulos (NÃO são o coração do sistema)
-- ---------------------------------------------------------------------

CREATE TABLE app_user (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT UNIQUE NOT NULL,
    display_name  TEXT,
    -- added: real auth needs credentials — not present in the original DDL.
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE book (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    title          TEXT NOT NULL,
    author         TEXT,
    cover_url      TEXT,           -- URL colada pelo usuário; sem upload de arquivo na v1
    reading_status reading_status NOT NULL DEFAULT 'quero_ler',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Capítulo é opcional: origem do insight, quando o leitor registra.
CREATE TABLE chapter (
    id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id  UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    label    TEXT,          -- "Parte 1, cap. 6" — texto livre, não numeração rígida
    position INT            -- ordem para exibição, opcional
);

-- ---------------------------------------------------------------------
-- TEMAS: meio-termo (canônicos + tags livres)
-- ---------------------------------------------------------------------

-- Vocabulário CANÔNICO: conjunto pequeno e controlado.
-- Garante que 'culpa' seja sempre o mesmo nó (query confiável).
-- Semeado a partir das suas anotações; cresce quando uma tag livre
-- recorrente é "promovida" a canônica.
CREATE TABLE theme (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug       TEXT UNIQUE NOT NULL,   -- 'culpa', 'consciencia', 'poder'
    label      TEXT NOT NULL,          -- 'Culpa'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- INSIGHT: a entidade central
-- ---------------------------------------------------------------------

CREATE TABLE insight (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    book_id     UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    chapter_id  UUID REFERENCES chapter(id) ON DELETE SET NULL,

    title       TEXT,                  -- added: mockup shows an optional title separate from body
    body        TEXT NOT NULL,          -- a anotação do leitor, na íntegra
    kind        insight_kind NOT NULL DEFAULT 'observacao',

    -- tags LIVRES: preservam nuance e revelam temas recorrentes
    -- que depois podem virar canônicos.
    free_tags   TEXT[] NOT NULL DEFAULT '{}',

    -- embedding do body, para busca semântica e para SUGERIR arestas
    -- candidatas (similaridade não CRIA aresta — só sugere par a validar).
    -- 384 = dimensão do all-MiniLM-L6-v2 (sentence-transformers, local).
    embedding   vector(384),

    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- N:N entre insight e temas canônicos
CREATE TABLE insight_theme (
    insight_id UUID NOT NULL REFERENCES insight(id) ON DELETE CASCADE,
    theme_id   UUID NOT NULL REFERENCES theme(id) ON DELETE CASCADE,
    PRIMARY KEY (insight_id, theme_id)
);

-- ---------------------------------------------------------------------
-- ARESTAS: o coração do grafo
-- enum fechado (para query) + descrição livre (para não perder nuance)
-- ---------------------------------------------------------------------

CREATE TABLE insight_edge (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,

    source_id   UUID NOT NULL REFERENCES insight(id) ON DELETE CASCADE,
    target_id   UUID NOT NULL REFERENCES insight(id) ON DELETE CASCADE,

    kind        edge_kind NOT NULL,     -- enum: filtra 'me mostra os conflitos'
    description TEXT,                    -- frase que explica ESTA relação

    -- 'conflita_com', 'mesma_ideia' são simétricas; 'e_precondicao_de',
    -- 'desenvolve' são direcionadas (source -> target). A direção importa
    -- para os direcionados; para os simétricos é convenção.
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (source_id <> target_id),
    UNIQUE (source_id, target_id, kind)
);

-- ---------------------------------------------------------------------
-- SESSÃO DE LEITURA: timer com o propósito de criar o momento de captura
-- de interpretação durante a leitura — não é rastreamento de hábito/meta.
-- Sem streak, sem conquistas. Só registra o que foi lido, quando e por
-- quanto tempo; gravada de uma vez ao final da sessão (não a cada tick).
-- ---------------------------------------------------------------------

CREATE TABLE reading_session (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    book_id          UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    duration_seconds INT NOT NULL CHECK (duration_seconds > 0),
    started_at       TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------

CREATE INDEX idx_insight_user       ON insight(user_id);
CREATE INDEX idx_insight_book       ON insight(book_id);
CREATE INDEX idx_insight_free_tags  ON insight USING GIN (free_tags);

-- Busca semântica por similaridade de cosseno (ivfflat).
-- lists=100 é razoável para poucos milhares de linhas; reavaliar com volume.
CREATE INDEX idx_insight_embedding  ON insight
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_edge_source        ON insight_edge(source_id);
CREATE INDEX idx_edge_target        ON insight_edge(target_id);
CREATE INDEX idx_edge_kind          ON insight_edge(kind);

CREATE INDEX idx_reading_session_user ON reading_session(user_id);
CREATE INDEX idx_reading_session_book ON reading_session(book_id);

-- ---------------------------------------------------------------------
-- SEED dos temas canônicos (extraídos das suas 5 anotações de C&C)
-- ---------------------------------------------------------------------

INSERT INTO theme (slug, label) VALUES
    ('culpa',        'Culpa'),
    ('consciencia',  'Consciência'),
    ('moral',        'Moral'),
    ('punicao',      'Punição'),
    ('isolamento',   'Isolamento'),
    ('identidade',   'Identidade'),
    ('poder',        'Poder'),
    ('sofrimento',   'Sofrimento'),
    ('compaixao',    'Compaixão'),
    ('razao',        'Razão')
ON CONFLICT (slug) DO NOTHING;

-- Temas do perfil "Alan" (melhoria pessoal / estratégia) — adicionados à
-- mesma taxonomia canônica; poder, identidade, razao e sofrimento acima
-- são reutilizados por ele, não duplicados.
INSERT INTO theme (slug, label) VALUES
    ('medo',             'Medo'),
    ('ego',              'Ego'),
    ('disciplina',       'Disciplina'),
    ('lideranca',        'Liderança'),
    ('proposito',        'Propósito'),
    ('autocontrole',     'Autocontrole'),
    ('competencia',      'Competência'),
    ('responsabilidade', 'Responsabilidade')
ON CONFLICT (slug) DO NOTHING;

-- Temas do perfil "Marina" (literatura clássica / ficção literária) —
-- isolamento, identidade, sofrimento, razao e medo acima são reutilizados,
-- não duplicados.
INSERT INTO theme (slug, label) VALUES
    ('ambiente',   'Ambiente'),
    ('instinto',   'Instinto'),
    ('acao',       'Ação'),
    ('esperanca',  'Esperança'),
    ('confianca',  'Confiança'),
    ('liberdade',  'Liberdade'),
    ('amor',       'Amor')
ON CONFLICT (slug) DO NOTHING;
