import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class DataBuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build_data.py")], cwd=ROOT, check=True)
        cls.data = json.loads((ROOT / "app" / "data.json").read_text(encoding="utf-8"))

    def test_expected_dimensions(self):
        self.assertEqual(290, len(self.data["municipalities"]))
        self.assertEqual([str(y) for y in range(2014, 2026)], self.data["years"])
        self.assertEqual(9, len(self.data["metrics"]))

    def test_complete_current_coverage(self):
        covered = sum("2025" in m["years"] for m in self.data["municipalities"].values())
        self.assertEqual(290, covered)

    def test_map_coverage(self):
        self.assertEqual(set(self.data["municipalities"]), set(self.data["mapPaths"]))
        self.assertTrue(all(path.startswith("M") for path in self.data["mapPaths"].values()))

    def test_population_is_plausible_denominator(self):
        pops = [m["years"].get("2024", {}).get("Population01") for m in self.data["municipalities"].values()]
        pops = [p for p in pops if p is not None]
        self.assertGreaterEqual(len(pops), 289)
        self.assertGreater(max(pops), 900_000)
        self.assertGreater(min(pops), 1_000)

    def test_stockholm_has_core_series(self):
        stockholm = self.data["municipalities"]["0180"]
        self.assertEqual("Stockholm", stockholm["name"])
        for year in self.data["years"]:
            self.assertGreater(stockholm["years"][year]["Besok01"], 0)
            self.assertGreater(stockholm["years"][year]["Utlan399"], 0)

    def test_municipalities_can_be_compared_on_same_metric(self):
        stockholm = self.data["municipalities"]["0180"]["years"]["2024"]["Besok01"]
        gothenburg = self.data["municipalities"]["1480"]["years"]["2024"]["Besok01"]
        self.assertIsNotNone(stockholm)
        self.assertIsNotNone(gothenburg)
        self.assertNotEqual(stockholm, gothenburg)

    def test_national_absolute_average_excludes_missing_values(self):
        values = [
            municipality["years"].get("2014", {}).get("Besok01")
            for municipality in self.data["municipalities"].values()
        ]
        reported = [value for value in values if value is not None]
        national_average = sum(reported) / len(reported)
        self.assertLess(len(reported), len(values))
        self.assertGreater(national_average, min(reported))
        self.assertLess(national_average, max(reported))

    def test_national_per_1000_uses_matching_municipalities(self):
        eligible = []
        for municipality in self.data["municipalities"].values():
            row = municipality["years"].get("2024", {})
            value, population = row.get("Besok01"), row.get("Population01")
            if value is not None and population is not None and population > 0:
                eligible.append((value, population))
        national_rate = sum(value for value, _ in eligible) / sum(population for _, population in eligible) * 1_000
        self.assertGreaterEqual(len(eligible), 280)
        self.assertGreater(national_rate, 0)
        # A weighted national rate is generally different from the unweighted mean of municipal rates.
        unweighted = sum(value / population * 1_000 for value, population in eligible) / len(eligible)
        self.assertNotAlmostEqual(national_rate, unweighted, places=3)

    def test_index_and_benchmark_controls(self):
        stockholm = self.data["municipalities"]["0180"]["years"]
        values = [stockholm.get(year, {}).get("Besok01") for year in self.data["years"]]
        base = next(value for value in values if value is not None and value != 0)
        indexed = [None if value is None else value / base * 100 for value in values]
        self.assertEqual(100, next(value for value in indexed if value is not None))

        html = (ROOT / "app" / "index.html").read_text(encoding="utf-8")
        javascript = (ROOT / "app" / "app.js").read_text(encoding="utf-8")
        for mode in ('data-mode="absolute"', 'data-mode="per1000"', 'data-mode="index"'):
            self.assertIn(mode, html)
        self.assertIn('id="comparison-list"', html)
        self.assertIn('id="show-national"', html)
        self.assertIn("function nationalValue", javascript)
        self.assertIn("function indexSeries", javascript)


if __name__ == "__main__":
    unittest.main()
