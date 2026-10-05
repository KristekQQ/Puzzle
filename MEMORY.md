# Puzzle / Kousek — paměť projektu

Aktualizováno: 2026-10-05. Tento soubor uchovává technický kontext pouze tohoto projektu. Aktuální zdrojový kód a Git mají přednost před staršími poznámkami.

## Zadání a rozhodnutí

Vytvořit lokální hru v HTML a JavaScriptu, která načte obrázek ze složky a rozdělí jej na skutečné puzzle dílky s výstupky a prohlubněmi. Obrázek byl vytvořen pro tento projekt. Uživatel upřesnil první iteraci na **3 × 3** s možností měnit počet dílků konfigurací.

Druhá iterace: hra začíná bez dílků. Tlačítko **Nový dílek** losuje rovnoměrně ze všech typů s opakováním, včetně již umístěných typů. Tři volné instance lze přetáhnout do šrotovače a vyměnit za jednu náhodnou instanci, která může být také duplicitní. Vložené dílky lze před výměnou vrátit. Uživatel následně odmítl klikací výběr: aktuálně se dílky do šrotovače i zpět přesouvají pouze tažením. Obyčejný klik jejich umístění nemění. Horní tlačítko rychlé výměny bylo odstraněno.

Hra se jmenuje **Kousek**. Má české rozhraní a od edice 004 vizuál inspirovaný webem https://www.apollogames.cz/: tmavé fialové plochy, růžová pilulková tlačítka, velké úzké nadpisy, bílý zkosený panel logotypu a zlaté akcenty. Označení je KOUSEK PLAY. Od edice 005 se používá uživatelem dodaná předloha 40 Mystic Gem. Vzhled je vytvořen lokálním CSS a canvasem bez externích fontů. Běží bez frameworku, bundleru, backendu a externích služeb. Npm závislost Playwright slouží pouze testům.

Po složení všech typů (edice 006) se vedle „Nový dílek“ ukáže zlaté tlačítko **Vyber odměnu**. Všechna ostatní herní tlačítka, přesouvání dílků, klávesa F a navigace přes logo se zamknou. Ochrana je i v obsluze akcí, ne pouze přes HTML disabled. Stav a čas zůstávají zachované včetně zbylých kopií a šrotovače. Výběr konkrétní odměny nebyl specifikován; tlačítko zatím otevírá dialog s potvrzením složení a výslovnou informací, že skutečný výběr bude doplněn. Zavření dialogu hru neodemkne. Novou hru po výhře aktuálně umožní nové načtení stránky.

## Mapa kódu

| Soubor | Úloha |
| --- | --- |
| `index.html` | Rozhraní, lišta ovládání, canvas `#puzzle`, počítadlo, čas, loading a stavové zprávy. Načítá `config.js` před `game.js`. |
| `style.css` | Vzhled, responzivní rozložení, fullscreen, `touch-action: none` pro canvas a klávesnicový `:focus-visible`. |
| `config.js` | `window.PUZZLE_CONFIG`: `columns`, `rows`, `image`, `title`. Výchozí mřížka 3 × 3, obrázek `assets/40mysticgem_tile_large.jpg`, název `40 Mystic Gem`. |
| `game.js` | Samostatná IIFE: generování a kreslení dílků, myš/pointer, přichycení, časovač, předloha, náhodné dílky, šrotovač, stránkování a fullscreen. |
| `assets/40mysticgem_tile_large.jpg` | Aktuální uživatelem dodaná předloha 40 Mystic Gem, 1406 × 860. |
| `assets/lake-cottage.png` | Vygenerovaná ilustrace chaty u alpského jezera, 1536 × 1024, poměr 3:2. |
| `tests/browser.mjs` | Playwright test skutečného přetahování a ovládání. Očekává server na portu 5173 a výchozí config 3 × 3. |
| `serve.py` | Lokální HTTP server na 127.0.0.1:5173, vždy kořen tohoto projektu, hlavička `Cache-Control: no-store, max-age=0`. |
| `package.json`, `package-lock.json` | Skripty `start`, `test`; Playwright 1.58.1 jako vývojová závislost. |
| `README.md` | Spuštění a konfigurace pro uživatele. |
| `SKILL.md` | Projektový postup pro úpravy a ověřování. |
| `AGENTS.md` | Pokyny pro dalšího agenta v tomto repozitáři. |

## Jak fungují dílky

