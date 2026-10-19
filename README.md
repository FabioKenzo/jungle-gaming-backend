
# Desafio Técnico Jungle Gaming Backend

API REST desenvolvida como parte de um desafio técnico de backend, com foco no gerenciamento de carteiras digitais e operações financeiras relacionadas a apostas.

O projeto permite criar e consultar carteiras, realizar movimentações de saldo e processar operações de apostas, ganhos, perdas, reembolsos e reversões.

A implementação prioriza a **consistência dos dados, a rastreabilidade das operações, a idempotência e o controle de concorrência**.

## Tecnologias utilizadas

- **TypeScript** — Linguagem de programação
- **NestJS** — Framework para construção da API REST
- **MikroORM** — ORM e gerenciamento de migrations
- **PostgreSQL 16** — Banco de dados relacional
- **Bun** — Runtime e gerenciador de dependências
- **Docker e Docker Compose** — Containerização da aplicação e do banco de dados
- **Jest** — Testes automatizados

## Funcionalidades

### Gerenciamento de carteiras

- Criação de carteiras associadas a jogadores e moedas.
- Consulta de saldo.
- Operações de crédito e débito.
- Registro das movimentações em um ledger para rastreabilidade.

### Operações de apostas

| Operação | Descrição |
|---|---|
| `BET` | Registra uma aposta e debita o valor da carteira. |
| `WIN` | Registra um ganho e credita o valor na carteira. |
| `LOSS` | Registra o resultado de perda de uma aposta. |
| `REFUND` | Processa o reembolso de uma operação elegível. |
| `ROLLBACK` | Realiza a reversão de uma operação anterior. |

### Integridade das operações

A implementação utiliza transações de banco de dados para manter a consistência entre o saldo da carteira e o histórico de movimentações.

Foram aplicados mecanismos de:

- **Idempotência:** evita a aplicação duplicada de operações em requisições repetidas.
- **Controle de concorrência:** utiliza bloqueios pessimistas para proteger atualizações simultâneas de saldo.
- **Rastreabilidade:** registra as movimentações financeiras e suas referências.
- **Validação de entrada:** valida os dados recebidos pela API.

## Arquitetura

O projeto utiliza uma organização em camadas, separando as responsabilidades da aplicação.

- **Controllers:** recebem as requisições HTTP e expõem os endpoints.
- **Services:** coordenam os casos de uso e as regras de negócio.
- **Repositories e entidades:** realizam a persistência dos dados por meio do MikroORM.
- **DTOs:** definem e validam os dados de entrada.

Essa separação busca facilitar a manutenção, os testes e a evolução das funcionalidades.

## Como executar

### Pré-requisitos

Para executar a aplicação utilizando containers, é necessário ter instalado:

- Docker
- Docker Compose

Não é necessário instalar Bun, NestJS ou PostgreSQL localmente para iniciar a aplicação pelo Docker.

### 1. Clonar o repositório

```bash
git clone https://github.com/FabioKenzo/jungle-gaming-backend.git
cd jungle-gaming-backend
```

### 2. Configurar as variáveis de ambiente

O projeto utiliza variáveis de ambiente para configurar a conexão com o PostgreSQL.

Um arquivo `.env.example` está disponível na raiz do repositório com as variáveis necessárias.

No **Windows (CMD)**, execute:

```cmd
copy .env.example .env
```

No **Linux ou macOS**, execute:

```bash
cp .env.example .env
```

Em seguida, abra o arquivo `.env` e substitua o valor de `DB_PASSWORD` por uma senha local.

Exemplo de configuração:

```dotenv
DB_USER=jungle
DB_PASSWORD=DEFINA_SUA_SENHA_LOCAL
DB_NAME=jungle_gaming
DB_HOST=localhost
DB_PORT=5433
```

**Importante:**

- O arquivo `.env` contém configurações locais e não deve ser enviado ao GitHub.
- O arquivo `.env.example` é versionado apenas como referência.
- O Docker Compose utiliza as variáveis `DB_USER`, `DB_PASSWORD` e `DB_NAME` para configurar o PostgreSQL e a API.
- As credenciais devem ser utilizadas exclusivamente no ambiente local de desenvolvimento e avaliação.

### 3. Iniciar a aplicação

```bash
docker compose up -d --build
```

O Docker Compose realiza a construção da imagem da API e inicializa os serviços:

- PostgreSQL 16
- API NestJS

A API aguarda o PostgreSQL ficar saudável antes de iniciar.

Durante a inicialização, as migrations do MikroORM são executadas automaticamente, preparando a estrutura do banco de dados.

