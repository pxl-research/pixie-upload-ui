# Pixie Upload UI

Nieuwe webinterface om tabulaire documenten (CSV/XLSX) naar de Pixie Tabular database te uploaden, collecties te beheren en toekomstige uitbreidingen mogelijk te maken.

## Voorwaarden
- Node.js ≥ 20.19.0 (voor Vite 7 en recente tooling).
- npm 10+ of alternatief package manager (pnpm wordt aanbevolen; het project werkt met npm-lockfile voor nu).
- Docker Desktop (voor lokale container development).
- Toegang tot de Pixie backend stack (`infra/docker/docker-compose.dev.yml` in het hoofdrepo).

## Snel starten
1. Installeer dependencies:
   ```bash
   npm install
   ```
2. Kopieer de voorbeeldomgeving:
   ```bash
   cp .env.example .env.local
   ```
   Vul `VITE_API_BASE_URL` en `VITE_API_KEY` op basis van `.env.dev` uit het backendproject.
3. Start de backendstack in het hoofdrepo:
   ```bash
   docker compose -f infra/docker/docker-compose.dev.yml up --build
   ```
4. Start de UI:
   ```bash
   npm run dev
   ```
   Vite draait op `http://localhost:5173`. API-verkeer gaat via `VITE_API_BASE_URL` of via de proxy (`VITE_API_PROXY_TARGET`) indien ingesteld.

## Docker workflow
Zorg dat het externe Docker netwerk bestaat:
```bash
docker network create pixie-network || true
```

Start de UI-container op hetzelfde netwerk als de backend:
```bash
docker compose -f docker-compose.dev.yml up --build
```

Standaard draait de container in dev-mode (`npm run dev`) en proxy’t requests naar `VITE_API_BASE_URL`. Voor productie kan de `Dockerfile` het `dist`-buildresultaat serveren via Nginx (target `production`).

## Beschikbare scripts
- `npm run dev` – Vite dev server met HMR.
- `npm run build` – TypeScript build + Vite productiebuild.
- `npm run preview` – Preview van de productiebuild.
- `npm run lint` / `npm run lint:fix` – ESLint checks.
- `npm run typecheck` – TypeScript typecontrole zonder emit.
- `npm run test` – Vitest in watchless modus.
- `npm run test:coverage` – Vitest met V8 coverage rapport.

## Omgevingsvariabelen
| Naam | Beschrijving | Voorbeeld |
| --- | --- | --- |
| `VITE_APP_NAME` | Titel van de UI (gebruikt in metadata). | `Pixie Upload UI` |
| `VITE_API_BASE_URL` | URL waarmee de UI de Pixie API aanspreekt. | `http://localhost:8000` |
| `VITE_API_PROXY_TARGET` | Optioneel: doel voor Vite dev proxy (`/api`). | `http://localhost:8000` |
| `VITE_API_KEY` | API-key voor alle requests (`X-API-Key` header). | `pixie-dev-key-...` |
| `VITE_LOG_LEVEL` | Logniveau voor client logging (`trace`–`silent`). | `info` |

De Docker compose file verwacht een `.env.dev` bestand (zelfde structuur als `.env.example`).

## Huidige UI-functionaliteit
- Collecties opvragen, alfabetisch sorteren, aanmaken via modal en verwijderen met bevestiging.
- Documentoverzicht per collectie met bestandsdetails en verwijderen met bevestiging.
- Upload flow voor CSV/XLS(X) met validatie op bestandstype, metadata formulier en voortgang.
- visuele highlight na nieuwe collectie of document upload.

## Backend connectie checklist
- Backend compose stack actief en bereikbaar.
- `VITE_API_BASE_URL` wijst naar `http://pixie_postgres_api:8000` binnen het Docker netwerk of naar `http://localhost:8000` bij lokaal gebruik.
- API key beschikbaar via `.env.dev`.
- Indien CORS ontbreekt, gebruik de Vite proxy (`VITE_API_PROXY_TARGET`) zodat requests via de dev-server lopen.

## Testen
- Unit- en utilitytests via Vitest (`npm run test`).
- Componenttests met Testing Library (`src/test`).
- API-scenario’s worden lokaal gemockt met MSW (setup volgt in de implementatiefase).

## Verdere documentatie
- `ui-upload-ui-plan.md` bevat het volledige plan van aanpak en roadmap.
- `docs/` (nog te maken) gaat een architectuuroverzicht bevatten zodra de hoofdcomponenten zijn uitgewerkt.

## Troubleshooting
- Engine warnings bij `npm install` duiden op een te oude Node-versie; upgrade naar >= 20.19.0 voor officiële support.
- Controleer of `pixie-network` bestaat wanneer de UI-backendcommunicatie binnen Docker niet werkt.
- Als API requests 401 teruggeven, verifieer `VITE_API_KEY` en ensure dat headerinjectie actief is (zie komende API-client implementatie).
