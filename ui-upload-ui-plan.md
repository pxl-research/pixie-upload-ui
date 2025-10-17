# Plan van aanpak: UI voor Pixie Tabular DB uploads

## Doel en scope
- Bouw een uitbreidbare webinterface (nieuwe repository) om bestanden naar de Pixie Tabular database te uploaden en documenten binnen collecties te beheren.
- Eerste iteratie ondersteunt het kiezen/aanmaken van collecties, bekijken van documenten, verwijderen van documenten, uploaden van tabulaire data (CSV/XLSX) en het tonen van uploadprogressie.
- Webapp moet eenvoudig uitbreidbaar blijven voor toekomstige features zoals bewerking van productgegevens, ondersteuning voor niet-tabulaire bestanden en row-level queries.

## Backendomgeving waarop aangesloten moet worden
- Docker stack: `infra/docker/docker-compose.dev.yml` in hoofdrepo bevat API + Postgres + Adminer.
  - Starten: `docker compose -f infra/docker/docker-compose.dev.yml up --build`.
  - Netwerk: containers draaien op netwerk `pixie-network` (extern).
- UI moet eveneens in een container draaien en aansluiten op `pixie-network`. Hierdoor kan de UI via de interne hostnames (`pixie_postgres_api:8000` voor de API, `pixie_postgres_db:5432` indien ooit rechtstreeks DB nodig is) communiceren zonder localhost-tunnel.
- API draait standaard op `http://localhost:8000`.
- Postgres draait op `localhost:5432` (gebruikersnaam `pixie`, wachtwoord `devpassword`, database `pixie_tabular`).
- API authenticatie: header `X-API-Key` met waarde uit `.env.dev` (`pixie-dev-key-2c5b5a9fa1d74c3ab218d6a8c88a37d1` standaard). De UI moet deze key via eigen `.env` configureren.
- Belangrijkste endpoints (alle vereisen API key, behalve health):
  - `GET /health` — connectiviteit-check.
  - Collections:
    - `GET /collections/`
    - `POST /collections/` body `{ "name": "..." }`
    - `DELETE /collections/{collection_name}`
  - Documenten binnen collectie `{collection}`:
    - `GET /collections/{collection}/documents/`
    - `POST /collections/{collection}/documents/` multipart form fields:
      - `file`: UploadFile
      - optional: `product_prefix`, `language`, `description`
    - `DELETE /collections/{collection}/documents/{identifier}` — identifier = bestandsnaam of productnaam.
  - Product queries (voor toekomstige UI modules):
    - `POST /collections/{collection}/products/{product_name}/query` met filters.
- API verwacht voorlopig dat tabulaire bestanden CSV of XLSX zijn; andere extensies moeten (client-side) worden afgewezen met een waarschuwing.
- Voor bewerking van productnaam/beschrijving is back-end uitbreiding nodig (`PATCH /collections/{collection}/documents/{document_id}` of soortgelijk); UI dient daar al placeholders voor voorzien maar functie uitschakelen tot endpoint bestaat.
- CORS: wanneer UI op andere origin draait, FastAPI moet `CORSMiddleware` configuratie krijgen (nog niet toegevoegd). Alternatief: run UI via dev proxy (zie onder).

## Nieuwe UI-repository structuur
```
.
├── README.md
├── .env.example (met VITE variabelen)
├── Dockerfile
├── .dockerignore
├── docker-compose.dev.yml (UI container + afhankelijkheden)
├── package.json (Vite + React + TS)
└── src
    ├── api/ (axios client, hooks)
    ├── components/
    ├── hooks/
    ├── pages/
    ├── state/ (zustand)
    ├── utils/
    └── App.tsx / main.tsx
```

### Aanbevolen tooling
- Vite + React + TypeScript.
- Package manager: pnpm (sneller, node_modules beheer), maar npm/yarn ook mogelijk.
- Belangrijke dependencies:
  - `react-router-dom`
  - `@tanstack/react-query`
  - `axios`
  - `zustand`
  - `zod` (validatie)
  - UI bibliotheek: bijv. `@chakra-ui/react`, `@mantine/core` of Tailwind + headless componenten.
  - `react-hook-form` of `formik` voor formulieren (optioneel).
- Dev tooling:
  - ESLint (`eslint-config-airbnb` of `@typescript-eslint`)
  - Prettier
  - Vitest + React Testing Library
  - MSW (Mock Service Worker) voor API mocks tijdens ontwikkeling.