### 4. Verificar os containers

```bash
docker compose ps
```

Os serviços `postgres` e `api` devem estar em execução.

### 5. Consultar os logs

```bash
docker compose logs -f api
```

A inicialização bem-sucedida apresenta mensagens semelhantes a:

```text
Successfully migrated up to the latest version
Nest application successfully started
```

### 6. Testar a aplicação

A API fica disponível em:

```text
http://localhost:3000
```

Para verificar se está respondendo:

```bash
curl http://localhost:3000/
```

Resposta esperada:

```text
Hello World!
```

### 7. Encerrar os containers

```bash
docker compose down
```

Esse comando encerra os containers sem remover o volume persistente do PostgreSQL.

### Portas utilizadas

| Serviço | Porta local |
|---|---|
| API NestJS | `3000` |
| PostgreSQL | `5433` |

## Endpoints

### Carteiras

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/wallets` | Criar carteira |
| `GET` | `/wallets/:playerId/:currency` | Consultar carteira |
| `POST` | `/wallets/:playerId/:currency/credit` | Creditar saldo |
| `POST` | `/wallets/:playerId/:currency/debit` | Debitar saldo |

### Apostas e transações

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/wagering/bet` | Registrar aposta |
| `POST` | `/wagering/win` | Registrar ganho |
| `POST` | `/wagering/loss` | Registrar perda |
| `POST` | `/wagering/refund` | Processar reembolso |
| `POST` | `/wagering/rollback` | Reverter uma operação |

Os endpoints recebem os dados necessários por meio do corpo da requisição, conforme os DTOs definidos na aplicação.

## Testes automatizados

O projeto utiliza Jest para executar testes automatizados.

Para instalar as dependências e executar os testes de ponta a ponta, é necessário ter o Bun instalado localmente.

Com o PostgreSQL disponível e as variáveis de ambiente configuradas, execute:

```bash
bun install
bun run test:e2e
```

**Observação:** a execução dos testes E2E depende da configuração do ambiente de testes e da disponibilidade do banco de dados.

Durante o desenvolvimento, a suíte de testes E2E foi executada com sucesso, totalizando **4 suítes e 9 testes aprovados**.

Também foram realizados testes manuais de operações como `REFUND` e `ROLLBACK`, incluindo a verificação do saldo e das movimentações persistidas no banco de dados.

Além disso, a aplicação foi validada em um ambiente Docker isolado, utilizando um volume PostgreSQL vazio, para verificar a execução automática das migrations e a inicialização da API.

## Principais desafios e aprendizados

Este foi meu primeiro projeto desenvolvido com **NestJS e MikroORM**.

Minha experiência anterior está concentrada principalmente no desenvolvimento backend com **Java e Spring Boot**, o que facilitou a adaptação a conceitos como injeção de dependências, organização em camadas, controllers, services e persistência de dados.

O maior desafio foi compreender e implementar corretamente as regras de negócio relacionadas às movimentações financeiras, principalmente nos cenários que envolvem **idempotência, concorrência, reembolso e reversão de operações**.

Durante o desenvolvimento, aprofundei meus conhecimentos sobre transações de banco de dados, bloqueios pessimistas, integridade dos saldos e a importância de manter um histórico rastreável das movimentações.

Outro aprendizado importante foi a configuração do ambiente com Docker, incluindo a inicialização da API, o gerenciamento de variáveis de ambiente e a execução automática das migrations em um banco de dados novo.

## Possíveis evoluções

Como melhorias futuras, considero:

- **Mensageria com Amazon SQS:** implementar o processamento assíncrono de eventos e operações, reduzindo o acoplamento entre componentes. Atualmente estou aprofundando meus conhecimentos em mensageria utilizando Apache Kafka, com o objetivo de aplicar esses conceitos em integrações com serviços como o Amazon SQS.
- **Reconciliação automática:** implementar o processamento de operações registradas como `PENDING_REFERENCE` quando suas transações de referência estiverem disponíveis.
- **Ampliação dos testes automatizados:** adicionar mais cenários de concorrência, reembolso, reversão e falhas transacionais.
- **Observabilidade:** implementar logs estruturados, métricas e mecanismos de monitoramento.

Nesta versão, operações com referências ainda inexistentes podem ser registradas como `PENDING_REFERENCE`, mas sua reconciliação automática não foi implementada.

## Autor

**Fabio Kenzo**

Desenvolvedor backend com foco em Java, Spring Boot e desenvolvimento de APIs REST, expandindo conhecimentos em TypeScript e NestJS.
