# InfraWatch — demonstratory

Centrum demonstracyjne projektu InfraWatch. Strona główna prowadzi od mapy Polski do wyboru konkretnej linii lub obiektu. Oddzielnie prezentuje dostępne funkcje mapy, trzy działające demonstratory analiz (roślinność, deformacje, zalanie) oraz planowane rozszerzenia. Każda aplikacja znajduje się w osobnym katalogu.

Aktualna warstwa GIS w trzech panelach obejmuje całą Polskę: **1 119 942 obiekty**, snapshot **14.11.2026 21:20:41 UTC**. Zawiera 17 162 odcinki główne, 90 894 lokalne, 26 174 kable, 942 048 podpór, 32 594 stacje i 10 424 transformatory oraz pozostałe urządzenia OSM. Szczegóły są pobierane przestrzennie; skompresowane partycje zajmują 52,6 MB, przegląd 1,5 MB, katalog stacji 1,1 MB. Dawne regionalne pliki GIS pozostają w repozytorium jako źródła archiwalne i do migracji istniejących planów. Ich zasięg nie ogranicza bieżącej mapy. Modele analiz i archiwum obrazów zachowują własne, odrębne zasięgi.

Wspólna nawigacja prowadzi do katalogu aplikacji, [danych i metodologii](dane-i-metodologia.html), [archiwum](archiwum.html) i repozytorium. Nagłówki aktualnych aplikacji oraz wersji SAR/GIS i InSAR v1 korzystają z komponentu `shared/infrawatch-shell.js` i stylów `shared/infrawatch-shell.css`. W nagłówku aplikacji można przełączyć demonstrator lub wrócić do katalogu. Oryginalne wczesne prototypy zachowano jako migawki w archiwum.

Wygląd katalogu, archiwum i opisu źródeł jest wspólny (`shared/portal.css`); strona startowa ma dodatkowy, odrębny styl `shared/homepage.css`. Pokazuje sześć dostępnych funkcji: wybór linii do analizy, zbliżenie na obiekt, ogólnopolski GIS, filtry typów i napięć, historię zdjęć oraz wybór zakresu i eksport. Główny przycisk otwiera moduł energetyczny z parametrem `start=line`, który włącza wskazywanie linii po inicjalizacji mapy. Samo wejście nie zmienia wcześniejszego celu analizy ani zapisanych filtrów. Podgląd SVG na stronie pochodzi z rzeczywistych, uproszczonych geometrii PRG/OSM; nie jest mapą interaktywną.

Karty demonstratorów oddzielnie opisują pochodzenie podkładów/GIS i charakter wyników analizy. Pomiary prześwitu, przetwarzanie rzeczywistych scen InSAR i rozszerzanie modeli zalania opisano jako kierunki dalszego rozwoju, z wymaganymi danymi i walidacją; bez deklaracji terminów lub gotowych wyników. Gaz, transport i woda pozostają planowanymi modułami kolejnych sektorów.

| Katalog | Zawartość |
| --- | --- |
| `demos/00-early-prototypes/` | Dwa pierwsze prototypy HTML: mapa SAR/GIS oraz porównanie SAR/GIS. |
| `demos/01-sar-gis/` | Demo SAR Sentinel‑1 i geometrii linii energetycznej koło Kozienic. |
| `demos/02-insar-v1/` | Pierwsza wersja InSAR: syntetyczne szeregi przemieszczeń, prognoza trendu i import CSV. |
| `demos/03-insar-multisensor-v2/` | Mapa deformacji: historia Sentinel-2 / NDVI 2020–2025, szczegółowy GUGiK WMS (PNG), osobna oś epok InSAR, ogólnopolskie warstwy OSM, karty obiektów, eksport GIS i import CSV. |
| `demos/04-flood-2d-3d/` | Flood Lab: mapa 2D, model terenu 3D i scenariusze wezbrania 0–72 godzin. |
| `demos/05-electricity-vegetation/` | Zestaw 2 / Energia: ogólnopolski GIS OSM, linie, kable i urządzenia, historia Sentinel-2 / NDVI, zbliżenia GUGiK oraz osobny scenariusz zarastania pasa linii. |

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

