# Weft
 
**Um grafo das ideias do leitor — não das leituras.**
 
A maioria dos apps de leitura organiza livros: o que você leu, quanto leu, sua
nota. O Weft organiza o que fica *depois* do livro — as suas interpretações, e
como elas se conectam entre autores e obras.
 
A entidade central não é o livro. É o **Insight**: a anotação interpretativa do
leitor. Livros e capítulos são apenas contexto. O patrimônio que o produto
constrói é a rede de ideias que atravessa as suas leituras.
 
> Exemplo real do sistema rodando: uma anotação sobre culpa em *Crime e Castigo*
> traz, por similaridade semântica, uma anotação sobre acusação em *O Processo*
> (Kafka) — dois autores diferentes, conectados por uma ideia. Não é busca por
> palavra-chave; é proximidade de significado.
 
**🔗 Demo ao vivo:** [CONFIRME — link da Vercel]
*(A demo é uma vitrine read-only: explore os perfis de exemplo, o grafo, os
filtros e os conflitos. Veja "Demo vs. aplicação completa" abaixo.)*
 
---
 
## O que diferencia este projeto
 
Três decisões de arquitetura carregam o valor do Weft.
 
### 1. Arestas tipadas, curadas por humano — não por similaridade
 
As conexões entre insights não são "insights parecidos". Cada aresta tem um
**tipo** de um enum fechado:
 
