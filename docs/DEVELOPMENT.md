# Development

Manifest V3, plain JavaScript and CSS. Load `extension/` unpacked in Chrome; no build is required to run it.

```sh
npm install
npm run check
npm test
npm run package
```

Packaging creates `dist/spotify-unslopified.zip`. `npm run icons` regenerates the app mark; `npm run control-icons` bundles the selected Hugeicons. `npm run preview:library` starts an isolated imported-library preview with sample data and no access to your music files.

## Spotify integration

Content scripts run on `https://open.spotify.com/*`. The extension adds its Home and navigation around Spotify’s existing interface, preserving native library rows and playback. Prefer semantic attributes and stable test IDs over generated class names.

Home choices, settings and imported playlist summaries use `chrome.storage.local`. The service worker serializes settings updates. Turning Unslopified mode off restores the native interface. Missing layout anchors leave Spotify visible; startup concealment has a four-second fallback.

Tests use Node’s test runner and JSDOM. They cover navigation, storage races, extension reloads, playback handoff, queue controls, metadata edits, cover crops and Suno lyric retrieval. Browser playback, file permissions and iCloud delivery also need manual checks; automated tests cannot establish audible playback or future Spotify compatibility.

## Shared folder format

Direct subfolders are playlists. Audio files work without metadata. An optional sidecar such as `Song.mp3.json` can contain:

- `title`, `artist`, `durationMs`
- ISO dates: `createdAt`, `importedAt`
- `lyrics` (plain text or LRC), `sourceURL`
- `artworkFile` (a sibling filename), numeric `order`

To import metadata, select the audio and its matching sidecar together. A valid `https://suno.com/song/<id>` source link allows missing lyrics to be fetched from an existing signed-in Suno tab. Tokens are used only inside that page for requests to Suno; existing lyrics are preserved.

Cover editing preserves the original photo and an oriented preview. `cover.json` stores viewport-relative `zoom`, `x` and `y`, plus immutable `cover-original-*`, `cover-source-*` and `cover-rendered-*` filenames. Write assets before the recipe; its render is authoritative. `cover.jpg` remains a compatibility copy. iOS uses the same format.

Archiving adds `Unslopified.archive.json` to the playlist folder and retains its files. Removing that marker restores the playlist. Folder handles are saved in IndexedDB, but Chrome's session-only permission can lapse after closing tabs or leaving them in the background. On restoration, choose **Allow on every visit** when Chrome offers it for persistent access. Connect and Reconnect request read/write access; explicit Refresh and playback actions can restore read access before continuing. Startup, focus, periodic scans and autosaves never open permission prompts; iCloud handles transfer timing.


## Playlist controls

Hold a Home playlist briefly and drag it to a new position. Spotify and imported playlists can be mixed; imported sidebar ordering uses the same saved local order. Alt+Up/Down also moves a focused playlist. Order changes go through the settings writer and do not rename folders or alter Spotify playlists.

Imported playlists have an All songs dropdown: latest 5/10/custom count, past week/30/90 days, or custom dates. Every selection, including All songs, sorts newest first using creation timestamps with import timestamps as a fallback. Equal dates retain source order; missing dates go last. Date ranges use local calendar days, include the entire final day, and exclude unknown creation dates. Playback uses the filtered list. Selections persist per library and playlist across navigation and browser restarts; relative day ranges remain relative to today. Scrollbars are transparent throughout the extension; the Spotify profile button is hidden while Unslopified is enabled.

Song date editing uses the same local calendar day as filtering; unrelated edits preserve the exact source timestamp. The obsolete Track order input is removed, while existing numeric order metadata remains intact for compatibility.
