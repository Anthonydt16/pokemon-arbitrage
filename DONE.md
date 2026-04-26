# ✅ PokéArbitrage MVP — DONE

Construit le 26/04/2026 par OpenCrawl 🦾

## Ce qui a été construit

Application web complète de veille et arbitrage de cartes Pokémon.

### Stack
- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** — dark theme
- **Prisma 5** + SQLite
- **Python scraper** (Leboncoin + Vinted)

### Features
- 📊 **Dashboard** — affichage des deals en temps réel, stats, filtres par statut/plateforme
- 🔍 **Gestion des recherches** — CRUD complet avec mots-clés en chips, toggle actif
- 🤖 **Scraper Python** — scrape LBC + Vinted toutes les 15 min, calcule la marge vs CardMarket
- 🔔 **Détection automatique** — deal enregistré si marge ≥ 20%
- ♻️ **Auto-refresh** — le dashboard se rafraîchit toutes les 60s

### DB seedée avec 3 recherches par défaut
1. Dracaufeu & Charizard (max 150€)
2. Lots Pokémon vintage (max 100€)
3. Neo Destiny / Neo Genesis (max 200€)

---

## Comment démarrer

### 1. App web
```bash
cd /home/trave/.openclaw/workspace/pokemon-arbitrage
npm run dev
# → http://localhost:3001
```

### 2. Scraper Python
```bash
cd scraper
pip install -r requirements.txt
python main.py
```

> Le scraper a besoin que l'app Next.js tourne sur le port 3001.

---

## Structure des fichiers

```
pokemon-arbitrage/
├── app/
│   ├── page.tsx                  # Dashboard deals
│   ├── layout.tsx
│   ├── searches/
│   │   ├── page.tsx              # Liste des recherches
│   │   ├── new/page.tsx          # Créer une recherche
│   │   └── [id]/edit/page.tsx    # Modifier une recherche
│   └── api/
│       ├── deals/route.ts        # GET + POST deals
│       ├── deals/[id]/route.ts   # PATCH + DELETE deal
│       ├── searches/route.ts     # GET + POST recherches
│       └── searches/[id]/route.ts
├── components/
│   ├── Navbar.tsx
│   └── SearchForm.tsx
├── lib/prisma.ts
├── prisma/schema.prisma
├── scraper/
│   ├── main.py                   # Point d'entrée scraper
│   ├── scrapers/
│   │   ├── leboncoin.py
│   │   ├── vinted.py
│   │   └── cardmarket.py         # Référentiel prix
│   └── requirements.txt
└── seed.mjs
```

---

## Limitations connues (MVP)

- ⚠️ **Scraping fragile** : LBC et Vinted changent régulièrement leur HTML — si le scraper ne trouve rien, c'est normal, il faudra ajuster les sélecteurs CSS
- 💶 **Prix CardMarket hardcodés** : le référentiel est manuel, à enrichir avec de vraies données API CardMarket (l'API est payante)
- 🚫 **Pas d'eBay encore** : le scraper eBay n'est pas implémenté dans ce MVP
- 📧 **Pas de notifications** : les deals sont visibles dans l'UI mais pas de webhook Discord/email (à ajouter)

## Prochaines améliorations suggérées

1. Intégrer l'API CardMarket officielle pour les vrais prix
2. Ajouter un webhook Discord pour les alertes en temps réel
3. Ajouter le scraping eBay.fr
4. Ajouter un historique des prix / graphiques de tendance
5. Authentification si déployé en prod
