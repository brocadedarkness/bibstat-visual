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

SKR-data behövdes inte. Applikationen och databearbetningen har utvecklats självständigt med de angivna offentliga källorna som underlag.

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
- Tidsseriediagrammet visar en variabel åt gången för en eller flera kommuner. I indexläget indexeras varje kommun mot sitt första tillgängliga, icke-nollvärde (= 100).
- Riksgenomsnittet för absoluta tal är det aritmetiska medelvärdet över kommuner som rapporterat måttet det aktuella året.
- Riksgenomsnittet per 1 000 invånare beräknas som summan av rapporterade värden dividerad med den sammanlagda folkmängden, multiplicerat med 1 000. Endast kommuner där både värde och folkmängd finns ingår i båda summorna.
- Rikets indexserie bygger på det årsvisa genomsnittliga värdet per rapporterande kommun och indexeras mot sitt första tillgängliga, icke-nollvärde.
- Inga saknade värden imputeras och inga extrema värden rensas bort.

## Implementerad funktionalitet

- Inbyggt kommunval med möjlighet att lägga till och ta bort flera jämförelsekommuner.
- Nio variabler: fysiska besök, fysiska lån, aktiva låntagare, bemannade serviceställen, årsverken, fysiskt bestånd, publika aktiviteter, driftskostnader och bokbussar.
- En variabel åt gången i ett tillgängligt SVG-diagram, med en färgkodad serie per vald kommun och pekverktygstips.
- Absoluta värden, värden per 1 000 invånare och index med redovisade basår.
- Valbart riksgenomsnitt med beräkningar anpassade till visningsläget.
- Rikstäckande, klickbar förändringskarta med valfritt mått och valfria jämförelseår.
- Direktkoppling mellan karta och tidsserie.
- Responsiv layout för mobil och dator.
- Reproducerbar byggprocess och automatiska dataintegritetstester.

## Senare gränssnittsjusteringar

- Den inledande presentationsytan ersattes av ett kompakt sidhuvud så att statistikverktyget möter användaren direkt.
- Tidsseriediagrammet byggdes om från jämförelse mellan flera variabler till benchmarking mellan flera kommuner för en vald variabel.
- Avsnittet *Om experimentet* kompletterades med experimentets strategiska utgångspunkt, fullständiga beräkningsprinciper och en tydlig upplysning om att tjänsten är fristående från Kungliga biblioteket.

## Projektets avgränsningar

- Kartan visar procentuell förändring per kommun och vald variabel; den visar inte enskilda biblioteksadresser eller öppnings- och stängningshändelser.
- Applikationen använder ett avgränsat urval om nio tydliga nyckeltal i stället för samtliga cirka 255 KB-termer.
- Tidsserierna omfattar verksamhetsåren 2014–2025 och kommunal folkbiblioteksverksamhet, inklusive integrerade folk- och skolbibliotek.
- Ingen server, databas, användarinloggning eller exportfunktion ingår. All bearbetad data laddas statiskt i webbläsaren.
- Verktyget är ett experiment och inte avsett som produktionsfärdig eller officiell statistiktjänst.

## Uppskattad arbetsinsats

- Datainspektion, källgranskning, pipeline, geometri och validering: **cirka 4–5 timmar**.
- Informationsarkitektur, visuell design, interaktioner, responsivitet och webbläsartest: **cirka 4–5 timmar**.
- Dokumentation och slutkontroll: **cirka 1 timme**.

Uppskattningen avser en erfaren utvecklare som arbetar fokuserat med befintliga offentliga data och en byggfri frontend.
