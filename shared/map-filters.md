# Filtry zawartości mapy

Wspólny panel `map-filters.js` / `map-filters.css` jest dostępny przyciskiem **Filtry** w trzech aktualnych aplikacjach. Sekcje typów elektrowni, rodzajów linii i szczegółów są początkowo zwinięte. Ustawienia zapisuje lokalnie klucz `iw-map-filters-v1`; są odczytywane po przeładowaniu i przejściu do innego panelu tej samej witryny. Uszkodzone ustawienia są zastępowane widokiem podstawowym.

## Początek i szybkie wybory

- **Podstawowy:** elektrownie cieplne/paliwowe i wodne z podaną mocą elektryczną co najmniej 500 MW; napowietrzne linie z podanym napięciem 400 lub 220 kV. Stacje, urządzenia i podpory są wyłączone. Krajowy przegląd pokazuje 18 rekordów elektrowni i 2 634 odcinki sieci.
- **Wszystko:** wszystkie typy i wielkości elektrowni, wszystkie kategorie napięć, linie napowietrzne i kablowe oraz dodatkowe obiekty. Szczegóły zachowują zależność od przybliżenia / wybranego obszaru; przegląd kraju nie jest pełnym eksportem krajowej inwentaryzacji.
- **Wyczyść:** żaden typ elektrowni, linii lub dodatkowej infrastruktury. Podkład i granica Polski pozostają dostępne. Wybrany obiekt analizy może pozostać neutralnym punktem referencyjnym z kołem otoczenia.

Własny wybór działa natychmiast. Nie usuwa danych źródłowych ani planu inspekcji. Przycisk „Podstawowy” przywraca spokojny widok.

## Rodzaje i brakujące informacje

Elektrownie: cieplne/paliwowe, wodne, wiatrowe, fotowoltaiczne, biomasa/biogaz/odpady, jądrowe oraz inne/nieokreślone. Obowiązuje ta sama klasyfikacja tagów OSM co dla symboli. Osobne pole „Tylko duże obiekty · od 500 MW” ogranicza moc; po jego wyłączeniu widoczne są także małe instalacje i wpisy bez podanej mocy. Nie rozpoznaje się rodzaju ze zdjęcia lub nazwy.

Linie: dokładne wartości 400, 220 i 110 kV, pozostałe znane wartości oraz brak danych. Wielonapięciowa linia pasuje, gdy **przynajmniej jedna** jej wartość należy do wybranych kategorii. Puste, zerowe, ujemne i niepoprawne zapisy nie stają się znanym napięciem. Napowietrzne odpowiadają źródłowym `power=line` i `minor_line`, kablowe — `power=cable`. Przegląd uzupełniono o 1 472 istniejące w szczegółach odcinki kablowe z napięciem co najmniej 110 kV. Nie dodano nowych geometrii do krajowej inwentaryzacji.

Pozostałe szczegóły można wybrać oddzielnie: stacje; transformatory i urządzenia; słupy i podpory. Podpory pobierane są dopiero po ich włączeniu i odpowiednim zbliżeniu lub wskazaniu obszaru. Ich źródłowe geometrie mogą być punktami, liniami lub poligonami; zachowano wszystkie te reprezentacje.

## Spójność mapy i eksportu

Filtry są stosowane do wczytanego GIS przed renderowaniem. Aktualizują listy, liczniki, wyszukiwarkę obiektów GIS i eksport. `loading_scope.display_filters`, `filters_applied` i `unfiltered_loaded_count` w GeoJSON dokumentują ustawienia oraz liczebność źródłowego wycinka. Źródłowy `metadata.feature_count` nadal opisuje cały krajowy zbiór.

Katalog obiektów do analizy pozostaje pełnym katalogiem; lista pobliskich linii uwzględnia aktywne filtry napięcia i przebiegu. Oddzielne modele powodzi, punkty/szeregi InSAR i historia zdjęć zachowują własne dane i zasięgi. Filtry nie zmieniają ich wyników. W scenariuszu symulowanym roślinności panel filtrów rzeczywistego GIS jest ukryty.

Wersja danych w URL zapytań odpowiada wersji skryptu, aby po publikacji przeglądarka pobierała nowy przegląd i jego metadane. Cache partycji pozostaje ograniczony.

## Sprawdzenie i odtworzenie przeglądu kabli

```text
node shared/map-filters.test.cjs
node shared/national-power.test.cjs
python shared/prepare_cable_overview.py --geo-libs /cache/python-libraries
```

Skrypt kabli używa istniejących partycji krajowych, usuwa duplikaty według ID OSM i stosuje dotychczasowe uproszczenie przeglądowe. Aktualizuje liczby oraz sumę SHA-256 przeglądu. Pełne odtworzenie `prepare_national_power.py` również obejmuje te kable.
