# Kousek — první iterace

Otevři `index.html` v prohlížeči. Hra funguje lokálně, bez instalace a bez internetového připojení.

- Přetáhni dílek do obrázku. Poblíž správného místa se přichytí.
- **Předloha** zvýrazní obrázek na desce.
- **Zamíchat** začne novou hru a vynuluje čas.
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

Prohlížečové ověření zahrnovalo přetahování při DPR 2, nesprávné položení, přichycení všech 9 dílků a dokončení hry, předlohu, zamíchání, celou obrazovku, mobilní rozložení a konfiguraci 5×4. Bez JavaScriptových chyb. Snímky jsou v `output/`.

Pro spuštění automatického testu: `npm install`, `npx playwright install chromium`, spusť lokální server (`npm start`) a v druhém terminálu `npm test`. Závislosti jsou potřebné pouze pro testy.
