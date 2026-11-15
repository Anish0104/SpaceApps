/**
 * The hero's "view from a moving spacecraft": real public-domain NASA photographs, shown in flight
 * order. Ids, titles and dates come from the NASA Image and Video Library (see public/journey/CREDITS.md
 * and public/scenes/CREDITS.md). Scene-setting views only — never evidence.
 */
export interface JourneyFrame {
  key: string;
  stage: string;
  src: string;            // path stem: `${src}-${width}.webp`
  caption: string;
  nasaId: string;
  accent: string;         // HUD + glow accent while this frame shows
  drift: [number, number];
  focus: string;
}

export const JOURNEY: JourneyFrame[] = [
  { key: "leo", stage: "Low Earth orbit", src: "/scenes/iss", caption: "Earth's limb and aurora from the ISS", nasaId: "iss030e075182", accent: "#7fb0ff", drift: [-2, -1], focus: "60% 55%" },
  { key: "depart", stage: "Leaving Earth", src: "/journey/depart", caption: "From Orion's window, flight test", nasaId: "jsc2022e044289", accent: "#8ec5ff", drift: [2, 1], focus: "70% 60%" },
  { key: "outbound", stage: "Outbound", src: "/journey/outbound", caption: "Artemis I: Orion looks back at Earth", nasaId: "art001e000475", accent: "#a9c8ff", drift: [-1.5, 1], focus: "60% 60%" },
  { key: "approach", stage: "Lunar approach", src: "/journey/approach", caption: "Artemis I: Orion approaches the Moon", nasaId: "art001e000269", accent: "#c3cce4", drift: [1.5, -1], focus: "55% 70%" },
  { key: "flyby", stage: "Lunar flyby", src: "/journey/flyby", caption: "Artemis I: lunar close-up", nasaId: "art001e002594", accent: "#d6dbe8", drift: [-2, 0.5], focus: "60% 50%" },
  { key: "surface", stage: "On the Moon", src: "/scenes/moon-challenge", caption: "Apollo 17 landing site, Taurus-Littrow", nasaId: "as17-134-20435", accent: "#c3cce4", drift: [1.5, 0.5], focus: "55% 45%" },
  { key: "mars", stage: "Mars", src: "/scenes/mars", caption: "Mount Sharp from Curiosity (colour added by NASA/JPL)", nasaId: "PIA24937", accent: "#f0936a", drift: [-1.5, -0.5], focus: "60% 50%" },
];

export const JOURNEY_SECONDS = 5.5;
export const journeySrcSet = (f: JourneyFrame) => [960, 1600].map((w) => `${f.src}-${w}.webp ${w}w`).join(", ");
export const journeySrc = (f: JourneyFrame) => `${f.src}-1600.webp`;
export const journeyUrl = (f: JourneyFrame) => `https://images.nasa.gov/details/${f.nasaId}`;