### Containerisatie & gedeeld netwerk
- Dockerfile (multi-stage) voorstel:
  1. Builder stage: `FROM node:20-alpine`, `pnpm install`, `pnpm build`.
  2. Runtime stage: gebruik `node:20-alpine` voor dev (`pnpm dev --host 0.0.0.0`) of `nginx:alpine` voor productie (serveer `dist`).
- `.dockerignore` opnemen (`node_modules`, `dist`, `*.log`, etc.) zodat build klein blijft.
- `docker-compose.dev.yml` in UI repo:
  ```yaml
  services:
    ui:
      build: .
      container_name: pixie_upload_ui
      env_file:
        - .env.dev
      ports:
        - "5173:5173"
      command: pnpm dev --host 0.0.0.0 --port 5173
      networks:
        - pixie-network
      volumes:
        - ./:/app
        - /app/node_modules
  networks:
    pixie-network:
      external: true
  ```
- Voor productie kan een aparte compose/file worden toegevoegd die `nginx` serveert en poort 80/443 mapt.
- Eerste keer netwerk maken indien niet aanwezig: `docker network create pixie-network`.
- Tijdens ontwikkeling draait backend compose op dezelfde netwerknaam; UI kan daardoor API aanspreken via `http://pixie_postgres_api:8000`. Voor browsergebruik combineer je dit met een proxy of expose je forward via Vite zodat de browser nog steeds `localhost` aanspreekt.

### Environment configuratie
- `.env.example`:
  ```
  # Browser calls via Vite dev server (host machine)
  VITE_API_BASE_URL=http://localhost:8000
  # Binnen Docker container om API rechtstreeks te benaderen
  VITE_API_BASE_URL_INTERNAL=http://pixie_postgres_api:8000
  VITE_PIXIE_API_KEY=pixie-dev-key-2c5b5a9fa1d74c3ab218d6a8c88a37d1
```
- UI leest via `import.meta.env`.
- Docker compose zet `VITE_API_BASE_URL` naar `http://localhost:8000` voor lokale browserontwikkeling en `VITE_API_BASE_URL_INTERNAL` voor server-side calls (bijv. proxy). Binnen de container gebruik je `process.env.VITE_API_BASE_URL_INTERNAL` om API requests te configureren; expose beide variabelen zodat build-time en runtime scenario’s gedekt zijn.
- Voor dev-proxy (optioneel) `vite.config.ts`:
  ```ts
  server: {
    proxy: {
      '/collections': {
        target: process.env.VITE_API_BASE_URL_INTERNAL ?? process.env.VITE_API_BASE_URL,
        changeOrigin: true,
      },
      '/health': {
        target: process.env.VITE_API_BASE_URL_INTERNAL ?? process.env.VITE_API_BASE_URL,
        changeOrigin: true,
      },
    },
  }
  ```
  Dit voorkomt CORS tijdens ontwikkeling zolang API lokaal draait.

## Architectuur en componenten

### Routing en algemene layout
- Gebruik `react-router` met een hoofdroute `/` voor het beheer-dashboard.
- Layoutcomponent met topbar (API-status indicator), sidebar (collecties) en hoofdcontent (documenten & upload).
- Voorzie ruimte voor toekomstige modules (bijv. product queries, rapporten).

### State management
- `react-query` handhaaft serverstate (collecties, documenten).
- `zustand` voor UI-state zoals geselecteerde collectie, modaldialog status, uploadprogress.
- Query keys:
  - `['collections']`
  - `['documents', collectionName]`
  - `['product-query', collectionName, productName]` (voor later).

### Collectiebeheer
- Component `CollectionSelector`:
  - Toont lijst van collecties (alfabetisch).
  - Mogelijkheid tot kiezen en nieuw aanmaken via modal.
  - Delete-knop met confirm dialog.
  - Na create/delete → `invalidateQueries(['collections'])`.
- API-calls:
  - `useCollectionsQuery`, `useCreateCollectionMutation`, `useDeleteCollectionMutation`.

### Documentoverzicht
- `DocumentTable` weergave:
  - Kolommen: productnaam, bestandsnaam, rij-aantal, kolommen-lijst (toon als chips of tooltip), aangemaakt-op (optioneel).
  - Acties: `Verwijderen` (actief), `Bewerken` (placeholder tot endpoint beschikbaar).
  - Toon attributen-beschrijvingen (indien aanwezig) via expandable row.
- Mutaties:
  - `useDeleteDocumentMutation` (identifier = product of filename, UI bepaalt via radio of context menu).
- Na mutatie → `invalidateQueries(['documents', collectionName])`.

