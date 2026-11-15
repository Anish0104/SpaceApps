# Scene photo credits

All backgrounds are public-domain NASA photographs from the NASA Image and Video Library
(https://images.nasa.gov). IDs, titles, centres and dates come from each image's API record. They set
the scene for a crew environment and are never evidence; none of them shows the scenario itself
(no FM2 habitat or pressurized lunar rover exists yet).

Files: `<scenario-id>-{960,1600,2400}.webp`, 16:9 crops of the `~orig.jpg` asset (WebP, quality 74).

| Scenario | NASA ID | Title (NASA) | Centre, date | Processing |
|---|---|---|---|---|
| `earth` | GRC-1998-C-00486 | Candle flame, normal 1-G and microgravity 0-G comparison | Glenn | 1 g panel only, feathered onto a black 16:9 canvas |
| `iss` | iss030e075182 | Earth observations taken by Expedition 30 crewmember (horizon, city lights, aurora) | JSC, 2012-02-04 | crop |
| `moon-challenge` | as17-134-20435 | Wide-angle view of Apollo 17 lunar landing site | JSC, 1972-12-10 | crop |
| `moon-fm2` | as15-85-11425 | Panoramic view north of Station 1, northwest of Hadley Rille | JSC, 1971-07-31 | crop |
| `rover` | as17-147-22527 | Astronaut Eugene Cernan drives the Lunar Roving Vehicle during first EVA | JSC, 1972-12-11 | crop |
| `mars` | PIA24937 | A Picture Postcard From Curiosity's Navcams | NASA/JPL-Caltech, 2021-11-23 | crop; colour was added by JPL |
| `suit` | as17-134-20476 | View of Astronaut Eugene Cernan beside lunar roving vehicle during EVA | JSC, 1972-12-13 | crop, film edges trimmed |

To regenerate, download `https://images-assets.nasa.gov/image/<id>/<id>~orig.jpg` and crop to 16:9.
