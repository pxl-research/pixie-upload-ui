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
- `VITE_TABULAR_API_BASE_URL`: basis-URL van de tabular backend (default: `http://localhost:8000`).
- `VITE_TABULAR_API_PROXY_TARGET`: target voor Vite-proxy wanneer je `/api` gebruikt tijdens lokaal draaien.
- `VITE_TABULAR_API_KEY`: API key die als `X-API-Key` wordt meegestuurd.
- `VITE_LOG_LEVEL`: logniveau (bijv. `info`).

## Configuratie (rag backend)
- `VITE_RAG_API_BASE_URL`: basis-URL van de rag backend (bijv. `http://localhost:8010`).
- `VITE_RAG_API_PROXY_TARGET`: target voor Vite-proxy voor de rag backend (alleen nodig als je een relatieve base URL gebruikt tijdens dev).
- `VITE_RAG_API_KEY`: API key voor de rag backend.

## Authenticatie
- UI toont een loginpagina voor Basic Auth. Vul `username`, `password` en optioneel een `X-Admin-Token` (gebruikt bij mutaties: create/update/delete).
- De gegevens worden als header meegestuurd bij elke API-call en alleen in de huidige browsersessie opgeslagen (sessionStorage).
