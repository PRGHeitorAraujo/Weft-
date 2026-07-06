"""Idempotent demo-data seed, ported from the Marginalia.dc.html mockup's
hardcoded BOOKS/INSIGHTS/GEDGES. Run with: python -m app.seed
"""
from .db import SessionLocal
from .embeddings import embed_text, embed_texts
from .models import AppUser, Book, Chapter, Insight, InsightEdge, Theme
from .security import hash_password

DEMO_EMAIL = "helena@example.com"
DEMO_PASSWORD = "marginalia123"

BOOKS = {
    "cc": {"title": "Crime e Castigo", "author": "Fiódor Dostoiévski", "reading_status": "lendo"},
    "pr": {"title": "O Processo", "author": "Franz Kafka", "reading_status": "lido"},
    "es": {"title": "O Estrangeiro", "author": "Albert Camus", "reading_status": "lido"},
}

INSIGHTS = [
    {"id": "i9", "t": "A confissão como alívio, não derrota", "ty": "hipotese", "bk": "cc", "loc": "Parte IV, cap. 4",
     "th": ["culpa", "consciencia", "compaixao"], "tg": ["confissão", "corpo"],
     "body": "Quando Raskólnikov finalmente confessa a Sônia, o tom não é de derrota — é de descanso. A confissão aparece como o único gesto capaz de devolver o corpo ao presente: a febre cede, o tempo volta a andar.\n\nIsso inverte a lógica do castigo: confessar não é o início da pena, é o fim dela. Talvez o verdadeiro castigo fosse a impossibilidade de contar."},
    {"id": "i1", "t": "A febre como confissão do corpo", "ty": "observacao", "bk": "cc", "loc": "Parte II, cap. 1",
     "th": ["culpa", "consciencia"], "tg": ["corpo"],
     "body": "Raskólnikov adoece antes de qualquer suspeita formal. O corpo confessa o que a boca nega: a febre é o primeiro tribunal, anterior à lei."},
    {"id": "i2", "t": "O castigo começa antes do crime", "ty": "hipotese", "bk": "cc", "loc": "Parte I, cap. 6",
     "th": ["culpa", "punicao"], "tg": ["culpa-preventiva"],
     "body": "A angústia dos dias que antecedem o assassinato sugere que o castigo do título não é a Sibéria — é a consciência antecipando a pena."},
    {"id": "i3", "t": "K. organiza a vida ao redor da acusação", "ty": "observacao", "bk": "pr", "loc": "Capítulo 2",
     "th": ["culpa", "poder"], "tg": ["burocracia"],
     "body": "Josef K. nunca nega a culpa em termos absolutos. Ele administra o processo como quem aceita, desde o início, que deve algo a alguém."},
    {"id": "i4", "t": "Culpa sem acusador é infinita?", "ty": "pergunta", "bk": "pr", "loc": "Capítulo 7",
     "th": ["culpa", "punicao"], "tg": [],
     "body": "Quando ninguém formula a acusação, a defesa nunca termina. A culpa sem lei seria mais pesada que a culpa com sentença?"},
    {"id": "i5", "t": "Meursault é o anti-Raskólnikov", "ty": "conexao", "bk": "es", "loc": "Parte II, cap. 3",
     "th": ["culpa", "consciencia", "identidade"], "tg": ["absurdo"],
     "body": "Dois assassinos, dois tribunais: um é esmagado pela consciência antes da lei; o outro é condenado pela lei por não performar consciência."},
    {"id": "i6", "t": "O tribunal julga o caráter, não o ato", "ty": "observacao", "bk": "es", "loc": "Parte II, cap. 4",
     "th": ["moral", "punicao"], "tg": ["performance-social"],
     "body": "O julgamento de Meursault gira em torno do café no velório da mãe, não do tiro. A moral pública precisa de uma narrativa, não de um fato."},
    {"id": "i7", "t": "Porfiri não é consciência benevolente", "ty": "discordancia", "bk": "cc", "loc": "Parte IV, cap. 5",
     "th": ["moral", "poder"], "tg": [],
     "body": "A leitura comum trata Porfiri como guia moral. Discordo: é coerção psicológica com método — o Estado terceirizando a confissão."},
    {"id": "i8", "t": "Sônia carrega a culpa dos outros", "ty": "hipotese", "bk": "cc", "loc": "Parte IV, cap. 4",
     "th": ["compaixao", "sofrimento", "culpa"], "tg": [],
     "body": "Sônia sofre sem ter culpa própria; a compaixão dela funciona como pré-condição para a confissão de Raskólnikov. Ninguém confessa ao vazio."},
]

