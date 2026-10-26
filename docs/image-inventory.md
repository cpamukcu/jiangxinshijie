# Real photo inventory (SINNVO kit)

Source: `~/Desktop/SINNVO/sinnvo-ad-kit/photos/` (26 JPGs, from the HEIC originals in `~/Desktop/SINNVO/`). All are phone shots, 1350×2400 portrait unless noted. Every photo was viewed; notes describe what is in the frame.

Legend: **Use** = good enough to grade and use now · **Retouch** = needs AI retouch first (see `PHOTO-PROMPTS.md`) · **Skip** = not proposed.

| # | File | What it shows | Problems | Verdict / best slot |
|---|---|---|---|---|
| 01 | hero-glass-elevator | Freestanding glass-shaft lift with red door frame in a bright showroom | Showroom floor visible, slight keystone | **Use** · About / brand story portrait (4:5) |
| 02 | cabin-starlight-blue | Starry-ceiling cabin, crystal column, blue LED floor | Strong blue cast (it's the design) | **Use** · Collections "real cabins" strip (4:5) |
| 03 | cabin-blue-marble | Dark blue-marble back wall between white lit pillars | Very dark, low detail | Retouch |
| 04 | cabin-white-marble-glow | Grey-veined marble panel with light strips, black frame | Slightly dark | **Use** · Collections strip (4:5) |
| 05 | cabin-horse-art | Cabin with painted horse artwork wall | Dark, low contrast | Retouch, then "Every cabin tells a story" |
| 06 | cabin-warm-wood | Champagne/cream cabin, lit floor trim, open doors | Shot at an angle, slight tilt | **Use** · Collections strip / Home Elevators (4:5) |
| 07 | cabin-bronze-gold | Bronze/wood cabin through open doors | Dark, angled | Retouch |
| 08–10 | showroom-violet-wall-a/b/c | Three finished cabins set into a violet showroom wall, landing call panels | Violet wall matches the brand colour; cabins small in frame | **Use one (09)** · Home "craftsmanship" or Contact (4:5) |
| 11–12 | glass-shaft-tall-a/b | Tall black-frame glass shaft in a lobby with entrance doors | Parked car and wall notices visible; check notices for Chinese text | Retouch (restage as villa hall) → Projects |
| 13 | control-panels-glow | Display wall of landing/car control panels, one violet-lit | **Old JX / 匠鑫饰界 logo and Chinese text on the lit screen** | Retouch (remove logo, then Technology 1:1) |
| 14–16 | factory-cabin-lit/glass/warm | Finished cabins on the factory floor (blue scaffolding, racks) | Messy factory background | Retouch → Factory & Quality |
| 17 | craft-wood-curve | Curved wood panel on a dark factory floor | Very dark, cluttered | Retouch |
| 18 | pattern-panels-a | Close angle of framed decorative panels (marble, floral, herringbone) | Dark wall, angled | Retouch (optional) |
| 19 | pattern-panels-b | Same six panels, straight-on, brighter | Clean | **Use** · Factory & Quality / Collections detail (1:1 crop) |
| 20 | door-frame-light | Lit marble car in a frame, factory behind | Factory background | Retouch |
| 21 | white-corridor-door | Bronze landing door in a white corridor wall | **Wall placard reads "JXD702 … 匠鑫饰界"** | Retouch (remove placard, then Installation 4:5) |
| 22 | materials-wall | Handrails and trim profiles on a lit pegboard | **Old JX logo on the top strip; 材料 Material sign** | Retouch (then Components & OEM 1:1) |
| 23 | showroom-hall (2400×1350) | Long showroom with phones/samples on a counter and lit panel wall | **Chinese text on the wall sign** | Skip, or crop/retouch out text |
| 24 | showroom-lounge (2400×1350) | Dark showroom lounge with sofas | Dark, not product | Skip |
| 25 | cabin-dark-glass | Bamboo-painting cabin through a dark frame | Dark | Retouch |
| 26 | corridor-wide (2400×1350) | Bright white corridor of landing doors, glass lift at the end | Small wall placards, same type as 21 (old brand) | Retouch (remove placards, then About 3:2) |

## Placed (Checkpoint C)

Masters are made by `scripts/prep-real-photos.mjs` (crop + gentle grade), then `gen-responsive-images.mjs` and `html-to-picture.mjs`.

| Photo | Page | Slot |
|---|---|---|
| 02, 04, 06 | Collections | "Photographed as Built" strip (4:5) |
| 09 | Home | "Made to Order" split after the brand story (4:5) |
| 19 | Factory & Quality | "Every Cabin Tells a Story" split (1:1, cropped left to drop a Chinese sign) |
| 01 | About | "One Team, Four Disciplines" split (4:5) |

Not straightened in code: verticals are close to true in all six; a manual perspective fix can be done in the retouch pass.

## Pixel check
- Old-brand logo or Chinese text found in 13, 21, 22 (logo or placard) and 23 (wall sign); 26 has placards of the same kind. None of these are on the site.
- The six placed photos were zoom-checked: no old logo, no Chinese text.

## Needs AI retouch (entries in PHOTO-PROMPTS.md where they exist)
03, 05, 07, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 25, 26. Drop results into `~/Desktop/SINNVO/edited/` with the kit filename; `prep-real-photos.mjs` picks them up first.

## Yuanbao restage (2026-10-26)

All 14 photos above were restaged in Yuanbao (Hy Image 3.5) from the full-resolution iPhone originals: the real elevator kept as built, the setting replaced with a villa, a clean workshop or a light design studio. Results are in `~/Desktop/SINNVO/edited/` (1248×2240 PNG; 26 is 2240×1248). Each carries Yuanbao's "元宝 AI生成" mark in the bottom-right corner; the slot crops in `scripts/prep-real-photos.mjs` fall inside it.

| Photo | Web file | Where |
|---|---|---|
| 01 | real-glass-shaft-showroom | About, "One Team, Four Disciplines" |
| 02, 04, 06 | real-cabin-starlight / -white-marble / -champagne | Collections, "Photographed as Built" |
| 09 | real-showroom-cabin | Home, "Made to Order" (tight crop keeps an invented wall sign out) |
| 11 | real-villa-glass-shaft | Projects, new "Built Into the Architecture" |
| 13 | real-control-panels | Home details, Technology (replaces AI control-panel) |
| 14 | real-workshop-cabin | Factory header, Home craftsmanship, Solutions derricks (replaces AI craftsmanship-detail) |
| 17 | real-wood-panel | Home details, About/Technology/Factory sections (replaces AI manufacturing-detail) |
| 19 | real-decorative-panels | Factory, "Every Cabin Tells a Story" |
| 20 | real-villa-landing | Home safety, Technology header (replaces AI safety-lifestyle) |
| 21 | real-landing-door | Installation, new "What Stays Visible"; Collections "Mix, Match" |
| 22 | real-trim-profiles | Collections header, Home details, Factory materials (replaces AI materials-flatlay) |
| 26 | real-showroom-corridor | About header |

AI images no longer used anywhere (delete only after approval): control-panel, materials-flatlay, manufacturing-detail, craftsmanship-detail, safety-lifestyle, cabin-yinshe (plus their -NNNw.webp tiers).
