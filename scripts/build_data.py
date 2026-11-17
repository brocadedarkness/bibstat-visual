"""Build browser data from untouched KB workbooks and SCB reference files."""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
EXTERNAL = ROOT / "data" / "external"
OUT = ROOT / "app" / "data.json"

METRICS = {
    "Besok01": ("Fysiska besök", "besök", "#db5a42"),
    "Utlan399": ("Fysiska lån", "lån", "#287a78"),
    "Aktiv99": ("Aktiva låntagare", "låntagare", "#7255a4"),
    "BemanService01": ("Bemannade serviceställen", "ställen", "#d28b26"),
    "Arsverke99": ("Årsverken", "årsverken", "#3970a5"),
    "Bestand199": ("Fysiskt bestånd", "medier", "#5d8b4b"),
    "Publ199": ("Publika aktiviteter", "tillfällen", "#b14966"),
    "Utgift99": ("Driftskostnader", "kr", "#635e57"),
    "Bokbuss01": ("Bokbussar", "bussar", "#16745d"),
}


def number(value):
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value):
        return value
    if isinstance(value, str):
        try:
            return float(value.replace(" ", "").replace(",", "."))
        except ValueError:
            pass
    return None


def municipality_names():
    metadata = json.loads((EXTERNAL / "scb_population_metadata.json").read_text(encoding="utf-8"))
    region = next(v for v in metadata["variables"] if v["code"] == "Region")
    return {c: n for c, n in zip(region["values"], region["valueTexts"]) if len(c) == 4}


def build_statistics(names):
    result = {code: {"name": name, "years": {}} for code, name in names.items()}
    definitions = {}
    for path in sorted(RAW.glob("*.xlsx")):
        year = path.stem
        book = load_workbook(path, read_only=True, data_only=True)
        values, defs = book.worksheets[:2]
        header = list(next(values.iter_rows(values_only=True)))
        columns = {name: i for i, name in enumerate(header)}
        if not definitions:
            definitions = {k: v for k, v in defs.iter_rows(values_only=True) if k in METRICS}
        aggregates = defaultdict(lambda: {k: [] for k in [*METRICS, "Population01"]})
        for row in values.iter_rows(min_row=2, values_only=True):
            if row[columns["Bibliotekstyp"]] not in ("folkbib", "folkskolbib"):
                continue
            code = str(row[columns["Kommunkod"]] or "").zfill(4)
            if code not in result:
                continue
            for key in aggregates[code]:
                if key in columns:
                    value = number(row[columns[key]])
                    if value is not None:
                        aggregates[code][key].append(value)
        for code, fields in aggregates.items():
            record = {key: (sum(vals) if vals else None) for key, vals in fields.items()}
            # Population is a denominator, never an additive library measure.
            pops = fields["Population01"]
            record["Population01"] = max(pops) if pops else None
            result[code]["years"][year] = record
    return result, definitions


def perpendicular(point, start, end):
    if start == end:
        return math.dist(point, start)
    x, y = point
    x1, y1 = start
    x2, y2 = end
    return abs((y2-y1)*x - (x2-x1)*y + x2*y1 - y2*x1) / math.hypot(y2-y1, x2-x1)


def simplify(points, tolerance=.018):
    if len(points) <= 3:
        return points
    index, distance = 0, 0
    for i in range(1, len(points)-1):
        d = perpendicular(points[i], points[0], points[-1])
        if d > distance:
            index, distance = i, d
    if distance > tolerance:
        left = simplify(points[:index+1], tolerance)
        right = simplify(points[index:], tolerance)
        return left[:-1] + right
    return [points[0], points[-1]]


def rings(geometry):
    coords = geometry["coordinates"]
    polygons = coords if geometry["type"] == "MultiPolygon" else [coords]
    for polygon in polygons:
        for ring in polygon:
            yield ring


def project(lon, lat):
    # Compact equirectangular projection, tuned for Sweden's latitude range.
    x = (lon - 10.2) * math.cos(math.radians(62)) * 78
    y = (69.3 - lat) * 63
    return round(x, 1), round(y, 1)


def build_map(names):
    source = json.loads((EXTERNAL / "regso_2025.geojson").read_text(encoding="utf-8"))
    paths = defaultdict(list)
    for feature in source["features"]:
        code = str(feature["properties"]["kommunkod"])
        if code not in names:
            continue
        for ring in rings(feature["geometry"]):
            points = simplify([(float(x), float(y)) for x, y, *_ in ring])
            if len(points) < 3:
                continue
            projected = [project(*p) for p in points]
            command = "M" + "L".join(f"{x},{y}" for x, y in projected) + "Z"
            paths[code].append(command)
    return {code: "".join(items) for code, items in paths.items()}


def main():
    names = municipality_names()
    municipalities, definitions = build_statistics(names)
    payload = {
        "years": [str(y) for y in range(2014, 2026)],
        "metrics": {
            code: {"label": label, "unit": unit, "color": color, "definition": definitions.get(code, "")}
            for code, (label, unit, color) in METRICS.items()
        },
        "municipalities": municipalities,
        "mapPaths": build_map(names),
        "sources": {
            "kb": "Kungliga bibliotekets biblioteksstatistik, verksamhetsår 2014–2025",
            "scb": "SCB:s kommunnamn och RegSO 2025 (CC0)",
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1024:.0f} KiB, {len(names)} municipalities)")


if __name__ == "__main__":
    main()
