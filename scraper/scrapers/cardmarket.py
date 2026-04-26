# Référence de prix CardMarket (estimations pour le MVP)
# Format: "mot-clé dans le titre (lowercase)" -> prix estimé en €

CARD_PRICE_REFERENCE = {
    # Vintage high-value
    "dracaufeu brillant": 1500,
    "charizard shiny": 1500,
    "rayquaza star": 1200,
    "mewtwo brillant": 1000,
    "neo destiny": 300,
    "neo genesis": 200,
    "neo revelation": 150,
    "neo discovery": 120,
    "aquapolis": 100,
    "team rocket": 90,
    # Sets classiques
    "set de base": 120,
    "base set": 120,
    "fossil": 80,
    "jungle": 80,
    "ex deoxys": 120,
    "ex fantomes": 100,
    "ex ile des dragons": 100,
    "ex especes delta": 90,
    # Pokémons iconiques
    "dracaufeu": 150,
    "charizard": 150,
    "lugia": 100,
    "ho-oh": 80,
    "mewtwo": 80,
    "mew": 60,
    "rayquaza": 120,
    "celebi": 70,
    "entei": 50,
    "raikou": 50,
    "suicune": 50,
    "umbreon": 60,
    "espeon": 55,
    "pikachu": 30,
    "raichu": 40,
    # Lots génériques
    "lot pokemon": 50,
    "lot carte": 40,
    "collection pokemon": 70,
    "vieux pokemon": 60,
    "pokemon vintage": 80,
    "lot vintage": 100,
}


def estimate_value(title: str, price: float):
    """
    Retourne (prix_cardmarket_estimé, marge_en_pourcentage)
    Si aucune correspondance, retourne (None, None)
    """
    title_lower = title.lower()
    best_value = None
    best_key = None

    # Cherche la correspondance la plus spécifique (plus longue)
    for keyword, value in CARD_PRICE_REFERENCE.items():
        if keyword in title_lower:
            if best_key is None or len(keyword) > len(best_key):
                best_value = value
                best_key = keyword

    if best_value and price > 0:
        margin = ((best_value - price) / price) * 100
        return best_value, round(margin, 1)

    return None, None