# Insight-insight edges, ported from the mockup's GEDGES (graph screen), which
# is the mockup's authoritative typed-relation data (unlike SUGG, which was
# static UI copy for one hardcoded editor session).
EDGES = [
    ("i1", "i2", "desenvolve"),
    ("i3", "i4", "desenvolve"),
    ("i2", "i4", "mesma_ideia"),
    ("i9", "i1", "mesma_ideia"),
    ("i1", "i5", "conflita_com"),
    ("i8", "i9", "e_precondicao_de"),
]


def seed_helena(db):
    if db.query(AppUser).filter(AppUser.email == DEMO_EMAIL).first():
        print("Demo user already seeded, skipping.")
        return

    user = AppUser(email=DEMO_EMAIL, display_name="Helena", password_hash=hash_password(DEMO_PASSWORD))
    db.add(user)
    db.flush()

    themes_by_slug = {t.slug: t for t in db.query(Theme).all()}

    books_by_key = {}
    for key, b in BOOKS.items():
        book = Book(user_id=user.id, title=b["title"], author=b["author"], reading_status=b["reading_status"])
        db.add(book)
        db.flush()
        books_by_key[key] = book

    chapters_by_book_label = {}
    insights_by_id = {}
    for i in INSIGHTS:
        book = books_by_key[i["bk"]]
        chapter_key = (i["bk"], i["loc"])
        chapter = chapters_by_book_label.get(chapter_key)
        if chapter is None:
            chapter = Chapter(book_id=book.id, label=i["loc"])
            db.add(chapter)
            db.flush()
            chapters_by_book_label[chapter_key] = chapter

        insight = Insight(
            user_id=user.id,
            book_id=book.id,
            chapter_id=chapter.id,
            title=i["t"],
            body=i["body"],
            kind=i["ty"],
            free_tags=i["tg"],
            embedding=embed_text(i["body"]),
            themes=[themes_by_slug[slug] for slug in i["th"]],
        )
        db.add(insight)
        db.flush()
        insights_by_id[i["id"]] = insight

    for src, tgt, kind in EDGES:
        db.add(InsightEdge(
            user_id=user.id,
            source_id=insights_by_id[src].id,
            target_id=insights_by_id[tgt].id,
            kind=kind,
        ))

    db.commit()
    print(f"Seeded demo user {DEMO_EMAIL} / {DEMO_PASSWORD} with {len(INSIGHTS)} insights and {len(EDGES)} edges.")


# ---------------------------------------------------------------------------
# Perfil "Alan" — melhoria pessoal / estratégia. 3 livros (Greene, Peterson,
# Jackson), todos os insights kind=hipotese. Arestas mesma_ideia conectam
# convergências entre os três autores por tema; conflita_com marca os 3
# atritos deliberados Jackson-vs-Greene (ego, liderança, propósito) —
# nesses 3 temas o par Jackson/Greene fica de fora do triângulo mesma_ideia
# de propósito, já que a mesma dupla não pode ser "mesma ideia" e "conflito"
# ao mesmo tempo sem contradizer a própria demonstração.
# ---------------------------------------------------------------------------

ALAN_EMAIL = "alan@example.com"
ALAN_PASSWORD = "estrategia123"

ALAN_NEW_THEMES = [
    ("medo", "Medo"),
    ("ego", "Ego"),
    ("disciplina", "Disciplina"),
    ("lideranca", "Liderança"),
    ("proposito", "Propósito"),
    ("autocontrole", "Autocontrole"),
    ("competencia", "Competência"),
    ("responsabilidade", "Responsabilidade"),
]

ALAN_BOOKS = {
    "greene": {"title": "48 Leis do Poder", "author": "Robert Greene", "reading_status": "lendo"},
    "peterson": {"title": "12 Regras para a Vida", "author": "Jordan B. Peterson", "reading_status": "lido"},
    "jackson": {"title": "Onze Anéis", "author": "Phil Jackson", "reading_status": "lido"},
}

