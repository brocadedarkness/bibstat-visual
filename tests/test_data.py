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


if __name__ == "__main__":
    unittest.main()
