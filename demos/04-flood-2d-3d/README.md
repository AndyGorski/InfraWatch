# Zalanie infrastruktury — wybór obiektu

Wspólne menu **Wybierz obiekt** udostępnia te same 9 nazwanych elektrowni, elektrociepłowni i OZE co panele roślinności i deformacji. Dodatkowo można wyszukiwać 911 stacji energetycznych. Wybrany obiekt, promień 1–30 km i ustawienie lokalnych linii są zapisywane w URL; odnośniki Roślinność / Deformacje / Zalanie w menu zachowują wybór. Nawigacja nagłówka także przenosi kontekst.

GIS i obrazy przełączają się pomiędzy rzeczywistymi zbiorami Śląska i Kozienic przez `shared/regional-data.js`. Obiekt jest oznaczony punktem referencyjnym OSM, a sąsiedztwo kołem. Regionalne linie i stacje są wybierane geometrycznie; sama bliskość nie potwierdza połączenia elektrycznego. Szczegółowy podkład 2D korzysta z bieżącego GUGiK WMTS; data nalotu pozostaje niepotwierdzona. Obraz optyczny pochodzi z poszerzonej regionalnej mozaiki Sentinel-2 z 2025 r. dla właściwego regionu.

Model zalania pozostaje w swoim pierwotnym położeniu: bbox `[21.32,51.57,21.61,51.73]`, siatka Mapzen Terrain Tiles 240 × 180, 30 lokalizacji słupów F401 i ręcznie przybliżony przebieg Wisły koło Kozienic. Po wybraniu obiektu warstwa wody i statystyka powierzchni są ograniczane do koła, a lista słupów F401 do punktów wewnątrz wyboru. Częściowe pokrycie jest oznaczane. Regionalne geometrie GIS nie otrzymują automatycznie diagnozy zalania lub uszkodzenia.

Poza zasięgiem modelu aplikacja pokazuje GIS i obrazy, usuwa starą wodę, pozostawia wskaźniki jako „—” i blokuje parametry scenariusza oraz 3D. Nie przenosi rastra terenu, rzeki ani wyników z Kozienic do Rybnika lub innych elektrowni. Raport takiego wyboru ma typ `gis_context_no_flood_model`, `scenario: null` i pustą listę wyników dla słupów. Przywrócenie scenariusza początkowego wraca do przygotowanego obszaru Kozienic.

Wezbranie jest syntetyczne i nie stanowi prognozy ani ostrzeżenia. Uproszczony model nie uwzględnia wałów, przepływu, opadów ani kalibracji hydrologicznej. Dane: © OpenStreetMap contributors / ODbL 1.0, Copernicus Sentinel-2, GUGiK, Terrain Tiles / Mapzen (m.in. EU-DEM i SRTM). Szczegóły źródeł i ograniczeń są dostępne w aplikacji.

Podkład 2D korzysta z rozszerzonych mozaik Sentinel-2: około 128 × 111 km na Śląsku i 104 × 100 km w Kozienicach. Model wody i teren 3D zachowują pierwotny bbox i dawne, poprawnie zlokalizowane tekstury. Rozszerzenie zdjęć nie oznacza większego modelu zalania.

## Szczegółowy widok 3D

Widok 3D korzysta z WebGL 2 i pełnej źródłowej siatki DEM **240 × 180** (43 200 węzłów, 85 562 trójkąty), zamiast dawnych płaskich pól co trzeci węzeł. Tekstury są nakładane bezpośrednio na siatkę: lokalny Sentinel-2 2000 × 1800 px albo ortofotomapa 3000 × 2600 px. Mipmapy, filtrowanie anizotropowe, jeśli dostępne, antyaliasing i oświetlenie od normalnych powierzchni poprawiają czytelność podczas obrotu i zbliżenia. Słabszy sprzęt może ograniczyć rozmiar tekstury. Podkłady zachowują oryginalne położenie i zasięg; nie są bieżącymi kaflami lotniczymi 2D.

Teren i woda są oddzielnymi powierzchniami. Woda ma wysokość wynikającą z DEM i tych samych modelowych głębokości, maskę mokrych komórek, dotychczasowe klasy barw i regulowaną widoczność. Teren nie jest podnoszony przez wodę. Wizualizacja nie zmienia algorytmu zalania, liczników, zasięgu modelu ani wartości w raportach. Przebieg F401 jest rysowany na gruncie, a punkty OSM mają symbole możliwe do wybrania kliknięciem; nie są to zmierzone konstrukcje słupów ani przewody.

Skala pionowa **×1–×30** (domyślnie ×12) zmienia wyłącznie wygląd. Opcjonalne warstwice co 5 m pochodzą z interpolacji tego samego orientacyjnego DEM; nie dodają dokładności wysokościowej. Podstawa bryły jest schematyczna. Źródło wysokości pozostaje bez zmian, zatem wizualna szczegółowość tekstury nie jest większą dokładnością terenu lub modelu hydraulicznego.

Sterowanie: przeciąganie obraca i pochyla teren, kółko lub przyciski ＋/− zmieniają zbliżenie. Po ustawieniu fokusu na widoku działają strzałki, +/− i Home. Przycisk „Cały obszar” przywraca kamerę; automatyczne kadrowanie uwzględnia rozmiar okna, kąt i skalę pionową. Parametr `?view=3d` otwiera ten widok, jeśli wybrany obszar ma przygotowany model. Przy braku WebGL 2 pozostaje oznaczony widok uproszczony. Przy utracie kontekstu grafiki jest on używany do czasu przywrócenia zasobów.

Raport zapisuje `rendering_3d`: sposób renderowania, źródłową siatkę, teksturę i skalę pionową, z `changes_hydrology: false`. Testy: `node demos/04-flood-2d-3d/terrain3d.test.cjs` (geometria, krawędzie, proporcje metryczne, normalne, powierzchnia wody, zachowanie źródeł, kadrowanie i tryb bez WebGL).