Przycisk **Wybierz obiekt** rozpoczyna analizę od elektrowni, elektrociepłowni, OZE lub stacji elektroenergetycznej. Menu wyszukuje po nazwie i ID OSM, pokazuje punkt referencyjny, źródło oraz listę pobliskich linii. Promień 1, 2, 5, 10, 20 lub 30 km filtruje rzeczywiste geometrie przecinające koło; sieć lokalną można włączyć osobno. Wybrany obiekt i koło są oznaczone na mapie. Przycisk **Pobliskie linie** pod mapą otwiera listę; wybór linii prowadzi do jej karty. Listy GIS w trybie obiektu są sortowane według odległości.

Katalog `shared/analysis-facilities.json` zawiera wspólną listę 9 wybranych, nazwanych obiektów wytwarzania energii oraz 911 stacji. Każda z trzech funkcjonalności — roślinność, deformacje i zalanie — pozwala wybrać dowolny z tych obiektów. Domyślnie menu pokazuje 9 elektrowni / elektrociepłowni / OZE; rodzaj i region można filtrować. Obiekt, promień i wybór lokalnych linii są zachowywane w URL oraz w odnośnikach do pozostałych funkcjonalności. GIS i archiwum obrazów przełączają się na właściwy zbiór Śląska lub Kozienic przez `shared/regional-data.js`; obrazy nie są przesuwane pomiędzy regionami.

Nowe punkty elektrowni pochodzą z Overpass, snapshot 06.11.2026 23:02:07 UTC; zapytanie, data pobrania, ID, nazwa źródłowa i bbox są zachowane w katalogu. Punkt obiektu jest środkiem obrysu OSM, nie pomiarem geodezyjnym. Nie wnioskujemy o bieżącym stanie pracy elektrowni ani połączeniu elektrycznym na podstawie samej odległości.

Dostępność analizy jest niezależna od listy obiektów. Historia Sentinel-2 / NDVI i GIS są dostępne w obu regionach. Rzeczywiste InSAR wymaga importu, a początkowe punkty syntetyczne pozostają przy F401 koło Kozienic. Model zalania i teren 3D obejmują jedynie pierwotny obszar Wisły koło Kozienic. Poza nim panel zalania pokazuje GIS i obrazy, oznacza brak modelu i blokuje symulację oraz 3D; nie przenosi wody lub terenu pod inną elektrownię. W zasięgu modelu wynik i lista słupów F401 są ograniczane do wybranego koła. [Zakres modelu zalania](demos/04-flood-2d-3d/README.md).

Testy danych między regionami i zasięgu modeli: `node shared/regional-data.test.cjs`.

Opcja **Obszar ręcznie** w tym menu wybiera środek przez współrzędne, listę lokalizacji lub kliknięcie mapy. Można też wskazać dwa narożniki albo użyć widocznego kadru. Szerokość i wysokość wynoszą od 0,1 do 100 km; szybkie rozmiary obejmują 1 × 1, 10 × 10, 25 × 10 i 50 × 20 km. Granica i informacja o pokryciu danych są widoczne pod mapą. Przycisk × wyłącza filtr i przywraca pełny zbiór; nie usuwa planu inspekcji ani importu CSV.

Wybór filtruje obiekty GIS przecinające prostokąt, liczniki, wyszukiwarkę i eksport GeoJSON, a w deformacjach także punkty analizy i ich statystyki. Geometrie są zachowane w całości; długości źródłowe odnoszą się do pierwotnego obszaru danych. Raporty GeoJSON/JSON zapisują `study_area`; osobny eksport zapisuje sam prostokąt. Wybór obszaru w roślinności otwiera rzeczywisty GIS. Włączenie odrębnego scenariusza symulowanego wyłącza filtr, przywracając jego pierwotną geografię.

W trybie obiektu `study_area` zawiera również `shape: circle`, dane wybranego obiektu, promień i ustawienie sieci lokalnej. Osobny eksport obszaru zapisuje koło jako przybliżenie wielokątem 128 odcinków. Filtr punktów i geometrii działa według odległości sferycznej; nie ogranicza się do kwadratu otaczającego koło. Testy obejmują linie przecinające koło przy obu końcach poza nim, narożniki bbox, końce odcinków i otwory poligonów. Żaden nowy rzeczywisty pomiar InSAR ani prześwitu nie został dodany.

