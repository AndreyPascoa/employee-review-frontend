# Pulso — avaliações de desempenho

Frontend do case de avaliação de funcionários, com Next.js, React e TypeScript. Permite escolher um líder, consultar seus subordinados diretos e indiretos, registrar seis notas e consultar a avaliação mais recente. O [backend FastAPI](https://github.com/AndreyPascoa/employee-review-backend) permanece responsável por hierarquia, limite semanal e persistência no PostgreSQL.

## Executar localmente

Pré-requisitos: Node.js 24, npm e a API do backend em execução na porta 8000, com banco e migrações preparados conforme aquele projeto. Este repositório contém somente o frontend.

```sh
git clone https://github.com/AndreyPascoa/employee-review-frontend.git
cd employee-review-frontend
npm ci
```

Copie `.env.example` para `.env.local`. No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

O endereço padrão atende ao Next.js executado no computador e à API com porta publicada localmente:

```dotenv
API_BASE_URL=http://127.0.0.1:8000
```

```sh
npm run dev -- --port 5173
```

Abra [http://localhost:5173](http://localhost:5173). A documentação da API fica em [http://localhost:8000/docs](http://localhost:8000/docs).

Para produção local: `npm run build`, seguido de `npm run start -- --port 5173`.

## Executar o frontend com Docker

Pré-requisitos: Docker Desktop/Engine e Compose, API e PostgreSQL já configurados. O Compose deste repositório inicia **somente o frontend**. Ele utiliza a rede externa `employee-review-network` e o contêiner existente `employee-review-backend`, com a API escutando em `0.0.0.0:8000`.

Confira a rede antes de iniciar:

```sh
docker network inspect employee-review-network
```

Se a sua instalação ainda não tiver essa rede, crie-a e conecte o contêiner da API:

```sh
docker network create employee-review-network
docker network connect employee-review-network employee-review-backend
```

O backend deve continuar conectado à rede do seu banco. Não é necessário recriar o banco ou apagar volumes. Na pasta do frontend:

```sh
docker compose up --build -d
docker compose logs -f frontend
```

Aplicação em [http://localhost:5173](http://localhost:5173). Se houver outro frontend nessa porta, pare somente o contêiner correspondente ou mude a porta à esquerda no Compose. Para parar este frontend: `docker compose down`.

A imagem usa build em etapas, saída standalone e usuário sem privilégios de administrador. `API_BASE_URL` é resolvida pelo servidor Next.js em tempo de execução. Não aparece no JavaScript do navegador e não usa `NEXT_PUBLIC_`.

Para outra rede ou nome de API, configure `BACKEND_NETWORK` e `API_BASE_URL` no ambiente do Compose (ou em `.env`). Exemplo:

```dotenv
BACKEND_NETWORK=minha-rede
API_BASE_URL=http://nome-do-container-da-api:8000
```

O arquivo `.env.local` é destinado ao Next.js local; o Compose usa suas próprias variáveis. Se o frontend estiver em um contêiner de desenvolvimento na rede existente, use `API_BASE_URL=http://employee-review-backend:8000`. Reinicie o servidor após mudar a configuração.

## Usar a aplicação

1. Escolha um **Líder ativo**. A seleção é lembrada no `localStorage` e validada contra a lista fornecida pela API.
2. Consulte a equipe, busque por nome, cargo, e-mail ou identificador e filtre pessoas com ou sem avaliações.
3. Clique em **Avaliar**, atribua notas inteiras de 1 a 4 às seis questões e revise as respostas.
4. Confirme o envio definitivo. A troca de líder e o botão de envio ficam bloqueados durante a solicitação. Ao sair com respostas preenchidas, a interface confirma o descarte.
5. Use **Ver avaliação** para consultar o registro mais recente, com autor, data, respostas, pesos e nota ponderada.

Se outra aba já tiver enviado a avaliação para o mesmo par líder–funcionário na semana, o backend retorna 409 e a interface informa o conflito. Respostas enviadas não têm controles de edição ou exclusão. Erros de conexão preservam o formulário para nova tentativa.

## Requisitos e decisões

| Requisito                                  | Implementação                                              |
| ------------------------------------------ | ---------------------------------------------------------- |
| Framework moderno e TypeScript             | Next.js App Router e React, interface responsiva           |
| Troca simples de líder                     | Seletor com persistência local; sem autenticação completa  |
| Subordinados diretos e indiretos           | Equipe retornada pelo backend para `X-Leader-ID`           |
| Seis questões obrigatórias, notas de 1 a 4 | Formulário e etapa de conferência antes do envio           |
| Pesos do enunciado                         | Questões carregadas da API: 25, 20, 20, 15, 10 e 10        |
| Limite semanal independente por líder      | API valida o envio; a interface trata o conflito           |
| Imutabilidade                              | Consulta somente de leitura após o envio                   |
| Identificador e avaliação mais recente     | Lista e detalhe com respostas, autor e nota                |
| Histórico opcional                         | Não incluído; a API existente oferece a última avaliação   |
| Execução e documentação                    | Instruções locais e Docker, contrato e testes documentados |

### Indicadores e limite semanal

“Com avaliação” e “Sem avaliação” consideram registros de qualquer líder e de qualquer semana. Não representam a conclusão do ciclo do líder selecionado. A API atual fornece apenas a última avaliação; se ela foi feita por outro líder, não é possível deduzir se o líder selecionado já enviou uma avaliação anterior na mesma semana. Por isso o botão **Avaliar** permanece disponível e a API determina a elegibilidade no envio. Não há uma contagem fictícia de pendências semanais.

O resumo da equipe consulta a última avaliação de cada funcionário, com no máximo quatro solicitações simultâneas. Um 404 indica ausência de registro. Outras falhas aparecem como consulta indisponível e não são contadas como ausência. Essa composição atende ao contrato atual; para equipes maiores, um endpoint agregado no backend seria a evolução adequada.

### Semana, hierarquia e datas

A decisão adotada no backend existente considera segunda-feira às 00h até a segunda seguinte, no fuso `America/Sao_Paulo`. A interface apresenta datas nesse fuso e deixa a validação do período a cargo da API.

A expressão do enunciado “respeitando sempre a maior hierarquia” é interpretada pelo backend como a relação entre quem consulta e o funcionário avaliado: um líder acima dele pode consultar sua avaliação, mesmo quando feita por outra liderança. A mais recente é determinada por `submitted_at` e, em empate, `id`, sem prioridade pelo cargo do autor. Essa interpretação deve ser confirmada caso o responsável pelo case espere outra regra.

### Ambiente de demonstração

O uso de dados demonstrativos e a troca por `X-Leader-ID` são propositais para o case. Esse cabeçalho não comprova identidade e não substitui autenticação em produção. A API valida a hierarquia do identificador informado; esconder botões no navegador não é uma barreira de autorização. Não há credenciais de banco neste frontend. `.env.example` contém apenas o endereço local da API.

## Organização

```text
src/app/                     Páginas, layout e rotas HTTP do Next.js
src/components/              Ícones e estados de carregamento/erro
src/features/reviews/
  components/                Equipe, detalhe, formulário e conferência
  types.ts                   Contratos da API e tipos da interface
  model.ts                   Busca, apresentação e prévia ponderada
  team-api.ts                Composição da equipe e últimas avaliações
  use-resource.ts            Leitura assíncrona, cancelamento e atualização
src/lib/api-client.ts        Transporte HTTP e erros normalizados
tests/e2e/                   Fluxos de navegador e contrato do proxy
```

O fluxo é **componentes → cliente HTTP → proxy Next.js → FastAPI → PostgreSQL**. Componentes não acessam o banco. Cálculos de apresentação e transporte ficam separados; a regra definitiva de negócio continua na API. Ao trocar de líder, solicitações antigas são canceladas e seus resultados não entram na nova tela.

## Contrato consumido

O navegador acessa caminhos relativos. O proxy aceita somente estas operações, repassa `X-Leader-ID`, desabilita cache e limita a espera da API a 15 segundos.

| Método e caminho                            | Uso                                                        |
| ------------------------------------------- | ---------------------------------------------------------- |
| `GET /api/leaders`                          | Líderes: `id`, `name`                                      |
| `GET /api/employees`                        | Funcionários: `id`, `name`, `email`, `position_name`       |
| `GET /api/questions`                        | Questões: `id`, `title`, `weight`                          |
| `POST /api/evaluations`                     | Envio de `employee_id` e seis itens `{question_id, score}` |
| `GET /api/evaluations/employee/{id}/latest` | Avaliação, seis respostas e `weighted_score`               |

Equipe, envio e consulta utilizam `X-Leader-ID`. O nome do autor é resolvido pela lista de líderes; a API devolve seu identificador. A nota decimal recebida como string é exibida em português com duas casas, sem alterar o registro. `GET /health` verifica apenas o servidor frontend, sem atestar disponibilidade do backend.

## Verificar

```sh
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia o build de produção na porta 3310 e testa Chromium em desktop e celular. Construa antes de executar os testes. Para depuração: `npm run test:e2e:ui`. Opcionalmente, `PLAYWRIGHT_CHROMIUM_EXECUTABLE` aponta para um Chromium/Chrome local.

Os testes da interface usam respostas HTTP controladas compatíveis com a API publicada. Cobrem persistência da seleção, navegação concorrente, busca, filtros, consulta, formulário obrigatório, payload, conflito semanal, indisponibilidade, descarte, teclado e largura da tela. Não comprovam as regras do PostgreSQL nem substituem a validação conjunta com a API real. Os dados de teste não são usados pela aplicação.

O GitHub Actions executa lint, tipos, build e testes; conserva o relatório quando houver falha.

### Roteiro de validação com a API real

1. Com API e frontend disponíveis, selecione David: Henry, James, Karen e Liam devem aparecer. Bob deve ter 12 subordinados; Alice, 19.
2. Envie uma avaliação para um par ainda não avaliado na semana. Para notas `3, 4, 3, 2, 4, 3`, o resultado é `3,15`.
3. Consulte o último registro e suas seis respostas; atualize a página para conferir a persistência.
4. Tente reenviar para o mesmo par/semana e confirme a mensagem de conflito sem alteração da avaliação anterior.
5. Troque de líder e confirme que os funcionários e resultados anteriores não permanecem na nova equipe.