ALAN_INSIGHTS = [
    # Greene — 48 Leis do Poder
    {"id": "g1", "bk": "greene", "th": ["medo", "poder", "autocontrole"],
     "body": "O medo torna a pessoa previsível — quem teme hesita, entrega informação e vira alvo de manipulação."},
    {"id": "g2", "bk": "greene", "th": ["autocontrole", "poder"],
     "body": "Você nunca controla o outro por completo, só as próprias emoções, tempo e linguagem — o poder começa no autodomínio."},
    {"id": "g3", "bk": "greene", "th": ["ego", "poder", "razao"],
     "body": "O ego cega o estrategista: faz subestimar o adversário e perder sinais — suprimir o ego é condição pra enxergar claro."},
    {"id": "g4", "bk": "greene", "th": ["disciplina", "poder"],
     "body": "Preparação elimina o improviso perigoso — a disciplina prévia é o que dá margem de manobra depois."},
    {"id": "g5", "bk": "greene", "th": ["lideranca", "poder"],
     "body": "Influência é mais poderosa que autoridade — o poder que não precisa se impor é o mais durável."},
    {"id": "g6", "bk": "greene", "th": ["razao", "poder"],
     "body": "A informação vale mais que a ação rápida — quem observa acumula vantagem sobre quem reage."},
    {"id": "g7", "bk": "greene", "th": ["poder", "competencia"],
     "body": "O poder é consequência da estratégia — persegui-lo diretamente o afasta; construir competência o atrai."},
    {"id": "g8", "bk": "greene", "th": ["autocontrole", "poder"],
     "body": "Quem reage emocionalmente revela fraquezas — a emoção exposta é informação entregue ao adversário."},
    {"id": "g9", "bk": "greene", "th": ["poder", "lideranca"],
     "body": "Ambientes são reflexo das pessoas influentes — quem tem poder molda o entorno."},
    {"id": "g10", "bk": "greene", "th": ["poder", "autocontrole"],
     "body": "O melhor estrategista não precisa mostrar força — o poder que se exibe é mais fraco que o que se esconde."},
    {"id": "g11", "bk": "greene", "th": ["proposito", "poder"],
     "body": "Quem tem objetivo claro é difícil de manipular — o propósito é uma armadura contra o jogo dos outros."},
    {"id": "g12", "bk": "greene", "th": ["disciplina", "poder"],
     "body": "Preparação e aprendizado contínuo — o poder duradouro se acumula devagar."},

    # Peterson — 12 Regras para a Vida
    {"id": "p1", "bk": "peterson", "th": ["medo", "identidade", "responsabilidade"],
     "body": "Comparar-se com quem você era ontem, e não com o outro, dissolve o medo do julgamento social."},
    {"id": "p2", "bk": "peterson", "th": ["disciplina", "autocontrole", "responsabilidade"],
     "body": "'Arrume seu quarto' não é sobre o quarto — é ordem interna como pré-condição de qualquer ordem externa."},
    {"id": "p3", "bk": "peterson", "th": ["ego", "razao", "identidade"],
     "body": "O orgulho excessivo trava o aprendizado — admitir que pode estar errado é pré-condição pra crescer."},
    {"id": "p4", "bk": "peterson", "th": ["disciplina", "sofrimento"],
     "body": "Rotina reduz sofrimento — a estrutura diária é o que diminui o caos, não o que o aprisiona."},
    {"id": "p5", "bk": "peterson", "th": ["lideranca", "responsabilidade"],
     "body": "Liderar pelo exemplo — a autoridade moral vem do que você faz, não do que impõe."},
    {"id": "p6", "bk": "peterson", "th": ["razao", "autocontrole"],
     "body": "Ouça, pense, depois fale — a impulsividade verbal é uma forma de desordem."},
    {"id": "p7", "bk": "peterson", "th": ["competencia", "proposito"],
     "body": "Focar no processo, não no resultado — o resultado é subproduto do processo bem feito."},
    {"id": "p8", "bk": "peterson", "th": ["medo", "autocontrole"],
     "body": "Você sente medo, mas não precisa obedecê-lo — a emoção informa, não comanda."},
    {"id": "p9", "bk": "peterson", "th": ["responsabilidade", "lideranca"],
     "body": "A responsabilidade individual é a base — o ambiente melhora quando o indivíduo assume o próprio peso."},
    {"id": "p10", "bk": "peterson", "th": ["competencia", "ego"],
     "body": "Competência verdadeira não precisa de demonstração constante — a arrogância é sinal de insegurança, não de força."},
    {"id": "p11", "bk": "peterson", "th": ["proposito", "medo", "sofrimento"],
     "body": "Encontrar significado é o que sustenta diante do sofrimento — sem propósito, qualquer crítica destrói."},
    {"id": "p12", "bk": "peterson", "th": ["disciplina", "competencia"],
     "body": "Melhoria diária e paciência — nenhuma excelência é súbita."},

    # Jackson — Onze Anéis
    {"id": "j1", "bk": "jackson", "th": ["medo", "razao", "autocontrole"],
     "body": "O jogador dominado pelo medo força arremessos e perde a leitura do jogo — clareza vence ansiedade."},
    {"id": "j2", "bk": "jackson", "th": ["autocontrole", "disciplina"],
     "body": "Jackson ensinava respiração e meditação antes de jogadas — observar os próprios pensamentos precede controlar a quadra."},
    {"id": "j3", "bk": "jackson", "th": ["ego", "identidade", "lideranca"],
     "body": "Jordan e Kobe só viraram campeões quando o ego passou a servir o grupo — o ego do craque é obstáculo, não ativo."},
    {"id": "j4", "bk": "jackson", "th": ["disciplina", "competencia"],
     "body": "Repetir o básico milhares de vezes é o que cria liberdade dentro do jogo — a automação libera a criação."},
    {"id": "j5", "bk": "jackson", "th": ["lideranca", "autocontrole"],
     "body": "Jackson nunca gritava pra controlar — criava um ambiente onde o jogador queria entregar o melhor; a melhor liderança produz autonomia."},
    {"id": "j6", "bk": "jackson", "th": ["razao", "competencia"],
     "body": "Ler o jogo antes de decidir — a leitura precede a jogada, sempre."},
    {"id": "j7", "bk": "jackson", "th": ["competencia", "lideranca"],
     "body": "Campeonatos são consequência da cultura, não o alvo direto — construir a cultura produz a vitória."},
    {"id": "j8", "bk": "jackson", "th": ["autocontrole", "razao"],
     "body": "A emoção precisa existir, mas não dirigir a decisão — senti-la sem ser governado por ela."},
    {"id": "j9", "bk": "jackson", "th": ["lideranca", "identidade"],
     "body": "A cultura do time nasce dos indivíduos — você muda o grupo mudando as pessoas."},
    {"id": "j10", "bk": "jackson", "th": ["lideranca", "autocontrole"],
     "body": "Jackson era calmo, nunca precisava provar autoridade — a confiança silenciosa dispensa demonstração."},
    {"id": "j11", "bk": "jackson", "th": ["proposito", "medo", "lideranca"],
     "body": "Jogar por algo maior que si mesmo — o propósito coletivo dissolve o medo individual."},
    {"id": "j12", "bk": "jackson", "th": ["disciplina", "competencia"],
     "body": "Repetição e paciência — o campeonato é o topo de anos de base."},
]

