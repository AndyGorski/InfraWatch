# InfraWatch — demonstratory

Centrum demonstracyjne projektu InfraWatch. Strona główna prezentuje trzy aktualne zastosowania: roślinność przy liniach energetycznych, deformacje terenu i infrastruktury oraz zalanie infrastruktury. Każda aplikacja znajduje się w osobnym katalogu.

Wspólna nawigacja prowadzi do katalogu aplikacji, [danych i metodologii](dane-i-metodologia.html), [archiwum](archiwum.html) i repozytorium. Nagłówki aktualnych aplikacji oraz wersji SAR/GIS i InSAR v1 korzystają z komponentu `shared/infrawatch-shell.js` i stylów `shared/infrawatch-shell.css`. W nagłówku aplikacji można przełączyć demonstrator lub wrócić do katalogu. Oryginalne wczesne prototypy zachowano jako migawki w archiwum.

Wygląd katalogu, archiwum i opisu źródeł jest wspólny (`shared/portal.css`). Karty oddzielnie opisują pochodzenie podkładów/GIS i charakter wyników analizy. Gaz, transport i woda są oznaczone jako planowane moduły drugiego zestawu.

| Katalog | Zawartość |
| --- | --- |
| `demos/00-early-prototypes/` | Dwa pierwsze prototypy HTML: mapa SAR/GIS oraz porównanie SAR/GIS. |
| `demos/01-sar-gis/` | Demo SAR Sentinel‑1 i geometrii linii energetycznej koło Kozienic. |
| `demos/02-insar-v1/` | Pierwsza wersja InSAR: syntetyczne szeregi przemieszczeń, prognoza trendu i import CSV. |
| `demos/03-insar-multisensor-v2/` | Mapa deformacji: historia Sentinel-2 / NDVI 2020–2025, szczegółowy GUGiK WMTS, osobna oś epok InSAR, regionalne warstwy OSM, karty obiektów, eksport GIS i import CSV. |
| `demos/04-flood-2d-3d/` | Flood Lab: mapa 2D, model terenu 3D i scenariusze wezbrania 0–72 godzin. |
| `demos/05-electricity-vegetation/` | Zestaw 2 / Energia: rzeczywiste GIS OSM na Śląsku, historia Sentinel-2 / NDVI, zbliżenia GUGiK oraz osobny scenariusz zarastania pasa linii. |

## Uruchamianie lokalne

Z katalogu repozytorium uruchom:

```bash
python3 -m http.server 8000
```

Następnie otwórz `http://localhost:8000/` i wybierz wersję. Serwer HTTP jest potrzebny do prawidłowego wczytywania lokalnych plików danych przez przeglądarkę. Wczesne prototypy HTML mogą korzystać z zasobów zewnętrznych i wymagają połączenia internetowego.

## Charakter danych i ograniczenia

- Energia / roślinność: domyślnie rzeczywiste geometrie i atrybuty OSM (snapshot 06.11.2026), niezależne od daty obrazu. Nie wyznaczono prześwitu ani zagrożeń dla rzeczywistych obiektów. Osobny, domyślnie wyłączony tryb zawiera symulowane korony, prześwity i alarmy. Historia Sentinel-2 jest rzeczywista; zbliżenia to niezależna mozaika GUGiK, bez przypisania do wybranego roku. Szczegóły w [opisie aplikacji energetycznej](demos/05-electricity-vegetation/README.md).
- InSAR: obrazy SAR, ortofotomapa i lokalizacje GIS są rzeczywiste; początkowe szeregi pomiarowe, alerty i prognozy InSAR są syntetyczne. Nie stanowią wyników analizy interferometrycznej rzeczywistych scen.
- Powódź: obrazy, model wysokościowy oraz lokalizacje GIS są rzeczywiste, natomiast wezbranie jest syntetycznym scenariuszem. Orientacyjny zasięg wyznacza uproszczony model powierzchni wody; demo nie jest prognozą hydrologiczną, mapą zagrożenia ani ostrzeżeniem. Nie uwzględnia wałów, przepływu, kalibracji i pomiarów w czasie rzeczywistym.
- Informacje o elementach sieci pochodzą z OSM i wymagają potwierdzenia przez operatora. Położenie punktu w zalanej komórce nie oznacza uszkodzenia słupa.
- Szczegółowe pochodzenie, daty i ograniczenia danych znajdują się w oknach „Dane i metodologia” / „Dane i ograniczenia” poszczególnych demonstratorów.

## Źródła i prawa

Dane obejmują m.in. Copernicus Sentinel‑1/2 (w tym przetworzenia Geomatrix SAGRIS / Earth Search), ortofotomapy GUGiK, © OpenStreetMap contributors (ODbL), Terrain Tiles / Mapzen (m.in. EU‑DEM oraz USGS SRTM). Leaflet jest oprogramowaniem zewnętrznym. Należy zachować ich atrybucję i warunki korzystania. Zawartość repozytorium nie nadaje automatycznie odrębnej licencji na dane dostawców.


## Wspólny interfejs paneli monitoringu

Aplikacje roślinności (`05`) i deformacji (`03`) korzystają ze wspólnego stylu i zachowania paneli w `shared/monitoring-workspace.css` oraz `shared/monitoring-workspace.js`. Adaptery `unified-workspace.js` zachowują logikę i zbiory danych każdej aplikacji.

| Element | Wspólny wzorzec |
| --- | --- |
| Nawigacja | Mapa / Obiekt / Analiza; dodatkowy plan inspekcji w roślinności |
| Układ | Wskaźniki u góry, GIS po lewej, mapa pośrodku, szczegóły po prawej |
| Panele | Warstwy i Szczegóły można zwijać na komputerze; do 1000 px działają jako wzajemnie wykluczające się szuflady z przyciskiem zamknięcia i Escape |
| GIS | Zakładki Warstwy / Obiekty, wyszukiwanie linii, podpór i stacji, legenda napięć i karta źródłowa |
| Obrazy | Sentinel-2 / NDVI / lotnicze, automatyczny GUGiK w zbliżeniu, przycisk Pokaż archiwum |
| Czas | Jednakowy pasek lat i odtwarzanie pod mapą; niezależna dodatkowa oś epok InSAR w deformacjach |
| Eksport | Okno wyboru danych i formatu; zakres właściwy dla aplikacji |
| Dostępność | Strzałki oraz Home/End w głównej nawigacji, aktualne aria-selected/expanded/pressed, widoczne obramowanie fokusu |

Zmiana obejmuje prezentację i sterowanie. Nie dodaje nowych pomiarów ani nie łączy dat GIS, zobrazowań i symulacji. Bufory oraz wyniki demonstracyjne zachowują dotychczasowe oznaczenia i ograniczenia.

W obu panelach przycisk **Legenda GIS** na mapie włącza lub wyłącza opis kolorów napięć. Legenda boczna pozostaje dostępna. W scenariuszu roślinności, który zastępuje rzeczywisty GIS, przycisk jest ukryty. W lewym dolnym rogu obu map znajduje się wspólna metryczna **Skala odległości** (m / km), aktualizowana przy zmianie zbliżenia. Nie jest to informacja o wysokości terenu ani obiektu.
