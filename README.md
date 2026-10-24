# Line Board

The NBL, NFL and college football Line Board as an installable phone app:
https://valuevault-epl.github.io/lineboard/

It shows win chances, fair and minimum ("take at") prices, alternate lines and totals for each game. No betting odds are used to make the predictions.

## Install it on your phone
* **iPhone:** open the link in Safari, tap Share, then **Add to Home Screen**.
* **Android:** open the link in Chrome, tap the menu, then **Install app** (or **Add to Home screen**).

The app opens full screen. It works without signal, showing the last predictions it loaded.

## How it updates
You don't edit this folder by hand.
* Each model run (`predict.py` for NBL, NFL or CFB) makes `..\NBLModel\site_builder.py` rewrite `index.html` and `data.json`, then commit and push them. The push takes about 2 seconds.
* The app reads `data.json` straight from the GitHub API, which has a new push within about a second. GitHub Pages itself can take minutes.
* It checks every time you open the app or switch back to it, and every minute while it's on screen. When there are new predictions it reloads itself. A check with nothing new costs nothing against GitHub's limit of 60 requests an hour.
* It opens instantly from its saved copy, so it also works with no signal, showing the last predictions it loaded.

To stop the automatic push, set the environment variable `LINEBOARD_NO_PUSH=1` before running a model.

## Odds check (value.html)
https://valuevault-epl.github.io/lineboard/value.html

One button pulls current prices from TAB, Sportsbet, Betfair (after commission), PointsBet, Ladbrokes and Neds through The Odds API, and checks every head to head, line and total against the board's numbers, using the same maths and the same minimum edge and Kelly settings. It only calls the API when you tap (about 1 credit per league per market; the free plan has 500 a month). The API key is typed into the page and saved on the phone only. By default it also copies the best prices into the board's price boxes, so the board's own value chips and stakes light up.

`site_builder.py` doesn't touch this file, so model runs won't overwrite it.

## Files
* `index.html`: the board, with that week's predictions inside it (used when opening offline).
* `data.json`: the same predictions with a timestamp, which the app checks for updates.
* `manifest.webmanifest` and `icons/`: name, colours and home-screen icon.
* `sw.js`: offline cache. It opens the saved copy at once and refreshes it in the background. Each page (the board, the odds check) keeps its own saved copy.
* `value.html`: the odds check (see above).