- \`conflita_com\` — duas ideias em oposição
- \`e_precondicao_de\` — uma ideia é condição de outra (direcionada)
- \`desenvolve\` — uma ideia estende outra (direcionada)
- \`mesma_ideia\` — o mesmo conceito reaparecendo
A similaridade por embedding **sugere** pares candidatos; quem decide o *tipo* da
relação é o leitor. Um grafo onde tudo "se relaciona com" tudo é visualmente
denso e analiticamente vazio. O tipo da aresta é o que permite perguntar
"mostre-me onde autores discordam" em vez de só "mostre-me o que é parecido".
 
Consequência concreta: nos perfis de exemplo, o grafo mostra **conflito real
entre autores** — ex. Phil Jackson (dissolver o ego no coletivo) vs. Robert
Greene (suprimir o ego para acumular poder individual): mesma ferramenta, fins
opostos. Um \`conflita_com\` que nenhuma busca por similaridade encontraria,
porque as ideias são *próximas* em tema e *opostas* em conclusão.
 
### 2. Similaridade sugere, o humano decide
 
Embeddings entram como affordância de UI, não como autoridade. O sistema usa
similaridade vetorial para dizer "esses dois insights talvez se conectem" — e
para na sugestão. A integridade interpretativa do grafo depende de a decisão
final ser do leitor, não de um cosseno.
 
### 3. Temas em meio-termo: canônicos + tags livres
 
Os temas usam um vocabulário **canônico** (lista fechada: \`culpa\`, \`poder\`,
\`ego\`, \`disciplina\`, etc.) para que o filtro seja confiável — "culpa" é sempre
o mesmo nó. Ao lado, cada insight tem **tags livres** para a nuance que não cabe
no vocabulário fixo. Evita os dois extremos: taxonomia rígida demais (perde
nuance) e livre demais (o grafo racha porque "culpa" e "sentimento de culpa"
viram nós diferentes).
 
---
 
## Demo vs. aplicação completa
 
Este repositório contém uma **aplicação full-stack completa**. A **demo
publicada** é uma versão estática dela, por escolha de hospedagem.
 
| | Aplicação completa (código) | Demo publicada |
|---|---|---|
| Frontend | React + TS + Vite | mesmo front |
| Backend | FastAPI (Python) | — |
| Banco | PostgreSQL + pgvector | dados exportados em JSON |
| Embeddings | \`all-MiniLM-L6-v2\` local | pré-computados / desabilitado |
| Escrita (criar/editar/timer) | funcional | somente leitura |
| Explorar (grafo, filtros, conflitos) | sim | sim |
 
A demo é **read-only**: o visitante explora os perfis de exemplo — o grafo, os
filtros por tema e livro, os conflitos entre autores — a partir de dados
estáticos exportados do banco, sem servidor ao vivo. Toda a lógica de escrita
existe no código e funciona com o backend rodando localmente; foi desabilitada
na demo por ela ser estática. Isso permite hospedar a vitrine gratuitamente (só
frontend na Vercel) sem manter backend e banco no ar.
 
---
 
## Stack
 
| Camada        | Tecnologia                                              |
|---------------|---------------------------------------------------------|
| Frontend      | React + TypeScript + Vite                               |
| Data-fetching | TanStack Query (cache + invalidação seletiva)           |
| Backend       | FastAPI (Python)                                         |
| Banco         | PostgreSQL + pgvector                                    |
| Embeddings    | \`sentence-transformers\` / \`all-MiniLM-L6-v2\` (local, 384 dim) |
| Grafo         | D3-force (zoom, pan, drag, filtros)                      |
| Dev           | Docker Compose                                           |
| Deploy (demo) | Vercel (frontend estático)                              |
 
**Sobre os embeddings:** rodam **localmente**, sem chave de API e sem custo.
A escolha do modelo local (384 dim) em vez de uma API paga (1536) foi consciente:
para o volume do projeto a qualidade é suficiente — validado por um teste real
onde as sugestões cruzaram autores corretamente (Dostoiévski ↔ Kafka por
"culpa") — e a independência de serviço pago é uma vantagem, não uma concessão.
 
---
 
## Funcionalidades
 
- **Insights** vinculados a livro/capítulo, com tipo (observação, hipótese,
  pergunta, discordância, conexão) e temas.
- **Grafo de ideias** interativo (D3-force): zoom, pan, arrastar nós, filtro por
  tema e por livro. Nós distintos (tema / insight / livro); arestas por tipo.
- **Sugestão de conexões** por similaridade semântica (pgvector) — o leitor tipa
  a relação.
- **Busca semântica** entre insights, atravessando livros.
- **Biblioteca** com estado de leitura (quero_ler / lendo / lido) e capa.
- **Timer de sessão de leitura** com captura de insight.
- **Perfil** do leitor (biblioteca, insights, grafo) — sem gamificação.
### Perfis de exemplo
 
Perfis de demonstração populados com interpretações reais, cada um em um
território temático distinto:
 
- **Existencialismo / literatura** — Dostoiévski, Camus, Kafka [CONFIRME]
- **Melhoria pessoal / estratégia** — Greene (*48 Leis do Poder*), Peterson
  (*12 Regras para a Vida*), Jackson (*Onze Anéis*)
- [CONFIRME terceiro perfil — literatura clássica: London, Dostoiévski,
  Shakespeare — se incluído]
Cada perfil tem um **conflito-assinatura** no grafo — uma aresta \`conflita_com\`
entre dois autores sobre a mesma ideia (ex. Jackson vs. Greene sobre o ego).
 
---
 
## Modelo de dados (resumo)
 
- \`insight\` — entidade central: \`body\`, \`kind\`, \`free_tags[]\`, \`embedding\`
  (vetor 384), origem (\`book_id\`, \`chapter_id\`).
- \`theme\` — vocabulário canônico; N:N via \`insight_theme\`.
- \`insight_edge\` — aresta tipada: \`kind\` (enum) + \`description\` livre.
- \`book\` / \`chapter\` — contexto.
Schema completo em \`schema.sql\` [CONFIRME caminho].
 
---
 
## Rodando localmente (aplicação completa, com escrita)
 
> [CONFIRME os comandos — ajuste aos scripts reais do repositório.]
 
Pré-requisitos: Docker + Docker Compose.
 
\`\`\`bash
# banco (Postgres + pgvector) + backend (FastAPI)
docker compose up
 
# frontend
cd frontend
npm install
npm run dev
\`\`\`
 
O \`docker-compose.yml\` usa \`pgvector/pgvector:pg16\`. Os embeddings são gerados
localmente na primeira execução (~80 MB baixados uma vez, depois offline).
 
Seed dos perfis: [CONFIRME comando].
 
### Rodando a demo estática localmente
 
\`\`\`bash
cd frontend
VITE_DEMO_MODE=true npm run dev   # [CONFIRME nome exato da flag]
\`\`\`
 
---
 
## Fase 2 (fora do escopo atual, de propósito)
 
- **Evolução temporal** — detectar quando o leitor mudou de opinião sobre um tema
  ao longo do tempo (detecção de conflito aplicada ao leitor contra si mesmo;
  depende de histórico que só se acumula com uso).
- **Camada social** — compartilhar o próprio grafo, ver o grafo de outro leitor
  sobre o mesmo livro. Extensão da tese, não rede social genérica.
---
 
## Sobre o nome
 
*Weft* é a trama de um tecido — os fios que atravessam a urdidura. A metáfora:
as ideias que atravessam livros diferentes.
 