### Uploadflow
- `UploadPanel` met drag-and-drop zone + bestandsselector.
- Client-side validatie:
  - MIME en extensie controleren; alleen `.csv`, `.xlsx` toestaan.
  - Bij unsupported type: `console.warn` + UI-notificatie “Niet-tabulaire bestanden worden nog niet verwerkt”.
- Form inputs:
  - `product_prefix`
  - `language` (select box met opties, optioneel)
  - `description` (textarea)
- Upload via `axios` met `FormData`; parameters:
  - `formData.append('file', file)` etc.
- Uploadprogress:
  - Gebruik `onUploadProgress` voor percentage.
  - Schatting resterende tijd: bewaar starttijd en bereken `(total - loaded) / bytesPerMs`.
  - Toon progress bar + tekst “X% — ~Ys resterend”.
- Success:
  - Reset form.
  - Invalidatie van documentenlijst.
  - Highlight nieuw document (bijv. `setTimeout` + CSS class).
- Error handling:
  - Distinct messaging voor 4xx, 5xx.
  - 401 → hint om API key te controleren.
  - Upload annuleren mogelijk (abort controller).

### Bewerken van documenten (voorbereiding)
- UI dialoog `DocumentEditDialog` die productnaam/beschrijving kan aanpassen.
- Tot backend endpoint live is:
  - Disable “Opslaan” met tooltip “Endpoint nog niet beschikbaar”.
  - Documenteer extra backend vereiste:
    - Endpoint voorstel: `PATCH /collections/{collection}/documents/{document_id}` met payload `{ "product_name": "...", "file_description": "..." }`.
    - SQL: `UPDATE tabular_documents SET product_name = :name, file_description = :desc WHERE id = :id`.

### Logging en monitoring
- Gebruik eenvoudige logging (bijv. `loglevel` of eigen wrapper) zodat waarschuwingen (unsupported filetypes) traceerbaar zijn.
- Voeg globale error boundary toe voor crash reporting (later koppelen aan externe service).

## Teststrategie
- Unit tests (Vitest) voor utility-functies (bestandsvalidatie, tijdschattingen).
- Component tests (React Testing Library) voor CollectionSelector, DocumentTable en UploadPanel.
- Mock API via MSW:
  - Scenario’s: lege collectie, bestaande documenten, upload success/failure, delete 404.
- (Later) E2E tests met Playwright (flow: collectie kiezen → upload → lijst update).

## Deployability en documentatie
- `README.md` in nieuwe repo:
  - Vereisten (Node versie, pnpm).
  - Setup stappen: `pnpm install`, `.env` invullen, `pnpm dev`.
  - Instructies om backend via Docker te starten.
- Maak `docs/architecture.md` (optioneel) met componentdiagram en gewenste toekomstige features.
- Zorg voor CI pipeline (GitHub Actions) voor lint/test (optioneel in deze fase).

## Toekomstige uitbreidingen (roadmap)
- Ondersteuning voor niet-tabulaire bestanden: API zal binnenkort enkel loggen; UI moet klaar zijn om uploadtype te detecteren en dispatchen naar andere flows.
- Row-level preview en filtering UI (gebaseerd op `POST /collections/{collection}/products/{product}/query`).
- Rolgebaseerde toegang / API key beheer (UI cleanup).
- Uploadgeschiedenis per collectie met audit-trail.
- Internationalisatie (React i18next) voor meertalige UI.
- Integraties met cloud storage voor directe uploads i.p.v. in-memory.

## Checklist voor startende agent
1. Repository initialiseren met Vite React TS + tooling (zie boven).
2. `.env` aanmaken op basis van `.env.example` met juiste API base URL en key.
3. Docker stack starten; verifiëren dat `GET http://localhost:8000/health` `200` teruggeeft.
4. `docker network create pixie-network` uitvoeren (indien nog niet aanwezig) en UI-compose opzetten zodat container aan dit netwerk hangt.
5. UI-container bouwen en starten via `docker compose -f docker-compose.dev.yml up --build`; controleren dat Vite dev server beschikbaar is en API via `http://pixie_postgres_api:8000` bereikt wordt.
6. Bouwen van API-client (`axios` instance met headers).
7. Implementeren CollectionSelector + mutations.
8. DocumentTable bouwen met delete-functionaliteit.
9. UploadPanel met validatie + progressbar maken.
10. Query invalidation en globale foutafhandeling afstemmen.
11. README en developer docs invullen.
12. Unit/component tests toevoegen voor kerncomponenten.

Met dit document zou een nieuwe agent zonder extra context de UI kunnen ontwerpen, aansluiten op de bestaande backend en klaar zijn voor toekomstige uitbreidingen.
