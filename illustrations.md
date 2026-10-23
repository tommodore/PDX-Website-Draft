# Illustrations manifest

All images in `src/assets/illustrations/` are original 3D renders (three.js scenes rendered in headless Chrome, `npm run illustrations:render`, scripts: `scripts/render-illustrations.mjs` and `scripts/illustrations/scenes.js`; render a single image with `npm run illustrations:render -- horizon`). 1920x1080 WebP. They carry the visible "Illustrative" badge and are meant to be replaced by real renders or photos. Replace by dropping a file with the same name into the folder.

| Image | Prompt / intent | Slot |
|---|---|---|
| horizon | Real-time 3D sea at blue hour: low sun glow, glossy swell reflections, haze, vignette | Default hero fallback |
| cockpit | Dark glossy dashboard with a floating curved HMI display (arcs, bars, lime accent) against a dusk windscreen | HMI, Automotive |
| render | Faceted glossy blue crystal with rim light and small satellite shards on a mirror floor, one lime shard | Real-time 3D graphics |
| twin | Glossy solid torus knot beside its wireframe twin with lime vertex points, linked on a mirror floor | Digital twins |
| sensing | Abstract seat silhouette backlit by dusk windscreen, concentric scan rings (one lime) | AI in-cabin sensing |
| engine | Isometric stack of glossy blue blocks on a slab, one lime block, mirror floor | Ramses3D |
| wireframe | Glossy blue car-like body that dissolves into a wireframe mesh at a lime scan plane | CAD-to-real-time pipeline |
| industrial | Glossy robot arm with glowing blue and lime joint rings in front of dark machine blocks | Industrial |
| terminal | Payment-terminal slab with glowing screen (lime check ring) and keypad on a mirror floor | Fintech |
| aviation | Airliner silhouette climbing against a navy-to-amber dusk sky with soft cloud banks | Aviation and marine |
| marine | Container ship (glossy hull, blue and lime containers) on reflective water at dusk | Aviation and marine |
| skyline | City skyline at blue hour with lit windows, fog layers and water reflections | Public sector, infrastructure |
| bokeh | Soft blue, lime and warm light orbs with bright rims on navy, calm left side | Contact, generic |
| waves | Layered glossy blue wave ribbons with a thin lime line, calm left, energetic right | Insights, generic |

## Defense (AI-generated, badge "Illustrative")

| Key | Description | Slot |
|---|---|---|
| defense-03, defense-05 (and unused 01, 02, 04, 06 to 11 in src/assets) | Operators with rugged displays, armored vehicles with wireframe overlay, terrain maps | Defense hero and Vehicle digital twins row, stills |
| public/media/defense-05, 07, 10, 12 (.mp4, .webp poster) | 6 s clips, audio removed, muted loop | Defense feature rows (07 operator interfaces, 10 terrain, 12 training) |

## Official and web assets

| Key | Description | Slot | Badge |
|---|---|---|---|
| official-vr | VR photo with yellow car | XR, Demos | no (real) |
| official-cad-car | CAD wireframe car render | CAD-to-real-time | no (real) |
| official-group | Team group photo | Life at PARADOX CAT | no (real) |
| official-careerteam | Three team members | Careers | no (real) |
| official-bmw-theater | BMW 7 Series Theater Screen, rear cabin photo (source: web image search, 474x266 px, upscaled; (c) BMW AG). Rights and BMW approval to be cleared, replace with a press-kit image of at least 1920 px | Case: BMW Theater Screen, Home | no (real) |
| web-aaos | AI-style cockpit with Android | AAOS | yes (AI-generated) |

Only keys starting with `official-` are shown without the badge.

## Official office and event photos (real, no badge)

| Key | Description | Slot |
|---|---|---|
| official-munich | Munich office building | Locations |
| official-office2 | Meeting space | Careers locations |
| official-bucharest | Bucharest office villa | Locations |
| official-bonfire, official-bouldering, official-oktoberfest | Team events | Life at PARADOX CAT |

## Service and industry set (AI-generated, badge "Illustrative")

| Asset | Page(s) |
|---|---|
| gen-shaders | Custom shaders (hero, row) |
| gen-graphics | Real-time 3D graphics (hero, row, Home hero) |
| gen-ui | UI frameworks (hero, row) |
| gen-aaos | Android Automotive (hero, row) |
| gen-hmi | HMI (hero, row) |
| gen-aviation | Aviation & Marine (hero, row) |
| gen-fintech | Fintech (hero, row) |
| gen-industrial | Industrial (row only, video) |
| gen-twin | Digital twins (hero, row) |
| gen-public | Public sector (hero only) |

Stills in src/assets/illustrations/, 6 s muted clips and posters in public/media/.
| gen-cad-wide (16:9 video) | CAD-to-Realtime (Optimization row) |
