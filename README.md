# 🃏 PokéArbitrage

Outil de détection d'opportunités d'achat/revente sur les cartes et produits Pokémon.

## Fonctionnement

PokéArbitrage scrappe en temps réel **LeBonCoin**, **Vinted** et **eBay**, compare les prix au marché et détecte automatiquement les bonnes affaires avant tout le monde.

## Fonctionnalités

- **Dashboard** — Meilleure affaire du jour, Top 5, stats globales
- **Recherches personnalisées** — Keywords, fourchette de prix, choix des plateformes
- **Scraper automatique** — Scan toutes les 15 min sur tes recherches
- **Scan quotidien** — 28 produits scellés (ETB, Displays, Coffrets, UPC, Singles rares, Vintage) à 12h chaque jour
- **Référence de prix** — PokemonTCG.io pour les singles, médiane du marché pour les scellés
- **Alertes Discord** — Notification instantanée sur les deals détectés
- **Filtres intelligents** — Suppression des outliers, mots négatifs (proxy, PSA, vide...), déduplication

## Stack

- **Frontend** : Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Base de données** : Prisma 5 + SQLite
- **Scraper** : Python 3 (requests + BeautifulSoup + schedule)

## Lancer le projet

```bash
# Installer les dépendances
npm install

# Lancer l'app web (port 3001)
npm run dev

# Lancer le scraper (scan toutes les 15 min)
cd scraper && python main.py

# Lancer le scan quotidien (12h00)
cd scraper && python daily_scan.py
```

## Configuration

Créer un fichier `.env` à la racine :

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Plateformes supportées

| Plateforme | Status |
|---|---|
| LeBonCoin | ✅ |
| Vinted | ✅ |
| eBay | ✅ |
| CardMarket | ⏳ (nécessite OAuth) |

---

Projet personnel — outil d'arbitrage pour le marché Pokémon FR.
