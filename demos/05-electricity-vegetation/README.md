# InfraWatch · Energia — roślinność w pasie linii

Pierwsza aplikacja drugiego zestawu demonstratorów InfraWatch. Użytkownik wybiera linię energetyczną, przegląda otoczenie na obrazach i dodaje obiekty do lokalnego planu weryfikacji. Oś czasu znajduje się pod mapą i zmienia obraz na całym obszarze.

## Uruchomienie

Ze strony głównej repozytorium wybierz „Energia · roślinność w pasie linii”. Bezpośredni adres: https://andygorski.github.io/InfraWatch/demos/05-electricity-vegetation/.

Lokalnie uruchom serwer z katalogu głównego repozytorium: `python -m http.server 8000`. Otwórz `http://localhost:8000/demos/05-electricity-vegetation/`. Nie ma kompilacji, kluczy API ani backendu. Zbliżenia GUGiK i opcjonalne fonty Google wymagają internetu.

## Rzeczywiste dane

- OpenStreetMap przez Overpass, snapshot bazy 06.11.2026 10:10:51 UTC. Bbox [18.34,50.035,18.84,50.46]. 555 odcinków `power=line`, 1654 `power=minor_line`, 2772 wieże/słupy kratowe, 12709 słupów i 817 stacji. Linie przycięto do obszaru; pominięto jedną relację stacji. Nie jest to kompletna inwentaryzacja operatora.
- Widok początkowy: OSM way/171537807, Wielopole–Joachimów, Wielopole–Rokitnica, oznaczenie 400 kV, 50,840 km geometrii w obszarze i 137 podpór powiązanych węzłami źródłowej linii. Atrybuty napięcia i operatora pochodzą z OSM i nie są niezależnie potwierdzone.
- Cztery sceny Sentinel-2 L2A (2020, 2022, 2024, 2025), Earth Search / Element 84, kafel 33UYR. NDVI obliczono z B04/B08, z uwzględnieniem skali/offsetu STAC i uproszczonej maski SCL. Podkłady są przeskalowane do około 36 m; nie mierzą wysokości drzew.
- Od poziomu mapy 12 automatycznie włącza się szczegółowa mozaika ortofotomap GUGiK WMTS. Data nalotu wymaga sprawdzenia w skorowidzu; mozaika nie jest zdjęciem z roku wybranego na osi czasu. GIS także pozostaje snapshotem z 2026, niezależnym od daty Sentinel.

Każdy obiekt GIS ma identyfikator, dostępne atrybuty, datę edycji i link do oryginału OSM. Można przełączać warstwy, wyszukiwać odcinki i eksportować dane do GeoJSON, CSV lub raportu HTML. Plan weryfikacji jest zapisywany wyłącznie w localStorage przeglądarki.

## Symulacja i ograniczenia

Tryb rzeczywistego GIS jest domyślny. Przełącznik „Scenariusz symulowany” zastępuje go osobnym scenariuszem: około 47,7 km modelowej linii 110 kV, pięć lokalizacji, bufor ±30 m, symulowane korony, prześwity i priorytety zmieniające się z rokiem. Geometrie i alarmy tego scenariusza nie opisują rzeczywistej infrastruktury.

Dla rzeczywistych obiektów nie wyznaczono kolizji, prześwitu ani wysokości drzew. Brak modelu przewodów, LiDAR i przetworzonych scen SAR. NDVI nie jest automatyczną oceną zagrożenia. Eksport zachowuje rozróżnienie danych rzeczywistych i symulacji.

## Pochodzenie i odtworzenie

`assets/real-power-metadata.json` zawiera źródło, snapshot, bbox, zapytanie Overpass, liczby obiektów i wyłączenia. `assets/real-power.geojson` zawiera atrybucję, licencję i identyfikatory źródłowe. `assets/scenes.json` podaje daty scen, adresy pasm i metodę obliczeń. `assets/aerial-service.json` opisuje WMTS; `assets/ortho.json` i pięć dawnych wycinków są materiałami referencyjnymi.

Zapisz odpowiedź JSON zapytania z metadanych jako `power-osm-raw.json`. Następnie uruchom z tego katalogu `python prepare_real_gis.py power-osm-raw.json --output przygotowane-assets`. Skrypt wymaga wyłącznie biblioteki standardowej Python. Nowe pobranie może zwrócić inny stan danych niż zapisany snapshot.

© OpenStreetMap contributors · [ODbL 1.0](https://www.openstreetmap.org/copyright). Contains modified Copernicus Sentinel data 2020, 2022, 2024, 2025 · Earth Search / Element 84. Ortofotomapy: GUGiK / Geoportal. Leaflet 1.9.4: BSD-2-Clause. Zachowano oznaczenia źródeł w aplikacji i eksporcie. Repozytorium nie nadaje odrębnej licencji na dane dostawców.
