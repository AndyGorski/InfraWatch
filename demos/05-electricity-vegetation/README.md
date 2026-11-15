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

### Przykład roślinności — prezentacja jak dla punktów InSAR

Przycisk **Przykład roślinności** w nagłówku otwiera opis i wybór punktu początkowego. Można uruchomić rok 2025 lub prześledzić historię od 2020. Na stronie startowej odnośnik **Uruchom scenariusz roślinności** prowadzi bezpośrednio do P-01 w 2025: `?scenario=vegetation&point=1&year=2025`. Dozwolone punkty to 1–5, lata 2020/2022/2024/2025. Nieznane wartości są zastępowane P-01 i ostatnim rokiem.

Pasek scenariusza umożliwia wybór punktu i roku, zbliżenie, otwarcie analizy i powrót do rzeczywistego GIS. Przykład korzysta z modelowego korytarza na Śląsku, bez powiązania pomiarów z wybraną linią OSM. Nie zmienia zapisanych filtrów ani rzeczywistego planu weryfikacji GIS. Wejście wyłącza ręczny obszar/otoczenie obiektu; wyjście przywraca poprzedni podkład, rok i kadr zapisane przy uruchomieniu w tej sesji. Przebieg i korony pozostają symulowane, nawet gdy w tle widać rzeczywiste zdjęcie.

| Punkt | Historia przykładowa |
| --- | --- |
| P-01 · Skraj lasu · północ | Narastające zbliżenie koron: pokrycie modelowego pasa 12 → 38%, odstęp do osi 7,8 → 2,4 m. |
| P-02 · Zadrzewienie · zachód | Weryfikacja drzew poza pasem i możliwości upadku; brak pomiarów wysokości lub kondycji. |
| P-03 · Samosiewy · polana | Stopniowe zarastanie otwartej części modelowego pasa. |
| P-04 · Brzeg lasu · południe | Boczny przyrost koron i przykład inspekcji planowej. |
| P-05 · Przecinka · Rudy | Symulowana pielęgnacja w 2022: udział spada 22 → 8%, potem rośnie do 16% w 2025. Historia prac nie jest potwierdzona. |

Zakładka **Analiza** zawiera stan wybranego punktu, zmianę względem 2020, trzy wykresy i tabelę historii tylko do aktywnego roku. Pokrycie pasa, odstęp do osi i priorytet są danymi DEMO. Trzeci wykres pokazuje niezależne, rzeczywiste regionalne próbki Sentinel-2 NDVI z metadanych scen, wraz z datami i liczbą ważnych pikseli. Mogą różnić się od dat wyświetlanej mozaiki ogólnopolskiej. Braki NDVI nie są zastępowane zerami, a NDVI nie generuje priorytetu ani pomiaru prześwitu.

Z karty punktu można otworzyć analizę; z analizy można dodać lub usunąć lokalizację z lokalnego planu inspekcji oraz pobrać **Raport scenariusza JSON**. Raport zapisuje rok, punkt, założenia, status symulacji, plan i historię do wybranego roku, a także źródła próbek optycznych. Plan przykładu (`infrawatch-inspections-v1`) jest odrębny od planu rzeczywistego GIS. Priorytety w planie i eksportach CSV/HTML odpowiadają aktywnemu rokowi scenariusza.

Test modelu i raportu: `node demos/05-electricity-vegetation/vegetation-scenario.test.cjs`.

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
