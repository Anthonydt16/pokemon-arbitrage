import sys

sys.path.insert(0, r'C:\Users\gogod\web\pokemon-arbitrage\scraper')

from product_detector import detect_type, detect_extension

cases = [
    'Tripack Forces Temporelles',
    'Display Forces Temporelles',
    'Display Failles Paradoxales',
    'Lot de 3 boosters Pokémon Forces Temporelles',
    'Blister Pokémon forces temporelles FR',
    'ETB Pokémon EV05 Forces temporelles',
    'Lot 15 Boosters Pokémon Faille Paradoxe Neufs Scellés',
    'ETB Évolutions Prismatiques',
]

for c in cases:
    print(f"{c} => type={detect_type(c)} | ext={detect_extension(c)}")