- `edge()` kreslí pomocí Bézierových křivek výstupek/prohlubeň; `shape()` sestaví uzavřený `Path2D`. Hrany jsou v pořadí horní, pravá, dolní, levá.
- Sousední hrany mají opačné znaménko, vnější okraje jsou rovné. Při změně geometrie musí hrany stále přesně navazovat.
- `drawPiece()` ořízne celý obrázek cestou dílku a posune obraz o jeho řádek/sloupec. Obraz musí pokračovat i ve výstupcích.
- Deska se po načtení obrázku vejde do prostoru 480 × 320 se zachováním přirozeného poměru stran. Rozměry `boardWidth`, `boardHeight` určují `pw = boardWidth / columns` a `ph = boardHeight / rows`. Deska je vystředěná; celý obrázek se zachová bez ořezu nebo deformace. Název a HTML předloha se řídí konfigurací.
- `templates` obsahuje přesně `columns × rows` tvarů s `typeId`, `row`, `col`, `edges`, `path`. Tvary se vytvoří při `reset()` a během losování/výměn zůstávají stejné.
- `pieces` obsahuje získané instance. `id` je unikátní identita kopie, `typeId` určuje její místo v obrázku. Kopie sdílejí tvar a mohou existovat vícekrát. Instance mají `x/y`, `targetX/targetY`, `scale`, `locked`.
- `placedTypes` je množina obsazených míst. Dokončení je `placedTypes.size === total`, nikoli `pieces.every(locked)` (prázdný začátek není výhra).
- `randomPiece()` losuje ze všech šablon bez vyřazování duplicit, přidá novou instanci a zobrazí její stránku zásobníku. Od prvního losování běží čas.
- `inventory()`, `visibleInventory()` a `pageCount()` spravují volné instance. Jedna stránka má kapacitu `total`; stránkování umožní přidávat více než devět dílků bez trvalého schování či překryvů.
- `recyclerIds` obsahuje nejvýše tři ID instancí. Vložené dílky jsou zmenšené ve třech přihrádkách; lze je vytáhnout nebo použít **Vrátit dílky**. `recycle()` odebere přesně tři tyto instance a zavolá `randomPiece()`. Uzamčené dílky zůstávají na desce.
- `isDuplicate()` zjišťuje již obsazený typ nebo další instanci stejného typu. Zásobník zobrazuje číslo typu a štítek DUP.
- `pointer()` převádí souřadnice prohlížeče do logických souřadnic canvasu. `hit()` dočasně nastaví identickou transformaci při `isPointInPath` a zohlední `scale`; oprava je důležitá pro DPR 2 a zmenšené dílky ve šrotovači.
- `pointerdown` ukládá místo uchopení a nastaví `moved: false`. `pointermove` aktivuje tažení a zvětší miniaturu na plnou velikost. `release()` přesouvá a přichycuje pouze po skutečném pohybu; samotný klik v zásobníku ani šrotovači stav nemění. Tlačítko `recycle` provádí výměnu ve spodní liště.
- `release()` při tažení přichytí dílek při vzdálenosti menší než `min(25, pw × .25, ph × .25)` pouze do dosud volného cíle. Další kopie stejného typu nezvýší počet a neuzamkne se. Jinak se podle polohy středu vloží do šrotovače, nebo vrátí do zásobníku. Čtvrtá instance do šrotovače nevstoupí.
- `reset()` (tlačítko **Nová hra**, HTML ID stále `shuffle`) vyprázdní inventář, šrotovač, desku i čas a regeneruje tvary. Čas stojí před prvním losováním a po složení všech míst.
- `layout()` má desktop 1240 × 720 a mobil do šířky 760 px 660 × 1280. `arrange()` umísťuje desku, viditelnou stránku zásobníku a zmenšené instance ve šrotovači. Při resize zachová stav, ale vrátí volné dílky do slotů.
- Předloha zvýší viditelnost obrázku na desce. Fullscreen ovládá tlačítko a klávesa F; stránka ve fullscreen zůstává posuvná.
- `window.render_game_to_text()` vrací JSON včetně všech instancí, `typeId`, viditelnosti, umístění, scale, stránek a `recyclerIds`. `window.advanceTime(ms)` umožňuje posun času při testování.

## Spuštění a ověření

Hru lze otevřít přes `index.html`. Pro testování používej HTTP: `npm start` → `http://127.0.0.1:5173`. Skript start vyžaduje Python 3 a spouští `serve.py`. HTML používá verzované URL `style.css`, `config.js` a `game.js` (`?v=006-reward`). Při dalších úpravách assetů aktualizuj jejich verzi. Aktuální UI je označeno „REWARD EDITION / 006“.

