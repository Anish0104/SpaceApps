/**
 * Scene photos for each crew environment. Every image is a public-domain NASA photograph from the NASA
 * Image and Video Library (images.nasa.gov); id, title, centre and date were taken from its API record.
 * Files in /public/scenes are 16:9 crops at 960/1600/2400 px (WebP). The Earth image keeps only the 1 g
 * panel of GRC-1998-C-00486, set on a black canvas. Photos set the scene; they are never evidence, and a
 * photo of an Apollo site is not a photo of the scenario (e.g. no FM2 habitat exists yet).
 */
import type { Scenario } from "@flameatlas/engine";

export interface Photo {
  nasaId: string;
  title: string;
  center: string;
  date: string;
  /** Short line shown on the page next to the image. */
  caption: string;
  /** Extra note when NASA processed the image (e.g. added colour). */
  note?: string;
}

export interface Scene {
  /** Scenario id; also the image file stem in /public/scenes. */
  id: string;
  label: string;
  pickerLabel?: string;
  photo: Photo;
  /** CSS colour for UI accents; follows the theme. */
  accent: string;
  /** Fixed accent used over the (always dark) photo in the hero. */
  heroAccent: string;
  /** object-position, so narrow screens keep the subject. */
  focus: string;
  /** Shown while the image loads. */
  fallback: string;
}

export const SCENES: Record<string, Scene> = {
  earth: {
    id: "earth",
    label: "Earth",
    accent: "var(--env-earth)",
    heroAccent: "#e3b26b",
    focus: "72% 50%",
    fallback: "#060506",
    photo: {
      nasaId: "GRC-1998-C-00486",
      title: "Candle flame in normal gravity (1 g) and microgravity comparison",
      center: "NASA Glenn",
      date: "1998",
      caption: "A candle flame in 1 g, NASA Glenn",
      note: "1 g panel only, extended onto a black background",
    },
  },
  iss: {
    id: "iss",
    label: "ISS",
    pickerLabel: "ISS cabin",
    accent: "var(--env-orbit)",
    heroAccent: "#7fb0ff",
    focus: "62% 55%",
    fallback: "#05070c",
    photo: {
      nasaId: "iss030e075182",
      title: "Earth's horizon, city lights and aurora behind ISS solar arrays",
      center: "NASA JSC",
      date: "2012-02-04",
      caption: "Earth's limb and aurora from the ISS, Expedition 30",
    },
  },
  "moon-challenge": {
    id: "moon-challenge",
    label: "Moon base",
    accent: "var(--env-moon)",
    heroAccent: "#c3cce4",
    focus: "55% 45%",
    fallback: "#07080b",
    photo: {
      nasaId: "as17-134-20435",
      title: "Wide-angle view of the Apollo 17 Taurus-Littrow landing site",
      center: "NASA JSC",
      date: "1972-12-10",
      caption: "Apollo 17 landing site, Taurus-Littrow",
    },
  },
  "moon-fm2": {
    id: "moon-fm2",
    label: "Moon habitat",
    pickerLabel: "Moon habitat (FM2)",
    accent: "var(--env-moon)",
    heroAccent: "#c3cce4",
    focus: "55% 50%",
    fallback: "#0b0b0c",
    photo: {
      nasaId: "as15-85-11425",
      title: "Hadley Rille, photographed during the first Apollo 15 EVA",
      center: "NASA JSC",
      date: "1971-07-31",
      caption: "Hadley Rille, Apollo 15",
    },
  },
  rover: {
    id: "rover",
    label: "Rover",
    pickerLabel: "Pressurized rover",
    accent: "var(--env-moon)",
    heroAccent: "#c3cce4",
    focus: "68% 60%",
    fallback: "#060607",
    photo: {
      nasaId: "as17-147-22527",
      title: "Eugene Cernan drives the Lunar Roving Vehicle during the first Apollo 17 EVA",
      center: "NASA JSC",
      date: "1972-12-11",
      caption: "Apollo 17 Lunar Roving Vehicle checkout",
    },
  },
  mars: {
    id: "mars",
    label: "Mars",
    pickerLabel: "Mars habitat",
    accent: "var(--env-mars)",
    heroAccent: "#f0936a",
    focus: "60% 50%",
    fallback: "#14130f",
    photo: {
      nasaId: "PIA24937",
      title: "A picture postcard from Curiosity's Navcams, Mount Sharp",
      center: "NASA/JPL-Caltech",
      date: "2021-11-23",
      caption: "Mount Sharp from Curiosity's Navcams",
      note: "Colour added by NASA/JPL to black-and-white Navcam panoramas",
    },
  },
  suit: {
    id: "suit",
    label: "Spacesuit",
    accent: "var(--env-moon)",
    heroAccent: "#c3cce4",
    focus: "55% 45%",
    fallback: "#0c0b0a",
    photo: {
      nasaId: "as17-134-20476",
      title: "Eugene Cernan beside the Lunar Roving Vehicle during the third Apollo 17 EVA",
      center: "NASA JSC",
      date: "1972-12-13",
      caption: "Apollo 17 EVA, Taurus-Littrow",
    },
  },
};

const BY_ENVIRONMENT: Record<Scenario["environment"], string> = {
  earth: "earth",
  spacecraft: "iss",
  station: "iss",
  moon: "moon-challenge",
  mars: "mars",
  rover: "rover",
  suit: "suit",
};

export function sceneFor(sc: Pick<Scenario, "id" | "environment">): Scene {
  return SCENES[sc.id] ?? SCENES[BY_ENVIRONMENT[sc.environment]] ?? SCENES["moon-challenge"]!;
}

export const WIDTHS = [960, 1600, 2400] as const;
export const srcSet = (scene: Scene) => WIDTHS.map((w) => `/scenes/${scene.id}-${w}.webp ${w}w`).join(", ");
export const src = (scene: Scene) => `/scenes/${scene.id}-1600.webp`;
export const photoUrl = (p: Photo) => `https://images.nasa.gov/details/${p.nasaId}`;

const warmed = new Set<string>();
/** Start loading a scene's image before it is shown (hover/focus on a picker option). */
export function prefetchScene(scene: Scene): void {
  if (warmed.has(scene.id) || typeof Image === "undefined") return;
  warmed.add(scene.id);
  const img = new Image();
  img.sizes = "100vw";
  img.srcset = srcSet(scene);
}
