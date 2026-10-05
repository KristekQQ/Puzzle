---
name: puzzle-maintenance
description: Upravuj a ověřuj lokální HTML a JavaScript puzzle hru Kousek v tomto repozitáři a udržuj její projektovou paměť.
---

# Údržba hry Kousek

Tento skill platí pro repozitář Puzzle. Před změnou si přečti [MEMORY.md](MEMORY.md), ověř aktuální `git status` a prohlédni příslušné zdrojové soubory. Paměť je mapa projektu, zdrojem aktuálního chování je kód.

## Zásady implementace

- Zachovej lokální spuštění v obyčejném prohlížeči. Výchozí mřížka je 3 × 3, rozměry, cesta k obrázku a název předlohy patří do `config.js`. Při změně obrázku zachovej celý obraz a jeho přirozený poměr stran; deska se vejde do prostoru 480 × 320.
- Puzzle musí mít skutečné navazující výstupky a prohlubně. Zachovej opačná znaménka sousedních hran, rovné vnější hrany a souvislý obraz uvnitř celého `Path2D` včetně výstupků.
- Rozlišuj `typeId` (místo a tvar) od `id` (jedna získaná kopie). Losování i odměna smějí zopakovat libovolný typ včetně typu na desce. Tvary v `templates` zůstávají během hry stabilní. Odděluj CSS souřadnice, logické souřadnice canvasu a DPR transformaci. Zachovej opravu `hit()` pro DPR 2.
- Uživatel odmítl výběr dílků do šrotovače kliknutím. Zachovej ovládání jednotlivých dílků pouze přetahováním. Samotný klik v zásobníku či šrotovači nic nepřesouvá. Výměnu provádí tlačítko ve spodní liště.
- Zachovej současný vzhled KOUSEK PLAY: tmavé fialové pozadí, výrazná růžová tlačítka, světlé panely, úzké velké nadpisy a zlaté akcenty. Canvas i HTML musí mít konzistentní paletu; nezaváděj online fonty nebo cizí značku.
- Při úpravách drag/dropu zachovej offset uchopení, pointer capture, obsluhu cancel a nemožnost přesunout přichycený dílek. Zkontroluj přichycení při správné i nesprávné poloze.
- Rozměry dílků, zásobník, popisky a tolerance přichycení se musí odvozovat od konfigurace. Nepředpokládej vždy devět dílků v herní logice.
- Respektuj české rozhraní a klávesnicový `:focus-visible`. Obrázky používané hrou ukládej do projektu, ne pouze do osobního adresáře generátoru.

## Ověření změn

Pro změny herního chování nebo vzhledu použij existující HTTP server na portu 5173, případně `npm start` (`serve.py`, bez mezipaměti). Při změně JS/CSS aktualizuj verzi jejich URL v `index.html`. Při podezření na starou stránku ověř nejprve serverem posílané soubory a skutečné viditelné UI; úspěch v čistém testovacím prohlížeči sám nepotvrzuje obsah uživatelovy karty. Spusť `node --check game.js` a relevantní prohlížečový test `npm test`. Testovací závislosti jsou v `package.json`; prohlížeč se případně instaluje přes `npx playwright install chromium`.

Testuj skutečné pointer vstupy a ověř mezistav i výsledek přes `render_game_to_text()`. Pro základní regresi zkontroluj chybnou polohu, přichycení, dokončení celé hry, předlohu a novou hru. Ověř prázdný start, duplicitní losování, blokaci duplicitního přichycení, přesnou výměnu tří instancí za jednu a odmítnutí čtvrté přihrádky. Zahrň klik bez přesunu v zásobníku i šrotovači, přetahování miniatur zpět, vrácení dílků a stránkování zásobníku. U geometrie a layoutu zahrň DPR 2, mobil a jinou mřížku; u fullscreen jeho přepnutí.

Po vizuální změně otevři aktuální snímky v `output/`, posuď čitelnost, celé tvary dílků, překryvy a pokračování obrázku. Samotný screenshot bez interakce nedokazuje funkční hru. Při `file://` může screenshotový export canvasu selhat; použij HTTP. Neměň hru kvůli tomuto omezení exportu.

Dokončení odvozuj od počtu obsazených typů, nikoli od všech získaných kopií. Volné duplicity a prázdný inventář nesmějí narušit vyhodnocení výhry. Losování neomezuj na chybějící typy. Po dokončení zamkni všechny herní akce i jejich event handlery včetně F, nové hry a pointer vstupů. Aktivní zůstává „Vyber odměnu“; před dokončením je skryté. Ověř zámek se zbylými kopiemi a plným šrotovačem, otevření/zavření dialogu a mobilní rozložení. Konkrétní odměny zatím nejsou specifikované.

Současný test předpokládá výchozí 3 × 3 a následně přepisuje config na 5 × 4. Pokud uživatel změní výchozí nastavení, přizpůsob test novému zadání. Neoznačuj fyzické dotykové ovládání za ověřené na základě testu myší v mobilním viewportu.

## Předání a paměť

Po významné změně aktualizuj `MEMORY.md`: co se změnilo, kde je kód, ověřené chování a zbývající omezení. Tento soubor slouží k pokračování práce, ne jako přepis celé konverzace. `README.md` aktualizuj při změně spuštění nebo konfigurace; tento skill při změně pracovního postupu.

Při požadovaném pushi zkontroluj remote a rozdíl proti vzdálené větvi. SSH zde fungovalo; HTTPS v prvním běhu nemělo přihlášení. Nepushuj `output/` ani `node_modules/`, nepoužívej force push k obejití neznámých změn. Paměť sama o sobě není pokyn k automatickému publikování budoucích změn.
