# The Wedding of Faris & Eliza

A playable pixel-art wedding garden. Publish `dist/` as static public output.

- Opening flow: The Wedding of Faris & Eliza → Continue → Men or Woman → explore. Both previews and starting characters face south.
- The game fills the viewport immediately, with no surrounding header, footer, or sidebar. Wedding information and help open as in-game dialogs.
- An analog thumbstick supports any movement angle, variable speed, a center deadzone, pointer capture, and safe release/cancel/focus reset.
- Close camera follows the character in portrait, landscape, and desktop layouts.
- Eight-direction character animation with keyboard and analog touch controls, tap-to-walk routing, path collisions, six interactive landmarks, and a journal alternative.
- User-supplied sprites retain their filename directions. The atlas has one row per direction (east, southeast, south, southwest, west, northwest, north, northeast), idle in column 0 and nine walking frames for Men, seven for Woman. Frames are 68 px square with original GIF timing of 200 ms. Idle PNGs are centered with 10 px padding; no artwork is repainted or resized in the atlas.
- Wedding details are configured in `dist/config.js`; date and real venue information are still placeholders.
- The supplied “Lagu Pernikahan Kita” recording loops and is enabled by default and starts on Continue to respect browser autoplay rules. Guests can mute or unmute from any screen; playback resumes from the paused position. The supplied audio is an AAC/MP4 recording despite its original .mp3 filename, so it is served unchanged as .m4a. Discovery progress lasts for the current visit. No guest information is collected.

`python scripts/export-standalone.py /absolute/output.html` makes a complete offline HTML file.
`python scripts/prepare-character.py /path/to/original/sprites` packs the sixteen supplied images losslessly.
`npm run dev` serves a local portrait and landscape preview harness. This harness is not included in deployed output.

Validated all 36 landmark routes, direction mapping, analog input, proportional speed, pointer cancellation, walking frame timing, idle transitions, and mobile camera bounds. Browser checks at 390×844 portrait and 844×390 landscape confirmed edge-to-edge canvases, supplied character, close camera, thumbstick drag/release, wedding title, and in-game menus.

All guest-facing text is Indonesian, except the wedding title. Walking speed is 20% slower for keyboard, analog, and tap-to-walk movement, with matching 250 ms animation frame timing.

Nearby stations have a gold proximity halo and a world-anchored, viewport-clamped Lihat info action. The closest station is prioritized with a small hysteresis; approaching via a marker stops at the station for the guest to choose when to open the information.

Replaced the truncated 3,130,880-byte audio with the complete 4,530,252-byte source. Verified decoding through the full 279.87-second track. Native loop stays enabled with an ended-event restart fallback. The new audio URL avoids cached partial copies.

Interactive pianist sits southeast of the central fountain. Clicking nearby or pressing E toggles the same music as the toolbar. The original supplied GIF plays in a projected DOM image when audio emits playing; the supplied PNG appears on pause, buffering, or error. Wedding journal remains six stations.

Music duo: both musicians stand by the upper-left winding path near the benches at (555,365), matching the supplied location reference. Both are 20% smaller than the previous version: piano width 67.6 world pixels; singer height 59.488 pixels. The supplied six-frame looping singer.gif plays with the music; singer-idle.png is used when paused. Both share one interaction.

Wedding couple: original 8-frame looping mempelai.gif centered at (768,145) on the upper ceremony platform. Visible height matches the main character (46 atlas pixels × 1.2 = 55.2 world pixels).

Player and KAMU label render on a transparent foreground canvas above every NPC, with the same camera and device-pixel scale. The layer ignores pointer events to preserve world and NPC interactions.

Simplified exploration: spacious edited garden artwork, 140-world-pixel walkable corridors with union-based junction collision, wider camera view, directly tappable station information, and a persistent labeled Info pernikahan shortcut. Existing music, characters and six information stations are retained.

Opening menu features the supplied wedding card unchanged, a floating card animation, playful title and raised gold Mulai Permainan button. Responsive portrait/landscape layouts and reduced-motion support preserve the existing character-selection flow.

Controls use glossy lime-green gradients, rounded edges and bold white labels, including canvas-rendered venue buttons. Venue numbering is replaced by names on the map and symbols in the information menu.

Button palette refined to warm cream and light tan with dark cocoa labels, subtle depth, and bundled Nunito ExtraBold for consistent rounded typography (including map venue labels).

Galeri Foto replaces Busana tamu at the same map station. Three local demo photographs from Unsplash (Jennifer Kalenberg / To1y6aSGiw0, Dallas Rogers / thkwDqb94hE, Meg Jenson / jlUBvJbFo0g) are labeled as examples and credited with source links. Tap a photo to enlarge; the standalone export embeds all three. Sources state free use under the Unsplash License.
