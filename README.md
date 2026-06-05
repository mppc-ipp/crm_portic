# CRM Portic

CRM interno do Portic — monólito Django com PostgreSQL, templates + HTMX.

## Arranque rápido

A partir da pasta **com** `manage.py` (recomendado se clonou só o repo interno):

```bash
cd crm_portic
cp .env.example .env
docker compose up --build
```

Ou a partir da pasta pai `C:\Users\Estágio\crm_portic` (onde também existe `docker-compose.yml`):

```bash
cp crm_portic/.env.example crm_portic/.env
docker compose up --build
```

**Importante:** o arranque sobe **3 serviços** — `db`, `web` (Django API) e `frontend` (Next.js).  
Se só vires `db` e `web` em `docker compose ps`, o `:3000` não abre. Corrige com:

```bash
docker compose up -d --build
docker compose ps   # deve listar frontend na porta 3000
```

Na **primeira visita** a http://localhost:3000, o Next.js pode demorar ~10–15 s a compilar — aguarda e recarrega.

| Serviço | URL |
|---------|-----|
| **Frontend Next.js** | http://localhost:3000 |
| **API Django** | http://localhost:8000/api/ |
| **Admin Django** | http://localhost:8000/admin/ |

Use o **frontend** (http://localhost:3000) para o dia-a-dia.  
http://localhost:8000 redireciona automaticamente para o frontend — a interface antiga Django já não é a principal.  
O admin Django (http://localhost:8000/admin/) serve para configurar salas, viaturas e projetos.

### Credenciais iniciais (desenvolvimento)

| Campo | Valor |
|-------|--------|
| Utilizador | `admin` |
| Palavra-passe | `admin123` |

Altere `BOOTSTRAP_ADMIN_PASSWORD` em produção.

## Estrutura

- `portic_crm/` — projeto Django (apps: core, empresas, startups, projetos, espacos, dashboard, administrador)
- `reserva_sala_portic/` — **referência local** do sistema legado (Node/Next.js). Está no `.gitignore` e não faz parte do deploy.

## Perfis (grupos Django)

| Grupo | Acesso |
|-------|--------|
| AdministradorGeral | Todos os módulos |
| AdministradorParcial | Permissões atribuídas manualmente |
| UtilizadorComum | Apenas reserva de espaços |

Gerir grupos e permissões em `/admin/` → Utilizadores e Grupos.

## Candidaturas públicas

Link por formulário: `/startups/candidatura/<token>/` (token UUID gerado no admin).

## Comandos úteis

```bash
docker compose exec web python manage.py migrate
docker compose exec web python manage.py bootstrap_admin
docker compose exec web python manage.py createsuperuser
```
