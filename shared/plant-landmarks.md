# Oznaczenia elektrowni i obiektów wytwarzania energii

Wspólna warstwa dla trzech paneli: `plant-landmarks.js`, `plant-landmarks.css`, katalog `power-plants.json.gz` (około 277 kB). Snapshot OSM / Geofabrik: **14.11.2026 21:20:41 UTC**, **4 653 identyfikatory OSM** `power=plant` przecinające granicę Polski PRG. Katalog zawiera punkty oraz obiekty obszarowe i zespoły instalacji zapisane jako relacje site. Dziewięć wcześniej wyróżnionych nazw pozostaje dostępnych w wyszukiwarce, z aktualnymi atrybutami źródłowymi.

## Widoczność i obsługa

- W widoku kraju obiekty z podaną mocą elektryczną >=500 MW mają osobne symbole. Mniejsze są grupowane w stałej siatce ekranu. Liczba przy grupie to liczba identyfikatorów OSM, nie potwierdzonych odrębnych elektrowni. Kliknięcie grupy przybliża jej obszar.
- Od z8 próg osobnego symbolu wynosi 100 MW; od z12 wszystkie obiekty mają osobne znaczniki. Wybrany obiekt pozostaje indywidualny niezależnie od mocy i zoomu. Grupowanie nie usuwa ani nie przesuwa danych źródłowych; położenie symbolu grupy jest średnią pozycji jej członków.
- W widoku kraju etykiety otrzymują obiekty >=1000 MW i wybrany obiekt. Od z8 nazwy pojawiają się przy pozostałych indywidualnych symbolach. Etykiety są ograniczane przy kolizjach; pełna nazwa pozostaje w podpowiedzi i karcie. Wybrana elektrownia ma dodatkową obwódkę. To poziomy przybliżenia mapy, nie fizyczne wysokości budynków lub terenu.
- Symbole i kolory: cieplne/paliwowe, wodne, wiatrowe, fotowoltaiczne, biomasa/biogaz/odpady, jądrowe oraz inne/nieokreślone. Typ pochodzi z `plant:source`, ewentualnie `generator:source`. Nie jest zgadywany z nazwy lub zdjęcia. Źródła wielokrotne należące do jednej kategorii zachowują tę kategorię; mieszane źródła z różnych kategorii są oznaczone jako inne.
- Kliknięcie indywidualnego symbolu pokazuje nazwę, źródło energii, operatora, źródłowy zapis mocy i link OSM. „Przybliż obiekt” otwiera zbliżenie od z13. „Wybierz obiekt do analizy” otwiera istniejący wybór otoczenia i pobliskich linii.
- Warstwę można wyłączyć w panelu warstw; legenda objaśnia symbole. Działa niezależnie od roku Sentinel-2, NDVI i lotniczego GUGiK. W odrębnym scenariuszu symulowanym roślinności jest ukrywana. Markery są dostępne z klawiatury.

## Pochodzenie i ograniczenia

© OpenStreetMap contributors, ODbL 1.0. Wyciąg: https://download.geofabrik.de/europe/poland.html. Znaczenie tagów: https://wiki.openstreetmap.org/wiki/Tag:power%3Dplant oraz https://wiki.openstreetmap.org/wiki/Key:plant:source.

`power=plant` obejmuje różne obiekty produkcji energii, także o niepodanym wyjściu elektrycznym. Wykluczono wpisy jawnie oznaczone jako nieprodukujące elektryczności. Brak źródła, operatora i mocy pozostaje brakiem. Dane nie ustalają bieżącej pracy, kompletności inwentaryzacji ani połączenia z pobliską siecią.

Dla poligonów stosuje się punkt na geometrii. Relacje site mają punkt orientacyjny pośrodku prostokąta dostępnych członków relacji; liczby członków i rozpoznanych pozycji zapisano w katalogu (dwie relacje mają częściowe pokrycie członków). Nie tworzono fikcyjnych obrysów zakładów. Osobne identyfikatory OSM mogą dotyczyć tego samego zespołu instalacji. Warstwa nie rozszerza zasięgu modeli zalania, danych SAR lub pomiarów InSAR.

## Odtworzenie i sprawdzenie

Wykorzystuje istniejący krajowy PBF poza repozytorium, Python z `osmium` i `shapely`:

```text
python shared/prepare_power_plants.py --input /cache/poland.osm.pbf
node shared/plant-landmarks.test.cjs
```

Opcjonalne `--geo-libs` wskazuje katalog lokalnych bibliotek. Test kontroluje źródła, identyfikatory największych elektrowni, typy symboli, przeliczenie zapisów mocy i zachowanie wszystkich identyfikatorów przy grupowaniu na sześciu poziomach zoomu.