# Convergência (mesma_ideia): trios por tema comum, um insight por autor.
# "ego" e "proposito" teriam um terceiro lado Jackson-Greene, mas esse par
# específico é reservado para conflita_com (ver ALAN_CONFLITA_COM) — por
# isso só 2 arestas nesses dois grupos, não 3. "responsabilidade" não entra
# aqui: só Peterson usa esse tema, não há convergência entre autores pra ligar.
ALAN_MESMA_IDEIA = [
    ("g1", "p8"), ("g1", "j1"), ("p8", "j1"),          # medo
    ("g3", "p3"), ("p3", "j3"),                          # ego (g3-j3 é conflito, não convergência)
    ("g12", "p12"), ("g12", "j12"), ("p12", "j12"),     # disciplina
    ("g5", "p5"), ("g5", "j10"), ("p5", "j10"),          # liderança
    ("g11", "p11"), ("p11", "j11"),                      # propósito (g11-j11 é conflito, não convergência)
    ("g8", "p8"), ("g8", "j8"), ("p8", "j8"),            # autocontrole
    ("g7", "p7"), ("g7", "j7"), ("p7", "j7"),            # competência
]

# O atrito Jackson-vs-Greene: a assinatura do perfil.
ALAN_CONFLITA_COM = [
    ("j3", "g3", "Jackson quer dissolver o ego no coletivo, abrindo mão do poder individual; Greene quer suprimir o ego "
                 "para preservar e acumular o poder individual. Mesma ferramenta, fins opostos."),
    ("j5", "g9", "Liderança que se apaga para criar autonomia vs. poder que molda o ambiente à própria imagem."),
    ("j11", "g11", "Propósito como entrega ao coletivo vs. propósito como blindagem individual."),
]

