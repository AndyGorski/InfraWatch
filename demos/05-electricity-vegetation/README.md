# InfraWatch · Energia — roślinność w pasie linii

Pierwsza aplikacja drugiego zestawu demonstratorów InfraWatch. Użytkownik wybiera linię energetyczną, przegląda otoczenie na obrazach i dodaje obiekty do lokalnego planu weryfikacji. Oś czasu znajduje się pod mapą i zmienia obraz na całym obszarze.

## Uruchomienie

Ze strony głównej repozytorium wybierz „Energia · roślinność w pasie linii”. Bezpośredni adres: https://andygorski.github.io/InfraWatch/demos/05-electricity-vegetation/.

Lokalnie uruchom serwer z katalogu głównego repozytorium: `python -m http.server 8000`. Otwórz `http://localhost:8000/demos/05-electricity-vegetation/`. Nie ma kompilacji, kluczy API ani backendu. Zbliżenia GUGiK i opcjonalne fonty Google wymagają internetu.

## Rzeczywiste dane

- Ogólnopolski snapshot OpenStreetMap / Geofabrik: linie, linie lokalne, kable, podpory, stacje i urządzenia. Dokładne liczby i daty w `../../shared/national-power/metadata.json`; metodologia w `../../shared/national-power/README.md`. Dane nie są kompletną inwentaryzacją operatora.
- Widok początkowy: przegląd sieci głównej w Polsce. Szczegóły kadru od z11; wybór obszaru pobiera wszystkie kategorie. Liczniki i eksport dotyczą wczytanego zakresu, nie całej inwentaryzacji. Atrybuty napięcia i operatora pochodzą z OSM i nie są niezależnie potwierdzone.
- Cztery mozaiki Sentinel-2 L2A (2020, 2022, 2024, 2025), Earth Search / Element 84, sąsiednie kafle z tego samego dnia i przelotu. NDVI obliczono z B04/B08, z uwzględnieniem skali/offsetu STAC i uproszczonej maski SCL. Regionalny widok Śląska jest przeskalowany do około 42 m/px; nie mierzą wysokości drzew.
- Od poziomu mapy 12 automatycznie włącza się szczegółowa mozaika ortofotomap GUGiK WMTS. Data nalotu wymaga sprawdzenia w skorowidzu; mozaika nie jest zdjęciem z roku wybranego na osi czasu. GIS także pozostaje snapshotem z 2026, niezależnym od daty Sentinel.

Każdy obiekt GIS ma identyfikator, dostępne atrybuty, datę edycji i link do oryginału OSM. Można przełączać warstwy, wyszukiwać odcinki i eksportować dane do GeoJSON, CSV lub raportu HTML. Plan weryfikacji jest zapisywany wyłącznie w localStorage przeglądarki.

## Symulacja i ograniczenia

Tryb rzeczywistego GIS jest domyślny. Przełącznik „Scenariusz symulowany” zastępuje go osobnym scenariuszem: około 47,7 km modelowej linii 110 kV, pięć lokalizacji, bufor ±30 m, symulowane korony, prześwity i priorytety zmieniające się z rokiem. Geometrie i alarmy tego scenariusza nie opisują rzeczywistej infrastruktury.

Dla rzeczywistych obiektów nie wyznaczono kolizji, prześwitu ani wysokości drzew. Brak modelu przewodów, LiDAR i przetworzonych scen SAR. NDVI nie jest automatyczną oceną zagrożenia. Eksport zachowuje rozróżnienie danych rzeczywistych i symulacji.

## Pochodzenie i odtworzenie

`assets/real-power-metadata.json` zawiera źródło, snapshot, bbox, zapytanie Overpass, liczby obiektów i wyłączenia. `assets/real-power.geojson` zawiera atrybucję, licencję i identyfikatory źródłowe. `assets/scenes.json` podaje daty scen, adresy pasm i metodę obliczeń. `assets/aerial-service.json` opisuje WMTS; `assets/ortho.json` i pięć dawnych wycinków są materiałami referencyjnymi.

Zapisz odpowiedź JSON zapytania z metadanych jako `power-osm-raw.json`. Następnie uruchom z tego katalogu `python prepare_real_gis.py power-osm-raw.json --output przygotowane-assets`. Skrypt wymaga wyłącznie biblioteki standardowej Python. Nowe pobranie może zwrócić inny stan danych niż zapisany snapshot.

