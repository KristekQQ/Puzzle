# Kousek — náhodné dílky a šrotovač

Otevři `index.html` v prohlížeči. Hra funguje lokálně, bez instalace a bez internetového připojení.

- Začínáš s prázdným zásobníkem. **Nový dílek** přidá jeden náhodný dílek; můžeš získat i duplicitu.
- Přetáhni dílek do obrázku. Poblíž správného volného místa se přichytí. Každé místo lze zaplnit jen jednou.
- Tři nepotřebné dílky přetáhni do **šrotovače** a klikni **Vyměnit 3 → 1**. Zmizí všechny tři a dostaneš jeden nový náhodný dílek, klidně duplicitní.
- Před výměnou lze dílky vytáhnout nebo kliknout **Vrátit dílky**. Složené dílky zůstávají na desce.
- Více dílků se zobrazí na dalších stránkách zásobníku. Duplicity mají štítek **DUP**.
- **Předloha** zvýrazní obrázek na desce.
- **Nová hra** vyprázdní zásobník, šrotovač i obrázek a vynuluje čas.
- **F** přepíná celou obrazovku.

## Konfigurace

Uprav `config.js` a znovu načti stránku:

```js
window.PUZZLE_CONFIG = {
  columns: 3,
  rows: 3,
  image: 'assets/lake-cottage.png'
};
```

`columns` a `rows` mohou být od 1 do 12. Počet dílků je jejich součin. Obrázek se vejde na desku v poměru 3:2; pro jiné zdroje použij stejný poměr, aby nebyly deformované.

Obrázek `assets/lake-cottage.png` byl vytvořen pomocí vestavěného imagegen: malovaná ilustrace chaty u alpského jezera, hory, stromy a květiny, teplé odpolední světlo, bez textu.

## Ověření

Prohlížečové ověření zahrnovalo prázdný start, opakované typy dílků, přetahování při DPR 2, přichycení, výměnu přesně 3 → 1 včetně duplicitní odměny, vrácení kopií, stránkování, dokončení hry, reset, předlohu, celou obrazovku, mobilní rozložení a konfiguraci 5×4. Bez JavaScriptových chyb. Snímky jsou v `output/`.

Pro spuštění automatického testu: `npm install`, `npx playwright install chromium`, spusť lokální server (`npm start`) a v druhém terminálu `npm test`. Závislosti jsou potřebné pouze pro testy.