Wskazanie nowej lokalizacji pobiera ogólnopolski GIS dla kadru/wyboru, ale nie tworzy pomiarów. W trybie „Cała Polska” dostępne są ogólnopolskie mozaiki letnie Sentinel-2 i NDVI. W trybie „Archiwum regionalne” poza przygotowanym zbiorem dostępna pozostaje ortofotomapa GUGiK; niedostępna historia jest blokowana. Dane zachowują oryginalne współrzędne; nie przenosi się zdjęć ani pomiarów z obszaru demonstracyjnego. Wymiary są przybliżeniem sferycznym, nie pomiarem geodezyjnym. Testy granic geometrii i wymiarów: `node shared/study-area.test.cjs`.


## Większy geograficzny zasięg Sentinel-2

Przywrócono układ menu sprzed zmiany #10. Poszerzenie dotyczy rzeczywistych danych obrazowych, a nie rozmiaru panelu mapy. Wszystkie trzy aplikacje korzystają ze wspólnych regionalnych mozaik RGB; roślinność i deformacje także z odpowiadającego im NDVI dla czterech terminów 2020/2022/2024/2025.

| Region | Poprzedni bbox W,S,E,N | Nowy bbox W,S,E,N | Przybliżony rozmiar |
| --- | --- | --- | --- |
| Śląsk | 18.0,49.98,19.2,50.46 | 17.8,49.75,19.6,50.75 | 128 × 111 km, około 3,1 razy większa powierzchnia |
| Kozienice | 21.24,51.48,21.86,51.78 | 20.75,51.15,22.25,52.05 | 104 × 100 km, około 7,3 razy większa powierzchnia |

W każdym terminie połączono sąsiednie kafle MGRS z tego samego dnia, satelity i orbity względnej. Współrzędne wynikają z reprojekcji źródłowych rastrów do EPSG:3857; nie rozciągano dawnego wycinka na większy bbox. Mozaiki mają szerokość 3072 px; natywne pasma B04/B08 mają 10 m, a przegląd regionalny około 42 m/px (Śląsk) lub 34 m/px (Kozienice). Zbliżenia nadal używają lotniczego GUGiK. Metadane scen zawierają wszystkie użyte źródła, footprinty, daty, orbity, zachmurzenie poszczególnych kafli, offsety, liczbę wniesionych pikseli, pokrycie oraz liczbę pikseli nodata. Maska NDVI wyklucza chmury, cienie, śnieg i brak danych; duży zasięg RGB nie oznacza bezchmurnego NDVI.

Nowe bbox mieszczą promień 30 km wokół wszystkich dziewięciu elektrowni / elektrociepłowni / OZE z katalogu. Zbiory GIS, pojedynczy kadr SAR Sentinel-1 i modele InSAR / zalania zachowują własne, dotychczasowe zasięgi. Większe pokrycie Sentinel-2 nie dodaje infrastruktury GIS ani wyników pomiarów poza przygotowanymi zbiorami.

Odtworzenie: `python shared/prepare_expanded_history.py --cache <katalog-cache>` (rasterio, numpy, Pillow; opcjonalnie `--geo-libs <katalog-bibliotek>`). Test geograficznego rozszerzenia i pochodzenia: `node shared/expanded-history.test.cjs`.

## Sentinel-2 dla całej Polski

Trzy aktualne panele udostępniają przełącznik „Cała Polska · mozaika letnia” / „Archiwum regionalne” i przycisk „Pokaż Polskę”. Domyślne pokrycie Sentinel-2 obejmuje Polskę (bbox 13–25°E / 48,9–56,2°N, z pasem Bałtyku); GIS ma także zasięg ogólnopolski; SAR, InSAR i model zalania zachowują niezależne, regionalne zasięgi. Panel zalania udostępnia także wybór roku podkładu 2D; tekstura terenu 3D pozostaje oryginalnym obrazem lokalnym.