© OpenStreetMap contributors · [ODbL 1.0](https://www.openstreetmap.org/copyright). Contains modified Copernicus Sentinel data 2020, 2022, 2024, 2025 · Earth Search / Element 84. Ortofotomapy: GUGiK / Geoportal. Leaflet 1.9.4: BSD-2-Clause. Zachowano oznaczenia źródeł w aplikacji i eksporcie. Repozytorium nie nadaje odrębnej licencji na dane dostawców.


Interfejs korzysta ze wspólnego wzorca `shared/monitoring-workspace.*`: Mapa / Obiekt / Analiza, zakładki Warstwy / Obiekty, zwijane panele, historia pod mapą i okno eksportu. Adapter `unified-workspace.js` zachowuje funkcje tego przypadku użycia.

Menu **Wybierz obiekt** udostępnia wspólną listę 9 elektrowni / elektrociepłowni / OZE i 911 stacji ze Śląska oraz Kozienic. Obrazy i GIS przełączają się do rzeczywistego regionu obiektu. Odnośniki Roślinność / Deformacje / Zalanie zachowują wybrany obiekt, promień 1–30 km oraz ustawienie lokalnych linii; wybór można także udostępnić przez URL. Obszar ręczny pozostaje dostępny. Model zarastania z pierwotnego demo pozostaje na Śląsku, syntetyczne punkty InSAR i model zalania przy F401 koło Kozienic. Dla innych lokalizacji brakujące analizy nie są wypełniane fikcyjnymi pomiarami. Bliskość linii nie potwierdza połączenia z elektrownią. Szczegóły katalogu i eksportu znajdują się w głównym README.

Rozszerzone obrazy Śląska obejmują bbox [17.8,49.75,19.6,50.75], około 128 × 111 km. Kozienice mają osobne rzeczywiste mozaiki w bbox [20.75,51.15,22.25,52.05], około 104 × 100 km. Wybór obiektu przełącza region. Każdy termin zapisuje listę źródłowych kafli, ich footprinty i udział pikseli. Szerszy obraz nie rozszerza snapshotu GIS ani scenariusza linii. Szczegóły i odtworzenie opisano w głównym README.

### Wybrzeże i Bałtyk

Podkład lotniczy używa teraz przezroczystego GUGiK WMS (PNG, Raster). Luki, morze i błędy kafli odsłaniają mozaikę Sentinel-2 z wybranego roku; podpis mapy wyraźnie rozróżnia oba źródła. Zasięg obrazów satelitarnych rozszerzono do 56,2°N (podgląd całych kafli: około 56,56°N). Daty nalotów pozostają niezależne od roku Sentinel.

### Wybór linii do analizy

Przycisk **Wybierz linię** włącza wskazywanie widocznego odcinka na mapie. Linie mają szerszy obszar trafienia kursorem. Kliknięcie pobiera pełną geometrię i wyróżnia ją miętowym obrysem; ten sam wybór jest dostępny w karcie obiektu przez **Analizuj tę linię**. Pasek wyboru pozwala pokazać cały przebieg, otworzyć zakładkę Analiza lub usunąć wybór. Esc anuluje wskazywanie i zachowuje wcześniejszy cel.

Cel obejmuje jeden obiekt OSM `way` (linia napowietrzna, sieć lokalna lub kabel), który może być częścią dłuższej linii. Wybór zastępuje obszar ręczny lub otoczenie elektrowni; późniejsze filtry, kadrowanie, podkład i rok Sentinel nie usuwają celu. Wybrana geometria pozostaje wyróżniona także po wyłączeniu jej kategorii w filtrach, co jest opisane w pasku. Ostatni wybór jest zapisywany lokalnie w przeglądarce (`iw-analysis-line-v1`) i odtwarzany tylko dla tego samego snapshotu GIS.

Zakładka Analiza pokazuje atrybuty wybranego odcinka i udostępnia jego GeoJSON. Zwykły eksport GeoJSON dodatkowo zawiera `analysis_target` z pełną geometrią, datą wyboru i kontekstem zobrazowania. `assessment_status: not_computed` oznacza brak wykonanej oceny zagrożeń; wybór nie generuje pomiarów prześwitu ani nie przenosi scenariusza demonstracyjnego na rzeczywistą linię. Nowy snapshot danych unieważnia zapisany cel. Błąd pobierania zachowuje wcześniejszy wybór, a spóźniona odpowiedź nie nadpisuje nowszego kliknięcia. Wybór nowego obszaru lub otoczenia elektrowni usuwa wcześniejszy cel liniowy, aby nie mieszać zakresów. Wybór linii dotyczy modułu roślinności / sieci energetycznej.

Sprawdzenie: `node demos/05-electricity-vegetation/line-analysis.test.cjs`.