ALAN_PRECONDICAO = [
    ("p2", "g2"),
    ("p2", "j2"),
    ("p4", "j4"),
    ("p3", "p10"),
]


def seed_alan(db):
    if db.query(AppUser).filter(AppUser.email == ALAN_EMAIL).first():
        print("Alan already seeded, skipping.")
        return

    user = AppUser(email=ALAN_EMAIL, display_name="Alan", password_hash=hash_password(ALAN_PASSWORD))
    db.add(user)
    db.flush()

    # Themes before insights: create any of the 8 new ones missing, then
    # build the slug lookup insights will reference next.
    existing_slugs = {t.slug for t in db.query(Theme).all()}
    for slug, label in ALAN_NEW_THEMES:
        if slug not in existing_slugs:
            db.add(Theme(slug=slug, label=label))
    db.flush()
    themes_by_slug = {t.slug: t for t in db.query(Theme).all()}

    books_by_key = {}
    for key, b in ALAN_BOOKS.items():
        book = Book(user_id=user.id, title=b["title"], author=b["author"], reading_status=b["reading_status"])
        db.add(book)
        db.flush()
        books_by_key[key] = book

    # Real local embeddings (all-MiniLM-L6-v2, 384-dim) for every insight —
    # batched in one call so Alan's suggestions work like everyone else's.
    vectors = embed_texts([i["body"] for i in ALAN_INSIGHTS])

    insights_by_id = {}
    for i, vector in zip(ALAN_INSIGHTS, vectors):
        book = books_by_key[i["bk"]]
        insight = Insight(
            user_id=user.id,
            book_id=book.id,
            chapter_id=None,
            title=None,
            body=i["body"],
            kind="hipotese",
            free_tags=[],
            embedding=vector,
            themes=[themes_by_slug[slug] for slug in i["th"]],
        )
        db.add(insight)
        db.flush()
        insights_by_id[i["id"]] = insight

    for src, tgt in ALAN_MESMA_IDEIA:
        db.add(InsightEdge(user_id=user.id, source_id=insights_by_id[src].id, target_id=insights_by_id[tgt].id, kind="mesma_ideia"))
    for src, tgt, desc in ALAN_CONFLITA_COM:
        db.add(InsightEdge(user_id=user.id, source_id=insights_by_id[src].id, target_id=insights_by_id[tgt].id, kind="conflita_com", description=desc))
    for src, tgt in ALAN_PRECONDICAO:
        db.add(InsightEdge(user_id=user.id, source_id=insights_by_id[src].id, target_id=insights_by_id[tgt].id, kind="e_precondicao_de"))

    db.commit()
    total_edges = len(ALAN_MESMA_IDEIA) + len(ALAN_CONFLITA_COM) + len(ALAN_PRECONDICAO)
    print(f"Seeded Alan ({ALAN_EMAIL} / {ALAN_PASSWORD}) with {len(ALAN_INSIGHTS)} insights and {total_edges} edges.")


# ---------------------------------------------------------------------------
# Perfil "Marina" — literatura clássica / ficção literária. 3 livros (London,
# Dostoiévski, Shakespeare), todos os insights kind=hipotese. Arestas
# mesma_ideia ligam convergências entre os três autores por tema (ambiente,
# amor, isolamento); conflita_com marca o atrito instinto-vs-razão entre
# Caninos Brancos e Hamlet — a assinatura do perfil, com Noites Brancas
# oscilando entre os dois polos.
# ---------------------------------------------------------------------------

