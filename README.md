

# Weft
 
**Um grafo das ideias do leitor — não das leituras.**
 
A maioria dos apps de leitura organiza livros: o que você leu, quanto leu, sua
nota. O Weft organiza o que fica *depois* do livro — as suas interpretações, e
como elas se conectam entre autores e obras.
 
A entidade central não é o livro. É o **Insight**: a anotação interpretativa do
leitor. Livros e capítulos são apenas contexto. O patrimônio que o produto
constrói é a rede de ideias que atravessa as suas leituras — quando uma anotação
sobre culpa em Dostoiévski se conecta a uma sobre culpa em Kafka, essa conexão é
o produto.
 
> Exemplo real do sistema rodando: uma anotação sobre culpa em *Crime e Castigo*
> traz, por similaridade semântica, uma anotação sobre acusação em *O Processo*
> (Kafka) — dois autores diferentes, conectados por uma ideia. Não é busca por
> palavra-chave; é proximidade de significado.
 
---
 
## O que diferencia este projeto
 
Três decisões de arquitetura carregam o valor do Weft. Elas são a razão de ele
não ser "mais um app de notas com um grafo do lado".
 
### 1. Arestas tipadas, curadas por humano — não por similaridade
 
As conexões entre insights não são "insights parecidos". Cada aresta tem um
**tipo** de um enum fechado:
 
- `conflita_com` — duas ideias em oposição
- `e_precondicao_de` — uma ideia é condição de outra (direcionada)
- `desenvolve` — uma ideia estende outra (direcionada)
- `mesma_ideia` — o mesmo conceito reaparecendo
A similaridade por embedding **sugere** pares candidatos a conectar; quem decide
o *tipo* da relação é o leitor. Isso é deliberado: um grafo onde tudo "se
relaciona com" tudo é visualmente denso e analiticamente vazio. O tipo da aresta
é o que permite perguntar "mostre-me onde autores discordam" em vez de só
"mostre-me o que é parecido".
 
Consequência concreta: nos perfis de exemplo, o grafo mostra **conflito real
entre autores** — ex. Phil Jackson (dissolver o ego no coletivo) vs. Robert
Greene (suprimir o ego para acumular poder individual): mesma ferramenta, fins
opostos. Um `conflita_com` que nenhuma busca por similaridade encontraria,
porque as duas ideias são *próximas* em tema e *opostas* em conclusão.
 
### 2. Similaridade sugere, o humano decide
 
Embeddings entram como *affordância de UI*, não como autoridade. O sistema usa
similaridade vetorial para dizer "esses dois insights talvez se conectem" — e
para na sugestão. A integridade interpretativa do grafo depende de a decisão
final ser do leitor, não de um cosseno.
 
### 3. Temas em meio-termo: canônicos + tags livres
 
Os temas usam um vocabulário **canônico** (lista fechada, ex. `culpa`,
`consciencia`, `poder`, `ego`, `disciplina`) para que a agregação e o filtro
sejam confiáveis — "culpa" é sempre o mesmo nó. Ao lado, cada insight tem
**tags livres** para a nuance que não cabe no vocabulário fixo. Tag livre
recorrente pode ser promovida a canônica. Isso evita os dois extremos: taxonomia
rígida demais (perde nuance) e taxonomia livre demais (o grafo racha porque
"culpa" e "sentimento de culpa" viram nós diferentes).
 
---
 
## Stack
 
| Camada        | Tecnologia                                              |
|---------------|---------------------------------------------------------|
| Frontend      | React + TypeScript + Vite                               |
| Data-fetching | TanStack Query (cache + invalidação seletiva)           |
| Backend       | FastAPI (Python)                                         |
| Banco         | PostgreSQL + pgvector                                    |
| Embeddings    | `sentence-transformers` / `all-MiniLM-L6-v2` (local, 384 dim) |
| Dev           | Docker Compose                                           |
 
