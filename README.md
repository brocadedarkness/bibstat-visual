# Biblioteksstatistik 2014-2025

En fristående, lokal webbapplikation för att utforska svensk folkbiblioteksstatistik kommunvis 2014–2025. Projektet är ett experiment och använder enbart egna bearbetningar av offentliga originaldata från Kungliga biblioteket (KB) och SCB.

## Funktioner

- Jämförelse mellan flera av Sveriges 290 kommuner.
- Interaktiva tidsserier för en av nio valbara variabler åt gången.
- Växling mellan absoluta tal, värden per 1 000 invånare och index.
- Valbart riksgenomsnitt anpassat till visningsläget.
- Klickbar Sverigekarta över procentuell förändring mellan valfria år.
- Responsiv, byggfri frontend utan ramverk eller externa CDN-beroenden.
- Reproducerbar Python-pipeline; filerna i `data/raw/` ändras aldrig.

## Installera och starta

Python 3.10 eller senare krävs.

```powershell
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python scripts/build_data.py
py -3 -m http.server 8000 --directory app
```

Öppna sedan <http://localhost:8000>. Datafilen `app/data.json` är redan genererad, så för en snabb visning räcker det att starta webbservern. Sidan ska inte öppnas direkt med `file://`, eftersom webbläsaren då normalt blockerar inläsningen av JSON-filen.

## Datapipeline

`scripts/build_data.py` läser samtliga arbetsböcker i `data/raw/`, väljer bibliotekstyperna `folkbib` och `folkskolbib`, och summerar rapporterade värden per kommunkod och verksamhetsår. `Population01` används som nämnare och summeras aldrig. Saknade eller icke-numeriska värden lämnas som `null`.

SCB:s tabellmetadata ger den officiella kod-/namnlistan för 290 kommuner. RegSO 2025 används som kartgeometri och förenklas deterministiskt av byggscriptet. Resultatet skrivs till `app/data.json`; råfilerna förblir orörda.

```text
data/raw/*.xlsx ─┐
                 ├─ scripts/build_data.py ─→ app/data.json ─→ webbläsaren
data/external/* ─┘
```

## Testa

```powershell
py -3 -m unittest discover -s tests -v
```

Testerna bygger data på nytt och kontrollerar bland annat antal kommuner, år, mått, karttäckning, kommunjämförelser och riksberäkningar. Se [WORKLOG.md](WORKLOG.md) för källor, antaganden, dataproblem och projektets avgränsningar.
