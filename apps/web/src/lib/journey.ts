/**
 * The landing page's "view from a moving spacecraft": real NASA photographs, shown in flight order.
 * Every frame is public domain from the NASA Image and Video Library; id, title, centre and date come from
 * its API record (see public/journey/CREDITS.md). Files are 16:9 WebP crops at 960/1600/2400 px.
 * These are scene-setting views, never evidence.
 */
export interface JourneyFrame {
  key: string;
  /** Leg of the journey, shown on the window HUD. */
  stage: string;
  /** Path stem: `${src}-${width}.webp` */
  src: string;
  caption: string;
  nasaId: string;
  title: string;
  credit: string;
  date: string;
  /** Glow and headline accent while this frame is showing (always over a dark photo). */
  accent: string;
  /** Slow drift direction while the frame is on screen, as % of the frame. */
  drift: [number, number];
  focus: string;
}

export const JOURNEY: JourneyFrame[] = [
  {
    key: "leo",
    stage: "Low Earth orbit",
    src: "/scenes/iss",
    caption: "Earth's limb and aurora from the ISS, Expedition 30",
    nasaId: "iss030e075182",
    title: "Earth's horizon, city lights and aurora behind ISS solar arrays",
    credit: "NASA JSC",
    date: "2012-02-04",
    accent: "#7fb0ff",
    drift: [-2, -1],
    focus: "60% 55%",
  },
  {
    key: "depart",
    stage: "Leaving Earth",
    src: "/journey/depart",
    caption: "From a camera in Orion's window, flight test",
    nasaId: "jsc2022e044289",
    title: "Orion looks back at Earth",
    credit: "NASA JSC",
    date: "2014-12-05",
    accent: "#8ec5ff",
    drift: [2, 1],
    focus: "70% 60%",
  },
  {
    key: "outbound",
    stage: "Outbound",
    src: "/journey/outbound",
    caption: "Artemis I: Orion looks back at Earth, flight day 9",
    nasaId: "art001e000475",
    title: "Flight Day 9: Orion looks back at Earth",
    credit: "NASA JSC",
    date: "2022-11-24",
    accent: "#a9c8ff",
    drift: [-1.5, 1],
    focus: "60% 60%",
  },
  {
    key: "approach",
    stage: "Lunar approach",
    src: "/journey/approach",
    caption: "Artemis I: Orion approaches the Moon",
    nasaId: "art001e000269",
    title: "Orion approaches Moon for outbound powered flyby",
    credit: "NASA JSC",
    date: "2022-11-21",
    accent: "#c3cce4",
    drift: [1.5, -1],
    focus: "55% 70%",
  },
  {
    key: "flyby",
    stage: "Lunar flyby",
    src: "/journey/flyby",
    caption: "Artemis I: Orion's navigation camera, lunar close-up",
    nasaId: "art001e002594",
    title: "Flight Day 20: Lunar close-up",
    credit: "NASA JSC",
    date: "2022-12-05",
    accent: "#d6dbe8",
    drift: [-2, 0.5],
    focus: "60% 50%",
  },
  {
    key: "surface",
    stage: "On the Moon",
    src: "/scenes/moon-challenge",
    caption: "Apollo 17 landing site, Taurus-Littrow",
    nasaId: "as17-134-20435",
    title: "Wide-angle view of the Apollo 17 Taurus-Littrow landing site",
    credit: "NASA JSC",
    date: "1972-12-10",
    accent: "#c3cce4",
    drift: [1.5, 0.5],
    focus: "55% 45%",
  },
  {
    key: "mars",
    stage: "Mars",
    src: "/scenes/mars",
    caption: "Mount Sharp from Curiosity's Navcams (colour added by NASA/JPL)",
    nasaId: "PIA24937",
    title: "A picture postcard from Curiosity's Navcams",
    credit: "NASA/JPL-Caltech",
    date: "2021-11-23",
    accent: "#f0936a",
    drift: [-1.5, -0.5],
    focus: "60% 50%",
  },
];

export const JOURNEY_SECONDS = 5.5;
export const journeySrcSet = (f: JourneyFrame) => [960, 1600, 2400].map((w) => `${f.src}-${w}.webp ${w}w`).join(", ");
export const journeyUrl = (f: JourneyFrame) => `https://images.nasa.gov/details/${f.nasaId}`;
