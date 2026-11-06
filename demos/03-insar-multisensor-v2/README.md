# InfraWatch — Deformacje terenu i infrastruktury

Widok GIS z mapą jako główną częścią aplikacji, panelem warstw oraz wykresem wybranego punktu. Dwie osie pod mapą rozdzielają historię rzeczywistych obrazów od epok analizy InSAR.

## Dane obrazowe

Takie same źródła jak w aplikacji roślinności: Copernicus Sentinel-2 L2A przez Earth Search / Element 84 oraz szczegółowa ortofotomapa GUGiK WMTS StandardResolution. Obszar pozostaje w Kozienicach. Nie użyto obrazów ze Śląska w lokalizacji Kozienic.

W `assets/imagery-history.json` znajdują się identyfikatory, dokładne daty, poziom zachmurzenia całej sceny, adresy źródłowych COG, skala/offset oraz zakres i rozdzielczość wycinków. Przygotowano cztery rzeczywiste obserwacje z lat 2020, 2022, 2024 i 2025. RGB i NDVI można zmieniać na całym widoku mapy suwakiem, przyciskami lat lub odtwarzaniem. Dobór wymaga pokrycia obszaru przez footprint sceny; maska SCL może nadal wykluczać część pikseli.

NDVI obliczono z B04/B08 z uwzględnieniem metadanych radiometrycznych STAC i `earthsearch:boa_offset_applied`. Resampling biliniowy do EPSG:3857, SCL nearest-neighbour, klasy 4/5/6. To wskaźnik kontekstowy; nie mierzy deformacji, wysokości drzew ani prześwitu. Różne dni letnie, fenologia i uproszczone maskowanie ograniczają porównywalność.

Od poziomu zbliżenia 12 mapa automatycznie korzysta z rzeczywistych kafli lotniczych GUGiK do poziomu 19, także pomiędzy obiektami i po przesunięciu mapy. Data nalotu i natywna rozdzielczość wymagają weryfikacji w skorowidzu. Kafelki nie są przypisywane do roku wybranego na osi Sentinel. Brakujące kafle są oznaczane i nie są zastępowane powiększonym Sentinel.

Zachowano dodatkowy, pojedynczy kadr SAR Sentinel-1C z 13.07.2025 oraz opcję fuzji wizualnej. Amplituda SAR nie jest interferogramem. Nie przygotowano historycznej serii SAR ani rzeczywistych pomiarów przemieszczeń.

## Dwie osie czasu

- Historia zobrazowań wybiera rzeczywisty obraz Sentinel-2 lub obliczone NDVI. W widoku lotniczym lub pojedynczego SAR wybór roku jest zapamiętany; „Pokaż archiwum” wraca do wybranego historycznego obrazu w widoku ogólnym.
- Epoka analizy wybiera miesiąc syntetycznego szeregu InSAR albo datę z importu CSV. Zmienia punkty, wykres, trendy i priorytety, zachowując niezależną datę zobrazowania.
- GIS OSM ma własną datę odczytu i nie jest historycznym stanem sieci z daty obrazu.

Eksport JSON zapisuje osobno epokę analizy, wybraną scenę Sentinel wraz z pochodzeniem, efektywny podkład mapy oraz informację o niezależności dat.

## Zakres symulacji i zachowane funkcje

Początkowe punkty, szeregi, jakości, alerty i prognozy InSAR są syntetyczne. Model regresji, filtr jakości, horyzont i próg demonstracyjny zachowano. Obrazy i geometrie OSM są rzeczywiste, ale dane OSM wymagają walidacji operatora. Powiązanie syntetycznego punktu ze słupem jest ilustracyjne.

Zakładki „Obiekt” i „Punkty” udostępniają kartę GIS, dawny wycinek referencyjny GUGiK, listę punktów oraz import CSV. Przycisk pokazania obiektu na mapie otwiera aktualny szczegółowy podkład WMTS. Import wymaga co najmniej 12 dat na punkt, spójnej geometrii LOS i układu odniesienia; nie jest niezależnie weryfikowany.

## Odtworzenie danych i uruchomienie

`prepare_history.py` pobiera metadane STAC i odczytuje COG dla Kozienic. Wymaga Python, rasterio, numpy, Pillow i affine. Z katalogu aplikacji: `python prepare_history.py --cache /sciezka/do/cache`. Opcjonalny `--geo-libs` wskazuje katalog przygotowanych bibliotek. Cache przechowuj poza repozytorium.

Uruchom statyczny serwer HTTP z katalogu repozytorium, np. `python -m http.server 8000`, a następnie otwórz `/demos/03-insar-multisensor-v2/`. Zobrazowania archiwalne i biblioteka Leaflet są lokalne; WMTS wymaga internetu.

Contains modified Copernicus Sentinel data 2020, 2022, 2024, 2025 · Earth Search / Element 84. SAR: Copernicus / Geomatrix SAGRIS. Ortofotomapy: GUGiK / Geoportal. GIS: © OpenStreetMap contributors, ODbL. Leaflet 1.9.4: BSD-2-Clause. Szczegóły znajdują się także w oknie „Źródła danych”.
