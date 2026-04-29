#!/usr/bin/env python3
"""
Lanceur de tests — point d'entrée principal
Usage : python tests/run_tests.py [--api] [--scraper] [--filters] [--all]
Sans argument : lance tous les tests sauf ceux nécessitant l'app en cours
"""
import sys
import os
import argparse
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scraper'))

def main():
    parser = argparse.ArgumentParser(description='PokéArbitrage Test Runner')
    parser.add_argument('--api', action='store_true', help='Tests API uniquement (app :3001 requise)')
    parser.add_argument('--scraper', action='store_true', help='Tests scraper structure uniquement')
    parser.add_argument('--filters', action='store_true', help='Tests filtres uniquement')
    parser.add_argument('--all', action='store_true', help='Tous les tests')
    args = parser.parse_args()

    # Import test classes directly from the local module to avoid package import issues
    from test_scraper import TestFilters, TestPriceReference, TestAPI, TestScraperStructure

    suite = unittest.TestSuite()
    loader = unittest.TestLoader()

    if args.filters:
        suite.addTests(loader.loadTestsFromTestCase(TestFilters))
        suite.addTests(loader.loadTestsFromTestCase(TestPriceReference))
    elif args.api:
        suite.addTests(loader.loadTestsFromTestCase(TestAPI))
    elif args.scraper:
        suite.addTests(loader.loadTestsFromTestCase(TestScraperStructure))
    else:
        # Par défaut : tout sauf API (qui nécessite l'app)
        suite.addTests(loader.loadTestsFromTestCase(TestFilters))
        suite.addTests(loader.loadTestsFromTestCase(TestPriceReference))
        suite.addTests(loader.loadTestsFromTestCase(TestScraperStructure))
        if args.all:
            suite.addTests(loader.loadTestsFromTestCase(TestAPI))

    print("🧪 PokéArbitrage — Test Suite")
    print("=" * 55)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    print("=" * 55)
    if result.wasSuccessful():
        print(f"✅ {result.testsRun} tests passés")
    else:
        print(f"❌ {len(result.failures)} échec(s), {len(result.errors)} erreur(s) sur {result.testsRun} tests")
    sys.exit(0 if result.wasSuccessful() else 1)

if __name__ == '__main__':
    main()