MARINA_EMAIL = "marina@example.com"
MARINA_PASSWORD = "literatura123"

MARINA_NEW_THEMES = [
    ("ambiente", "Ambiente"),
    ("instinto", "Instinto"),
    ("acao", "Ação"),
    ("esperanca", "Esperança"),
    ("confianca", "Confiança"),
    ("liberdade", "Liberdade"),
    ("amor", "Amor"),
]

MARINA_BOOKS = {
    "london": {"title": "Caninos Brancos", "author": "Jack London", "reading_status": "lido"},
    "dostoievski": {"title": "Noites Brancas", "author": "Fiódor Dostoiévski", "reading_status": "lendo"},
    "shakespeare": {"title": "Hamlet", "author": "William Shakespeare", "reading_status": "lido"},
}

MARINA_INSIGHTS = [
    # London — Caninos Brancos
    {"id": "l1", "bk": "london", "th": ["ambiente", "identidade"],
     "body": "O ser nasce de um jeito, mas o ambiente o refaz — violência, confiança e amor em Caninos Brancos são todos aprendidos, não inatos."},
    {"id": "l2", "bk": "london", "th": ["isolamento", "medo"],
     "body": "Para o lobo, a solidão é sobrevivência, mas também medo constante — o isolamento protege e ameaça ao mesmo tempo."},
    {"id": "l3", "bk": "london", "th": ["amor", "confianca"],
     "body": "O amor entra como confiança: pela primeira vez ele percebe que a força não é a única linguagem possível."},
    {"id": "l4", "bk": "london", "th": ["ambiente", "instinto"],
     "body": "Ele aprende violência porque vive violência — a ferida ensina a ferir."},
    {"id": "l5", "bk": "london", "th": ["instinto", "acao"],
     "body": "Caninos Brancos age por instinto, rápido e sem hesitar — a sobrevivência é da ação, não da dúvida."},
    {"id": "l6", "bk": "london", "th": ["liberdade", "sofrimento"],
     "body": "Liberdade sem segurança pode ser sofrimento — ser livre não é o mesmo que viver bem."},

    # Dostoiévski — Noites Brancas
    {"id": "d1", "bk": "dostoievski", "th": ["isolamento", "ambiente"],
     "body": "O Sonhador vive mais dentro da própria cabeça que no mundo — a cidade e a solidão moldam tanto quanto a natureza molda o lobo."},
    {"id": "d2", "bk": "dostoievski", "th": ["isolamento", "razao"],
     "body": "A imaginação cria mundos melhores que a realidade, e é justamente isso que impede o Sonhador de viver a real."},
    {"id": "d3", "bk": "dostoievski", "th": ["amor", "esperanca"],
     "body": "O amor entra como esperança — curto, condenado a terminar, e ainda assim transforma por inteiro."},
    {"id": "d4", "bk": "dostoievski", "th": ["confianca", "sofrimento"],
     "body": "Ele entrega confiança rápido demais e sofre por isso — confiar sem discernimento é uma ferida à espera."},
    {"id": "d5", "bk": "dostoievski", "th": ["esperanca", "amor"],
     "body": "O Sonhador termina só, mas agradece pelos poucos dias felizes — nem toda felicidade precisa durar pra ter valor."},
    {"id": "d6", "bk": "dostoievski", "th": ["liberdade", "acao"],
     "body": "Ele é livre, mas não consegue viver — a liberdade sem coragem de agir vira paralisia."},

    # Shakespeare — Hamlet
    {"id": "h1", "bk": "shakespeare", "th": ["ambiente", "identidade"],
     "body": "O castelo é corrupção, mentira e traição — e Hamlet lentamente se torna parecido com o mundo que tenta combater."},
    {"id": "h2", "bk": "shakespeare", "th": ["isolamento", "confianca"],
     "body": "Cercado de gente, Hamlet não confia em ninguém — o isolamento não é ausência de pessoas, é ausência de confiança."},
    {"id": "h3", "bk": "shakespeare", "th": ["amor", "sofrimento"],
     "body": "O amor por Ofélia é destruído pela obsessão, política e vingança — o afeto não sobrevive ao cálculo."},
    {"id": "h4", "bk": "shakespeare", "th": ["acao", "sofrimento"],
     "body": "Hamlet combate assassinatos matando — tenta curar a violência com violência e só a multiplica."},
    {"id": "h5", "bk": "shakespeare", "th": ["razao", "acao"],
     "body": "Hamlet pensa, analisa, duvida e demora a agir — o excesso de razão paralisa tanto quanto o excesso de impulso."},
    {"id": "h6", "bk": "shakespeare", "th": ["liberdade", "identidade"],
     "body": "Príncipe com enorme poder, e ainda assim prisioneiro da própria missão — ter poder não é ser livre."},
]