Na mapach trzech paneli znajduje się jasny obrys granicy Polski z ciemnym podbiciem. Źródło: publiczna usługa WFS GUGiK / PRG, warstwa `ms:A00_Granice_panstwa`, pobranie 14.11.2026, wersja źródłowa 28.07.2026. Granica obejmuje także morze terytorialne. Lokalny GeoJSON `shared/poland-boundary.geojson` zachowuje metadane i oryginalne położenie; geometrię uproszczono do około 25 m dla płynnego wyświetlania. Obrys pozostaje widoczny przy zmianie lat, RGB/NDVI i ortofotomapy, nie blokuje klikania obiektów GIS. Odtworzenie: `python shared/prepare_poland_boundary.py`.

Krajowe RGB i NDVI to mozaiki z okresu **1 czerwca–31 sierpnia** lat **2020, 2022, 2024, 2025**, z danych Copernicus Sentinel-2 L2A w Microsoft Planetary Computer. Sceny są sortowane rosnąco według zachmurzenia całej sceny (<10%); mozaika wybiera pierwszy ważny piksel. Daty mogą różnić się między pikselami. To nie są pojedyncze przeloty ani pomiary zmian w jednej dacie. Regionalne archiwum konkretnych terminów zachowano osobno.

Widok całego kraju korzysta z lekkich podglądów WebP w `shared/national-sentinel/`. Ich położenie wynika z macierzy WebMercatorQuad, nie z rozciągania regionalnych obrazów. Od z9 szczegółowe kafle są pobierane online; od z12 jak dotąd automatycznie włącza się ortofotomapa GUGiK. Rejestracja wyszukania mozaiki następuje w przeglądarce, bez kluczy i zapisanych wygasających identyfikatorów. Błędy kafli są oznaczane; „Ponów kafle” odnawia wyszukanie. Usługa zewnętrzna może mieć przerwy i limity.

NDVI online używa `(B08-B04)/(B08+B04)` po zastosowaniu wewnętrznej skali i offsetu. **Nie stosuje maski chmur SCL na poziomie pikseli**; mogą pozostać chmury, szwy lub braki. Nie zastępuje regionalnych, osobno obliczonych i maskowanych próbek ani walidowanej analizy roślinności.

