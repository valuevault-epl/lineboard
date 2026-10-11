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
* `index.html` is rebuilt by `..\NBLModel\site_builder.py` every time one of the models runs `predict.py` (NBL, NFL or CFB).
* The site builder commits and pushes the new `index.html`, and GitHub Pages serves it within a minute or two.
* The app fetches the new version the next time it opens with signal.

To stop the automatic push, set the environment variable `LINEBOARD_NO_PUSH=1` before running a model.

## Files
* `index.html`: the board, with that week's predictions inside it.
* `manifest.webmanifest` and `icons/`: name, colours and home-screen icon.
* `sw.js`: offline cache. It loads from the network first, so you always get fresh numbers when online.
