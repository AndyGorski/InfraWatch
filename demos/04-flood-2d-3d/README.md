# Zalanie infrastruktury — wybór obiektu

Wspólne menu **Wybierz obiekt** udostępnia te same 9 nazwanych elektrowni, elektrociepłowni i OZE co panele roślinności i deformacji. Dodatkowo można wyszukiwać 911 stacji energetycznych. Wybrany obiekt, promień 1–30 km i ustawienie lokalnych linii są zapisywane w URL; odnośniki Roślinność / Deformacje / Zalanie w menu zachowują wybór. Nawigacja nagłówka także przenosi kontekst.

GIS i obrazy przełączają się pomiędzy rzeczywistymi zbiorami Śląska i Kozienic przez `shared/regional-data.js`. Obiekt jest oznaczony punktem referencyjnym OSM, a sąsiedztwo kołem. Regionalne linie i stacje są wybierane geometrycznie; sama bliskość nie potwierdza połączenia elektrycznego. Szczegółowy podkład 2D korzysta z bieżącego GUGiK WMTS; data nalotu pozostaje niepotwierdzona. Obraz optyczny pochodzi z przygotowanej sceny Sentinel-2 z 2025 r. dla właściwego regionu.

Model zalania pozostaje w swoim pierwotnym położeniu: bbox `[21.32,51.57,21.61,51.73]`, siatka Mapzen Terrain Tiles 240 × 180, 30 lokalizacji słupów F401 i ręcznie przybliżony przebieg Wisły koło Kozienic. Po wybraniu obiektu warstwa wody i statystyka powierzchni są ograniczane do koła, a lista słupów F401 do punktów wewnątrz wyboru. Częściowe pokrycie jest oznaczane. Regionalne geometrie GIS nie otrzymują automatycznie diagnozy zalania lub uszkodzenia.

Poza zasięgiem modelu aplikacja pokazuje GIS i obrazy, usuwa starą wodę, pozostawia wskaźniki jako „—” i blokuje parametry scenariusza oraz 3D. Nie przenosi rastra terenu, rzeki ani wyników z Kozienic do Rybnika lub innych elektrowni. Raport takiego wyboru ma typ `gis_context_no_flood_model`, `scenario: null` i pustą listę wyników dla słupów. Przywrócenie scenariusza początkowego wraca do przygotowanego obszaru Kozienic.

Wezbranie jest syntetyczne i nie stanowi prognozy ani ostrzeżenia. Uproszczony model nie uwzględnia wałów, przepływu, opadów ani kalibracji hydrologicznej. Dane: © OpenStreetMap contributors / ODbL 1.0, Copernicus Sentinel-2, GUGiK, Terrain Tiles / Mapzen (m.in. EU-DEM i SRTM). Szczegóły źródeł i ograniczeń są dostępne w aplikacji.