# Convergência (mesma_ideia): trios por tema comum, um insight por autor.
MARINA_MESMA_IDEIA = [
    ("l1", "d1"), ("l1", "h1"), ("d1", "h1"),  # ambiente / identidade
    ("l3", "d3"), ("l3", "h3"), ("d3", "h3"),  # amor
    ("l2", "d2"), ("l2", "h2"), ("d2", "h2"),  # isolamento
    ("d4", "h2"),  # confiança: entregue demais (Dostoiévski) vs. ausente (Hamlet) — contraste sobre o mesmo tema
]

# O atrito London-vs-Shakespeare: a assinatura do perfil.
MARINA_CONFLITA_COM = [
    ("l5", "h5", "London faz da ação instintiva a via de sobrevivência; Shakespeare mostra a razão excessiva como "
                 "paralisia. Instinto puro vs. razão paralisante — os dois polos entre os quais o Sonhador de "
                 "Dostoiévski oscila."),
]

MARINA_PRECONDICAO = [
    ("d2", "d6"),
]


def seed_marina(db):
    if db.query(AppUser).filter(AppUser.email == MARINA_EMAIL).first():
        print("Marina already seeded, skipping.")
        return

    user = AppUser(email=MARINA_EMAIL, display_name="Marina", password_hash=hash_password(MARINA_PASSWORD))
    db.add(user)
    db.flush()

    existing_slugs = {t.slug for t in db.query(Theme).all()}
    for slug, label in MARINA_NEW_THEMES:
        if slug not in existing_slugs:
            db.add(Theme(slug=slug, label=label))
    db.flush()
    themes_by_slug = {t.slug: t for t in db.query(Theme).all()}

    books_by_key = {}
    for key, b in MARINA_BOOKS.items():
        book = Book(user_id=user.id, title=b["title"], author=b["author"], reading_status=b["reading_status"])
        db.add(book)
        db.flush()
        books_by_key[key] = book

    vectors = embed_texts([i["body"] for i in MARINA_INSIGHTS])

    insights_by_id = {}
    for i, vector in zip(MARINA_INSIGHTS, vectors):
        book = books_by_key[i["bk"]]
        insight = Insight(
            user_id=user.id,
            book_id=book.id,
            chapter_id=None,
            title=None,
            body=i["body"],
            kind="hipotese",
            free_tags=[],
            embedding=vector,
            themes=[themes_by_slug[slug] for slug in i["th"]],
        )
        db.add(insight)
        db.flush()
        insights_by_id[i["id"]] = insight

    for src, tgt in MARINA_MESMA_IDEIA:
        db.add(InsightEdge(user_id=user.id, source_id=insights_by_id[src].id, target_id=insights_by_id[tgt].id, kind="mesma_ideia"))
    for src, tgt, desc in MARINA_CONFLITA_COM:
        db.add(InsightEdge(user_id=user.id, source_id=insights_by_id[src].id, target_id=insights_by_id[tgt].id, kind="conflita_com", description=desc))
    for src, tgt in MARINA_PRECONDICAO:
        db.add(InsightEdge(user_id=user.id, source_id=insights_by_id[src].id, target_id=insights_by_id[tgt].id, kind="e_precondicao_de"))

    db.commit()
    total_edges = len(MARINA_MESMA_IDEIA) + len(MARINA_CONFLITA_COM) + len(MARINA_PRECONDICAO)
    print(f"Seeded Marina ({MARINA_EMAIL} / {MARINA_PASSWORD}) with {len(MARINA_INSIGHTS)} insights and {total_edges} edges.")


def seed():
    db = SessionLocal()
    try:
        seed_helena(db)
        seed_alan(db)
        seed_marina(db)
    finally:
        db.close()


if __name__ == "__main__":
    seed()
