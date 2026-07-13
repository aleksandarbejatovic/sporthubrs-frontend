# SportHub RS Frontend

Moderni, responzivni frontend za SportHub RS platformu. Aplikacija sadrzi naslovnu stranicu, klubove, interaktivnu mapu Republike Srpske, bazu znanja, propise, vijesti, talente, sportske prilike, kontakt formu i admin panel.

## Pokretanje

Potreban je Node.js 20 ili noviji.

```bash
npm start
```

Frontend je dostupan na:

```text
http://127.0.0.1:5173
```

API treba biti pokrenut na:

```text
http://127.0.0.1:4000
```

## Provjera

```bash
npm run check
```

Frontend nema eksterne runtime dependency-je. Koristi browser ES module, sopstveni SPA router i lagani Node development server.
