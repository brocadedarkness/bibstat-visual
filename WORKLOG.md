# Arbetslogg

## Experimentets faktiska förutsättningar

- **Modell:** Sol Light.
- **Körtid:** 24 minuter.
- **Promptning:** en initial uppdragsbeskrivning; inga efterföljande instruktioner eller manuella korrigeringar under själva experimentkörningen.
- **Kodframställning:** ingen applikationskod skrevs manuellt. Applikation, datapipeline, tester och den ursprungliga dokumentationen genererades av AI utifrån uppdragsbeskrivningen.

Uppgifterna ovan beskriver experimentets genomförande och ska inte tolkas som den uppskattade arbetsinsatsen för en mänsklig utvecklare längre ned i dokumentet.

## Datakällor

1. **Kungliga biblioteket (KB), biblioteksstatistik 2014–2025.** De tolv levererade Excel-filerna i `data/raw/` är primärkälla. De innehåller ett blad med värden och ett med termdefinitioner. KB är statistikansvarig myndighet och materialet är öppna data (CC0). Råfilerna har inte ändrats.
2. **SCB, Statistikdatabasen.** Metadata från tabellen *Folkmängden efter region, civilstånd, ålder, kön, tabellinnehåll och år* används endast för officiella kommunkoder och kommunnamn (`data/external/scb_population_metadata.json`). Befolkningsvärdena i beräkningarna kommer däremot från `Population01` i KB-filerna; enligt definitionen fyller KB detta fält med SCB:s årssiffror.
3. **SCB, öppna geodata.** RegSO 2025 via SCB:s WFS används för kartan (`data/external/regso_2025.geojson`). Varje RegSO har en kommunkod. Geometrin förenklas för webben men statistikvärden förändras inte. SCB:s öppna statistik och geodata är CC0.

SKR-data behövdes inte. Inga data eller någon kod från Fabel, LibData eller BibData har använts.

## Dataproblem och hantering

- Uppdragstexten nämner CSV, men de levererade filerna är XLSX. Pipeline och dokumentation utgår därför från XLSX.
- En rad motsvarar inte alltid en kommun. Många kommuner rapporterar en samlad biblioteksorganisation, medan bland annat Karlstad har separata rader per serviceställe. Alla relevanta rader grupperas därför på `Kommunkod`.
- Både `folkbib` och `folkskolbib` tas med. Den senare är integrerade folk- och skolbibliotek och måste ingå för komplett kommuntäckning.
- Antalet unika kommuner är 288 (2014), 284 (2015), 287 (2016), 286 (2017), 289 (2018), 288 (2019), 289 (2020–2022) och 290 (2023–2025). Luckor i äldre års rapportering visas som saknade; de fylls inte ut.
- Vissa kommuner redovisar flera organisationsrader. Additiva mått summeras. `Population01` hanteras separat med högsta rapporterade värde inom kommunen och året så att befolkning aldrig dubbelräknas.
- I enstaka fall saknas befolkningsvärde trots verksamhetsdata. Då visas absoluta tal men inget per-1 000-värde.
- Statistikserien påverkas av pandemin 2020–2021 och av förändringar i urval/definitioner. KB varnar generellt för försiktighet vid långtidsjämförelser. Definitionen för varje valt mått kommer från arbetsböckernas definitionsblad.
- RegSO-gränser är statistikområden, inte kommunpolygoner. De färgsätts med sin kommuns värde och ritas utan interna konturer, vilket visuellt bildar kommunytan. Öar och hål bevaras så långt förenklingen medger.

## Antaganden och beräkningar

- Biblioteksstruktur och verksamhet avser kommunala folkbibliotek samt integrerade folk-/skolbibliotek.
- Additiva mått summeras över relevanta rapporteringsenheter inom kommunen.
- Per 1 000 invånare beräknas som `kommunvärde / Population01 × 1 000` för samma verksamhetsår.
- Kartans förändring beräknas som `(slutvärde − startvärde) / startvärde × 100`. Förändring visas inte om något värde saknas eller startvärdet är noll.
- Vid flera serier i diagrammet indexeras varje serie mot sitt första tillgängliga, icke-nollvärde (= 100). Det gör mått med olika enheter jämförbara. Med en serie visas faktiska värden.
- Inga saknade värden imputeras och inga extrema värden rensas bort.

## Implementerad funktionalitet

- Sökbart inbyggt kommunval (webbläsarens standardkontroll).
- Nio variabler: fysiska besök, fysiska lån, aktiva låntagare, bemannade serviceställen, årsverken, fysiskt bestånd, publika aktiviteter, driftskostnader och bokbussar.
- Upp till fyra variabler samtidigt i ett tillgängligt SVG-diagram med pekverktygstips.
- Absoluta värden och värden per 1 000 invånare.
- Rikstäckande, klickbar förändringskarta med valfritt mått och valfria jämförelseår.
- Direktkoppling mellan karta och tidsserie.
- Responsiv layout för mobil och dator.
- Reproducerbar byggprocess och automatiska dataintegritetstester.

## Avvikelser från Fabel

- Fabel kunde inte läsas maskinellt från utvecklingsmiljön. Huvudfunktionerna i uppdragsbeskrivningen har därför implementerats självständigt, utan pixel- eller kodmässig efterbildning.
- Kartan visar procentuell förändring per kommun och valfri variabel; den visar inte enskilda biblioteksadresser eller öppnings-/stängningshändelser.
- Applikationen har ett avgränsat urval om nio tydliga nyckeltal i stället för samtliga cirka 255 KB-termer.
- Ingen server, databas, användarinloggning eller exportfunktion ingår. All bearbetad data laddas statiskt i webbläsaren.

## Uppskattad arbetsinsats

- Datainspektion, källgranskning, pipeline, geometri och validering: **cirka 4–5 timmar**.
- Informationsarkitektur, visuell design, interaktioner, responsivitet och webbläsartest: **cirka 4–5 timmar**.
- Dokumentation och slutkontroll: **cirka 1 timme**.

Uppskattningen avser en erfaren utvecklare som arbetar fokuserat med befintliga offentliga data och en byggfri frontend.
