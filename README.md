# InfraWatch — demonstratory

Zbiór dotychczasowych wersji demonstracyjnych projektu InfraWatch. Każda wersja znajduje się w osobnym katalogu; pliki oryginalnych demonstratorów pozostawiono jako osobne migawki.

| Katalog | Zawartość |
| --- | --- |
| `demos/00-early-prototypes/` | Dwa pierwsze prototypy HTML: mapa SAR/GIS oraz porównanie SAR/GIS. |
| `demos/01-sar-gis/` | Demo SAR Sentinel‑1 i geometrii linii energetycznej koło Kozienic. |
| `demos/02-insar-v1/` | Pierwsza wersja InSAR: syntetyczne szeregi przemieszczeń, prognoza trendu i import CSV. |
| `demos/03-insar-multisensor-v2/` | InSAR, Sentinel‑1, Sentinel‑2, ortofotomapa GUGiK i karty słupów OSM. |
| `demos/04-flood-2d-3d/` | Flood Lab: mapa 2D, model terenu 3D i scenariusze wezbrania 0–72 godzin. |

## Uruchamianie lokalne

Z katalogu repozytorium uruchom:

```bash
python3 -m http.server 8000
```

Następnie otwórz `http://localhost:8000/` i wybierz wersję. Serwer HTTP jest potrzebny do prawidłowego wczytywania lokalnych plików danych przez przeglądarkę. Wczesne prototypy HTML mogą korzystać z zasobów zewnętrznych i wymagają połączenia internetowego.

## Charakter danych i ograniczenia

- InSAR: obrazy SAR, ortofotomapa i lokalizacje GIS są rzeczywiste; początkowe szeregi pomiarowe, alerty i prognozy InSAR są syntetyczne. Nie stanowią wyników analizy interferometrycznej rzeczywistych scen.
- Powódź: obrazy, model wysokościowy oraz lokalizacje GIS są rzeczywiste, natomiast wezbranie jest syntetycznym scenariuszem. Orientacyjny zasięg wyznacza uproszczony model powierzchni wody; demo nie jest prognozą hydrologiczną, mapą zagrożenia ani ostrzeżeniem. Nie uwzględnia wałów, przepływu, kalibracji i pomiarów w czasie rzeczywistym.
- Informacje o elementach sieci pochodzą z OSM i wymagają potwierdzenia przez operatora. Położenie punktu w zalanej komórce nie oznacza uszkodzenia słupa.
- Szczegółowe pochodzenie, daty i ograniczenia danych znajdują się w oknach „Dane i metodologia” / „Dane i ograniczenia” poszczególnych demonstratorów.

## Źródła i prawa

Dane obejmują m.in. Copernicus Sentinel‑1/2 (w tym przetworzenia Geomatrix SAGRIS / Earth Search), ortofotomapy GUGiK, © OpenStreetMap contributors (ODbL), Terrain Tiles / Mapzen (m.in. EU‑DEM oraz USGS SRTM). Leaflet jest oprogramowaniem zewnętrznym. Należy zachować ich atrybucję i warunki korzystania. Zawartość repozytorium nie nadaje automatycznie odrębnej licencji na dane dostawców.
