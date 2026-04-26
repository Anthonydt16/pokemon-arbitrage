# PokéArbitrage Scraper

Scraper Python qui surveille Leboncoin et Vinted pour trouver des cartes Pokémon sous-évaluées.

## Installation

```bash
cd scraper
pip install -r requirements.txt
```

## Lancement

```bash
# Depuis le dossier scraper/
python main.py

# Ou depuis la racine du projet
python scraper/main.py
```

> ⚠️ L'app Next.js doit tourner sur le port 3001 avant de lancer le scraper.

## Configuration

Variables d'environnement optionnelles :
- `API_BASE` : URL de l'API (défaut: `http://localhost:3001/api`)

## Comment ça marche

1. Lit les recherches actives dans SQLite directement
2. Pour chaque recherche, scrape les plateformes configurées
3. Estime la valeur via un référentiel de prix CardMarket hardcodé
4. Si marge ≥ 20% → envoie le deal à l'API Next.js
5. Se relance toutes les 15 minutes

## Ajouter des prix de référence

Édite `scrapers/cardmarket.py` → dictionnaire `CARD_PRICE_REFERENCE`