**Nota sobre os embeddings:** rodam **localmente**, sem chave de API e sem custo.
Qualquer pessoa clona o repositório e roda sem precisar de billing de nenhum
provedor externo. A escolha do modelo local (384 dimensões) em vez de uma API
paga (1536) foi consciente: para o volume do projeto, a qualidade semântica do
modelo local é suficiente — validado por um teste real onde as sugestões
cruzaram autores corretamente (Dostoiévski ↔ Kafka por "culpa") — e a
independência de serviço pago é uma vantagem, não uma concessão.
 
---
 
## Funcionalidades
 
- Registro de **insights** (interpretações) vinculados a livro/capítulo, com
  tipo (`observação`, `hipótese`, `pergunta`, `discordância`, `conexão`) e temas.
- **Grafo de ideias** interativo (D3-force): zoom, pan, arrastar nós, filtro por
  tema e por livro. Nós de tipos distintos (tema / insight / livro); arestas
  distinguíveis por tipo (conflito, mesma-ideia, direcionadas).
- **Sugestão de conexões** por similaridade semântica (pgvector) — o leitor tipa
  a relação.
- **Busca semântica** entre insights, atravessando livros.
- **Biblioteca** com estado de leitura (`quero_ler` / `lendo` / `lido`) e capa.
- **Timer de sessão de leitura**, com captura de insight durante a leitura.
- **Perfil** do leitor (biblioteca, insights, grafo) — sem gamificação.
### Perfis de exemplo
 
O repositório inclui perfis de demonstração populados com interpretações reais,
cada um em um território temático distinto, para mostrar que o grafo funciona
além de um único gênero:
 
- **Existencialismo / literatura** — Dostoiévski, Camus, Kafka [CONFIRME nomes/logins]
- **Melhoria pessoal / estratégia** — Greene (*48 Leis do Poder*), Peterson
  (*12 Regras para a Vida*), Jackson (*Onze Anéis*) [CONFIRME login]
- **Literatura clássica** — London (*Caninos Brancos*), Dostoiévski
  (*Noites Brancas*), Shakespeare (*Hamlet*) [CONFIRME login]
Cada perfil tem um **conflito-assinatura** no grafo — uma aresta `conflita_com`
entre dois autores sobre a mesma ideia (ex. Jackson vs. Greene sobre o ego).
 
---
 
## Modelo de dados (resumo)
 
- `insight` — entidade central: `body`, `kind`, `free_tags[]`, `embedding` (vetor
  384), origem (`book_id`, `chapter_id`).
- `theme` — vocabulário canônico; N:N com insight via `insight_theme`.
- `insight_edge` — aresta tipada: `kind` (enum) + `description` livre.
- `book` / `chapter` — contexto.
Schema completo em [`schema.sql`](./schema.sql) [CONFIRME caminho].
 
---
 
## Rodando localmente
 
> [CONFIRME todos os comandos abaixo — ajuste aos scripts reais do repositório.]
 
Pré-requisitos: Docker + Docker Compose.
 
```bash
# subir banco + backend
docker compose up
 
# frontend
cd frontend
npm install
npm run dev
```
 
O `docker-compose.yml` usa uma imagem de Postgres com **pgvector** já incluído.
Os embeddings são gerados localmente na primeira execução (o modelo
`all-MiniLM-L6-v2` é baixado uma vez, ~80 MB, depois roda offline).
 
Seed dos perfis de exemplo: [CONFIRME comando, ex. `python -m app.seed`].
 
---
 
## Decisões que ficaram para depois (fase 2)
 
Registradas de propósito como fora do escopo atual — não por esquecimento:
 
- **Evolução temporal** — detectar quando o leitor mudou de opinião sobre um
  tema ao longo do tempo (é a detecção de conflito aplicada ao próprio leitor
  contra si mesmo; depende de histórico que só se acumula com uso).
- **Camada social** — compartilhar o próprio grafo, ver o grafo de outro leitor
  sobre o mesmo livro. Concebida como extensão da tese ("compartilhe suas
  ideias"), não como rede social genérica.
---
 
## Sobre o nome
 
*Weft* é a trama de um tecido — os fios que atravessam a urdidura. A metáfora do
produto: as ideias que atravessam livros diferentes.