Odtworzenie podglądów: `python shared/prepare_national_sentinel.py` (Pillow, internet; wznawialny cache poza repozytorium). Metadane: `shared/national-sentinel/metadata.json`. Testy: `node shared/national-sentinel.test.cjs`. Dostawca: [Sentinel-2 L2A / Microsoft Planetary Computer](https://planetarycomputer.microsoft.com/dataset/sentinel-2-l2a), [API](https://planetarycomputer.microsoft.com/api/data/v1/docs). Contains modified Copernicus Sentinel data.

## Uzupełnienie zdjęć nad Bałtykiem

Mozaiki RGB i NDVI wszystkich czterech lat rozszerzono na pas Bałtyku; zapytanie obejmuje 13–25°E / 48,9–56,2°N. Georeferencjonowane podglądy mają 2304 × 2432 px i obejmują całe kafle WebMercatorQuad z9: 12,65625–25,3125°E / 48,45835–56,55948°N. To nowe dane źródłowe, nie rozciągnięcie starych obrazów.

W trzech panelach podkład lotniczy korzysta z GUGiK WMS StandardResolution, warstwa Raster, PNG z przezroczystością. Nad morzem i w lukach ortofotomapy widoczny jest Sentinel-2 z wybranego roku, umieszczony pod kaflami lotniczymi. Identyfikacja źródeł jest jawna w podpisie mapy, opisie czasu i oknie danych. Daty nalotów GUGiK pozostają niezależne; satelitarne uzupełnienie nie jest fotografią lotniczą. Błędy usługi GUGiK odsłaniają uzupełnienie i są sygnalizowane.

Wspólna fabryka warstwy `InfraWatchSentinel.createAerialLayer` utrzymuje kolejność podkładów, przełącza rok uzupełnienia oraz usuwa obie części przy zmianie warstwy. Model zalania i tekstury 3D zachowują własny zakres i źródła.


## Ogólnopolska mapa infrastruktury energetycznej

Trzy aktualne panele korzystają ze wspólnego snapshotu Polski OSM / Geofabrik, przygotowanego przez `shared/prepare_national_power.py`. Obejmuje linie, sieć lokalną, kable, podpory, stacje, transformatory, łączniki, kompensatory i przekształtniki według tagów OSM. Nie gwarantuje kompletności ani weryfikacji przez operatora. power=line może dotyczyć przesyłu i dystrybucji.

`shared/national-power.js` pobiera przestrzenne partycje z `shared/national-power/`. Przegląd kraju obejmuje uproszczone linie główne, kable od 110 kV i stacje wysokich napięć; szczegóły sieci lokalnej, kabli i urządzeń są pobierane od z11, podpory od z14, lokalne słupy wyświetlane od z16. W wybranym obszarze dostępne są wszystkie kategorie; podpory są pobierane po ich włączeniu. Liczniki, wyszukiwarka i eksport obejmują aktualnie wczytany kadr/wybór, z opisem `loading_scope`. Pełne geometrie i OSM ID są zachowane; duplikaty na granicach partycji usuwane w kliencie. PBF i cache roboczy pozostają poza repozytorium.

Wyszukiwarka obiektów obejmuje stacje z całej Polski oraz ogólnopolski katalog 4 653 obiektów wytwarzania OSM (wcześniej dziewięć wybranych). Odległość od stacji nie dowodzi połączenia elektrycznego. Rozszerzenie GIS nie dodaje pomiarów prześwitu, InSAR ani modeli zalania poza ich pierwotnym zasięgiem. Dane źródłowe i odtworzenie opisuje [dokumentacja warstwy krajowej](shared/national-power/README.md). Kontrola całego zbioru i zapytań w dziewięciu miastach: `node shared/national-power.test.cjs`.

## Symbole elektrowni na różnych poziomach przybliżenia

Trzy panele korzystają z `shared/plant-landmarks.js` i krajowego katalogu `shared/power-plants.json.gz` (około 277 kB, snapshot 14.11.2026). Wyraźne symbole rozróżniają źródła energii według tagów OSM. W widoku kraju większe elektrownie mają indywidualne znaczniki, a mniejsze instalacje są grupowane; kliknięcie grupy przybliża mapę. Od z12 każdy obiekt ma osobny symbol. Nazwy dostosowują się do skali i unikają kolizji; pełna nazwa jest dostępna w podpowiedzi i karcie. Wybrany obiekt pozostaje wyróżniony. Karta prowadzi do zbliżenia albo wyboru otoczenia do analizy.

Warstwę można wyłączyć; pozostaje niezależna od podkładu i roku zobrazowań. Nie przypisuje pomiarów wysokości ani bieżącego stanu pracy. Katalog obejmuje 212 zespołów instalacji zapisanych jako relacje site; ich punkty orientacyjne pochodzą z pozycji członków relacji. Identyfikatory OSM mogą opisywać nakładające się części tej samej instalacji. [Symbole, progi widoczności, ograniczenia i odtworzenie](shared/plant-landmarks.md). Sprawdzenie: `node shared/plant-landmarks.test.cjs`.


## Wybór typów i spokojny widok początkowy

Przycisk **Filtry** otwiera wspólny panel rodzajów elektrowni, napięć i przebiegu linii oraz szczegółów infrastruktury. Domyślnie pokazuje 18 dużych elektrowni cieplnych/wodnych (wg podanej mocy >=500 MW) i 2 634 napowietrzne odcinki 400/220 kV. Pozostałe typy, 110 kV, inne/brakujące napięcia, kable, stacje, urządzenia i podpory są dostępne po zmianie filtrów. Presety **Podstawowy**, **Wszystko**, **Wyczyść** pozwalają szybko zmieniać zakres. Wybór jest zapamiętywany lokalnie i odczytywany przez trzy panele.

Liczniki, listy pobliskich linii i eksport odpowiadają aktywnym filtrom; GeoJSON zapisuje je w `loading_scope.display_filters`. Źródłowe dane, modele i plan inspekcji pozostają zachowane. Przegląd zawiera teraz również 1 472 kablowe odcinki od 110 kV, wyprowadzone z istniejących szczegółów; liczba obiektów krajowej inwentaryzacji nie zmieniła się. [Działanie i odtworzenie filtrów](shared/map-filters.md). Sprawdzenie: `node shared/map-filters.test.cjs`.
