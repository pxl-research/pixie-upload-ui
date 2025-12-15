# PiXie Upload UI

De PiXie Upload UI is een eenvoudige webapp waarin medewerkers documenten verzamelen voor de PiXie-assistent. Denk aan mappen met beleidsstukken, spreadsheets met producten of handleidingen voor klanten. Met deze tool kun je bepalen wat PiXie straks mag kennen en gebruiken in gesprekken met eindgebruikers.

## Wat je ermee kunt
- Documenten uploaden in een paar klikken en ze onderbrengen in duidelijke collecties.
- Tabellen en spreadsheets klaarzetten voor de aanbevelingsmotor van PiXie.
- Overzicht houden van welke bestanden actief zijn en welke je wilt verwijderen.
- Zeker zijn dat de juiste informatie beschikbaar is voordat collega’s of klanten vragen stellen aan PiXie.

## Hoe het past in het PiXie-landschap
- PiXie bestaat uit meerdere onderdelen. Deze uploadomgeving is het startpunt: hier geef je de relevante informatie aan het systeem.
- Wanneer je een bestand uploadt, wordt het automatisch doorgestuurd naar de juiste achterliggende dienst. Tekst gaat naar de lees- en zoekmodule, tabellen komen in de database terecht die PiXie gebruikt voor keuzes en aanbevelingen.
- Hierdoor kunnen andere PiXie-onderdelen, zoals de chatinterface of aanbevelingsassistent, razendsnel de juiste context ophalen.

## Voor wie bedoeld
- Teams die PiXie willen voeden met actuele documenten.
- Functioneel beheerders die overzicht willen houden over beschikbare collecties.
- Redacties of inhoudelijke experts die kennis willen klaarzetten zonder technische handelingen.

## Waarom dit handig is
- Alles op één plek: uploaden, groeperen, bijwerken en opschonen.
- Geen technische kennis nodig; de interface begeleidt je stap voor stap.
- Klaar voor groei: nieuwe collecties of extra documenten voeg je in minuten toe, zodat PiXie altijd op de hoogte blijft.

## Configuratie (tabular backend)
- Basis-URL tabular: `TABULAR_API_BASE_URL` (default `/tabular` via proxy naar `tabular-api:8000`).
- `TABULAR_API_KEY`: API key die als `X-API-Key` wordt meegestuurd.
- `LOG_LEVEL`: logniveau (bijv. `info`).
- `ENABLED_BACKENDS`: kies `both` (default), `tabular` of `rag` om de beschikbare opslagdoelen te bepalen. Niet-geactiveerde backends worden overgeslagen en geven een melding bij uploads die daarop zouden moeten landen.

## Configuratie (rag backend)
- Basis-URL rag: `RAG_API_BASE_URL` (default `/rag` via proxy naar `rag-api:8000`).
- `RAG_API_KEY`: API key voor de rag backend.
- Uploads zijn asynchroon: `POST /documents/upload` moet een `job_id` teruggeven en `GET /jobs/{job_id}` moet de jobstatus leveren. De UI pollt deze endpoint automatisch om klaar/mislukt te detecteren.

## Authenticatie
- Aanbevolen: zet Basic Auth op de reverse proxy/ingress zodat de UI alleen bereikbaar is na server-side login. De front-end zelf bevat geen ingebouwde login meer.
- API-calls gebruiken enkel de API keys uit de configuratie (`TABULAR_API_KEY`, `RAG_API_KEY`).

### Voorbeeld: Nginx (single host)
1) Maak htpasswd: `htpasswd -c .htpasswd admin`
2) Nginx locatie:
```
location / {
  auth_basic "Pixie Upload UI";
  auth_basic_user_file /etc/nginx/.htpasswd;
  proxy_pass http://ui:5173;
}
```

### Voorbeeld: Kubernetes (Nginx Ingress)
- Secret met htpasswd: `kubectl create secret generic ui-basicauth --from-file=auth` (bestand `auth` bevat htpasswd regels).
- Annotaties op de ingress:
```
nginx.ingress.kubernetes.io/auth-type: basic
nginx.ingress.kubernetes.io/auth-secret: ui-basicauth
nginx.ingress.kubernetes.io/auth-realm: "Pixie Upload UI"
```

### Voorbeeld: Traefik middleware
- Middleware: `traefik.http.middlewares.ui-auth.basicauth.usersfile=/secrets/ui-users`
- Koppel de middleware aan de router van de UI.
