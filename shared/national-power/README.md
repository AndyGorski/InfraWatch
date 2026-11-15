# Ogólnopolska infrastruktura energetyczna

Źródło: © OpenStreetMap contributors, ODbL 1.0. Wyciąg Polski udostępnia Geofabrik: https://download.geofabrik.de/europe/poland.html. Dokładny timestamp źródłowego PBF, liczby obiektów, pominięcia, rozmiary i sumy SHA-256 partycji znajdują się w `metadata.json`.

Zbiór obejmuje `power=line`, `minor_line`, `cable`, `tower`, `pole`, `substation`, `transformer`, `switch`, `compensator` i `converter`. To ogólnopolski zakres danych publicznych, nie pełna inwentaryzacja operatorów. Linie obejmują przesył oraz dystrybucję; nie przypisuje się operatora ani funkcji na podstawie samego napięcia. Braki atrybutów pozostają brakami.

Geometrie zachowują współrzędne źródłowe EPSG:4326 i identyfikatory OSM. Wybrano obiekty przecinające granicę Polski PRG; zachowano ich pełne geometrie także przy granicy i poza obszarem badania. Otwarte sposoby reprezentacji stacji/urządzeń pozostają liniami; zamknięte drogi i relacje multipolygon są składane jako poligony z otworami. Nieobsługiwane relacje nieobszarowe i niekompletne geometrie są zliczane w pominięciach. Nie dodano sztucznych obiektów.

## Ładowanie

- `overview.json.gz`: uproszczone linie główne oraz kable i stacje z podanym napięciem >=110 kV, tolerancja 0,0005 stopnia. Geometria przeglądowa ma `generalized: true` i odnośnik do pełnych szczegółów.
- `line-catalog.json.gz`: lekki krajowy indeks wszystkich odcinków `line`, `minor_line` i `cable`, przechowujący podstawowe atrybuty, identyfikator partycji i końce geometrii. Wyszukiwarka może znaleźć linię w całej Polsce, a jej wybór pobiera dokładny obiekt z partycji. Indeks jest przeznaczony do wyszukiwania, nie do pomiarów ani wyznaczania zagrożeń.
- `network/10/x/y.json.gz`: pełne linie, kable, stacje i urządzenia. Pobierane od z11.
- `supports/10/x/y.json.gz`: pełne podpory. Pobierane od z14; lokalne słupy wyświetlane od z16.
- Wybór obszaru badania udostępnia wszystkie kategorie niezależnie od zoomu; podpory są pobierane dopiero po ich włączeniu. Liczniki, wyszukiwarka i eksport uwzględniają aktywne filtry i dotyczą wczytanego kadru/wyboru, a nie całego krajowego zbioru. `loading_scope` w GeoJSON opisuje zakres i poziom szczegółowości.
- Przecięcia granic partycji nie obcinają linii. Ten sam obiekt może wystąpić w kilku plikach; klient usuwa duplikaty według pełnego ID OSM. Równoległość pobierania wynosi maksymalnie 6 na zapytanie, a cache mieści 96 partycji. Nieaktualne zapytania nie nadpisują nowszego widoku.
- Pliki `.json.gz` są jawnie rozpakowywane w aktualnych przeglądarkach przez `DecompressionStream`; hosting nie musi nadawać `Content-Encoding: gzip` ani uruchamiać backendu GIS.
- `facilities.json.gz` zawiera stacje z całej Polski oraz punkty referencyjne wewnątrz ich geometrii. Nie dowodzi połączenia pobliskich linii z daną stacją. Katalog elektrowni i obiektów wytwarzania znajduje się osobno w `../power-plants.json.gz`.

Daty GIS, zdjęć Sentinel-2, nalotów GUGiK, danych InSAR i modeli są niezależne. Ogólnopolska geometria nie rozszerza zasięgu demonstracyjnego zalania ani syntetycznych pomiarów i nie stanowi oceny zagrożeń.

## Odtworzenie

Python: `osmium`, `shapely`. PBF i cache poza repozytorium:

```text
python shared/prepare_national_power.py --input /cache/poland.osm.pbf --cache /cache/power
node shared/national-power.test.cjs
```

Po zbudowaniu partycji istniejącego snapshotu można odtworzyć sam indeks wyszukiwania poleceniem `node shared/build_line_catalog.cjs`.

Opcjonalne `--geo-libs` wskazuje katalog bibliotek, a `--repack` ponownie pakuje wcześniej wyodrębniony NDJSON. Przed ponownym generowaniem należy użyć czystego katalogu wyjściowego; manifest określa aktywne partycje. Duży PBF i pliki robocze nie są publikowane. Atrybucja ODbL jest dodawana do każdego obiektu przy wczytaniu i zachowywana w eksporcie.
