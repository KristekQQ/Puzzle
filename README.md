# Kousek — náhodné dílky a šrotovač

Otevři `index.html` v prohlížeči. Hra funguje lokálně, bez instalace a bez internetového připojení.

- Začínáš s prázdným zásobníkem. **Nový dílek** přidá jeden náhodný dílek; můžeš získat i duplicitu.
- Přetáhni dílek do obrázku. Poblíž správného volného místa se přichytí. Každé místo lze zaplnit jen jednou.
- Tři nepotřebné dílky **přetáhni do šrotovače** a klikni **Vyměnit 3 → 1** ve spodní liště. Zmizí všechny tři a dostaneš jeden nový náhodný dílek, klidně duplicitní.
- Před výměnou lze dílek vytáhnout zpět nebo kliknout **Vrátit dílky**. Složené dílky zůstávají na desce.
- Více dílků se zobrazí na dalších stránkách zásobníku. Duplicity mají štítek **DUP**.
- **Předloha** zvýrazní obrázek na desce.
- **Nová hra** vyprázdní zásobník, šrotovač i obrázek a vynuluje čas.
- **F** přepíná celou obrazovku.

Pro vývoj použij `npm start` (vyžaduje Python 3). Server načítá aktuální soubory a zakazuje mezipaměť. Aktuální verzi poznáš podle označení **MYSTIC EDITION / 005**.

## Konfigurace

Uprav `config.js` a znovu načti stránku:

```js
window.PUZZLE_CONFIG = {
  columns: 3,
  rows: 3,
  image: 'assets/40mysticgem_tile_large.jpg',
  title: '40 Mystic Gem'
};
```

`columns` a `rows` mohou být od 1 do 12. Počet dílků je jejich součin. Obrázek se automaticky vejde do prostoru desky 480 × 320 se zachováním původního poměru stran, bez deformace a ořezu. `title` nastavuje název předlohy.

Aktuální předloha je uživatelem dodaný `assets/40mysticgem_tile_large.jpg` (1406 × 860). Původní obrázek `assets/lake-cottage.png` byl vytvořen pomocí vestavěného imagegen: malovaná ilustrace chaty u alpského jezera, hory, stromy a květiny, teplé odpolední světlo, bez textu.

## Ověření

Prohlížečové ověření zahrnovalo prázdný start, opakované typy dílků, přetahování při DPR 2, přichycení, výměnu přesně 3 → 1 včetně duplicitní odměny, vrácení kopií, stránkování, dokončení hry, reset, předlohu, celou obrazovku, mobilní rozložení a konfiguraci 5×4. Bez JavaScriptových chyb. Snímky jsou v `output/`.

Pro spuštění automatického testu: `npm install`, `npx playwright install chromium`, spusť lokální server (`npm start`) a v druhém terminálu `npm test`. Závislosti jsou potřebné pouze pro testy.