Testy: `npm install`, případně `npx playwright install chromium`, spustit server a v druhém terminálu `npm test`. Pokud server již běží, použij jej.

Dne 2026-10-05 prošel test nové předlohy 40 Mystic Gem: zdroj obrázku, zachování poměru stran 1406/860, vizuální kontrola složeného obrázku a dále kompletní regrese: přetahování jako jediný způsob přesunu jednotlivých dílků, klik bez přesunu v zásobníku i šrotovači, prázdný start, náhodné dílky a deterministicky vynucené duplicity, stejné tvary kopií, skutečné přetahování při DPR 2, chybná poloha, blokace duplicitního přichycení, obsazení 1/2/3 přihrádek šrotovače, odmítnutí čtvrté, vytažení a vrácení kopií, přesná výměna 3 → 1 včetně duplicitní odměny, zachování složeného dílku, stránkování, reset, složení všech devíti míst, zastavení času, předloha, fullscreen, mobilní rozložení, konfigurace 5 × 4 a výměna v této konfiguraci. Bez JavaScriptových chyb. Vizuálně ověřen nový tmavý vzhled na desktopu, plný šrotovač, mobil a screenshot povinného web-game klienta. Reference Apollo byla prohlédnuta v prohlížeči (automatické webové otevření selhalo). Test nepokrývá fyzický dotykový displej ani všechny velikosti mřížky 1 až 12. Náhodné výsledky v testu se řídí přepsáním `Math.random` pouze v testovacím prohlížeči.

Na uživatelovo hlášení, že refresh nezobrazuje klikací šrotovač, server vracel nový kód, ale stav jeho karty nebylo možné ověřit kvůli timeoutům ovládání prohlížeče. Přidáno verzování assetů a vlastní server bez mezipaměti; ověřeny HTTP 200 a no-store u HTML i JS a kompletní browser test. Přesnou původní příčinu v otevřené kartě nemáme potvrzenou. Přímá nová adresa: `http://127.0.0.1:5173/?v=006-reward`.

Pozor: export canvasu přes `toDataURL` může při `file://` selhat kvůli omezením prohlížeče; pro screenshotový test použij HTTP. Na mobilu před automatickým přetahováním posuň canvas do viditelné části stránky a po resize počkej na přepočtení layoutu.

Edice 006 ověřena: kompletní `npm test`, tlačítko skryté během hry a viditelné po složení, disabled všech ovládání, ochrana proti přímému dispatchi click, klik a tažení zbylých kopií v zásobníku i plném šrotovači, klávesa F, zastavený čas, dialog otevření/zavření a zachování zámku. Desktopové i mobilní screenshoty a povinný web-game klient vizuálně zkontrolovány. Bez JS chyb. Původní uživatelova karta s dokončenou hrou edice 005 zachována; nová edice otevřena v nové kartě.

## Git a aktuální stav

Repozitář: https://github.com/KristekQQ/Puzzle. Lokální remote `origin` používá `git@github.com:KristekQQ/Puzzle.git`, větev `main`.

Druhá iterace a projektové dokumenty patří do stejné verze repozitáře. Aktuální synchronizaci s GitHubem ověř přes `git status` a `git fetch origin`. První verze byla úspěšně pushnuta v commitu `46691c39b6ca062e18e970f5dbdabc07d45ceb17`. HTTPS push neměl dostupné přihlášení; SSH fungovalo. Před dalším pushem znovu ověř stav, remote a aktuální vzdálenou větev.

`.gitignore` vynechává `node_modules/`, `output/`, `progress.md` a `.DS_Store`. Tato projektová paměť a skill mají být verzované. Vytvoření paměti nemění pravidla autorizace externích akcí.

## Možné další iterace

Výběr obtížnosti v UI, vlastní obrázek, otáčení dílků. Jsou to náměty, ne schválené úkoly. U větších nebo výrazně obdélníkových mřížek zkontroluj velikost dílků a překrývání v zásobníku.

## Údržba paměti

Uživatel výslovně požádal o průběžnou paměť a skill pro tento projekt. Po podstatné změně uprav mapu kódu, rozhodnutí a výsledky ověření. Nahrazuj neplatné údaje, uváděj datum ověření a odlišuj hotové funkce od návrhů. Neukládej hesla, tokeny ani nesouvisející osobní nebo konverzační údaje.
