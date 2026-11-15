/** Scene photos per crew environment — real public-domain NASA photographs (see public/scenes/CREDITS.md),
 *  reused from the repository's curated set. Photos set the scene; they are never evidence. */
export interface Scene {
  id: string;
  label: string;
  pickerLabel?: string;
  focus: string;
  heroAccent: string;
  photo: { nasaId: string; caption: string; credit: string; date: string };
}

export const SCENES: Record<string, Scene> = {
  earth: { id: "earth", label: "Earth", focus: "72% 50%", heroAccent: "#e3b26b", photo: { nasaId: "GRC-1998-C-00486", caption: "A candle flame in 1 g, NASA Glenn", credit: "NASA Glenn", date: "1998" } },
  iss: { id: "iss", label: "Orbit", pickerLabel: "ISS cabin", focus: "62% 55%", heroAccent: "#7fb0ff", photo: { nasaId: "iss030e075182", caption: "Earth's limb and aurora from the ISS", credit: "NASA JSC", date: "2012" } },
  "moon-challenge": { id: "moon-challenge", label: "Moon base", focus: "55% 45%", heroAccent: "#c3cce4", photo: { nasaId: "as17-134-20435", caption: "Apollo 17 landing site, Taurus-Littrow", credit: "NASA JSC", date: "1972" } },
  "moon-fm2": { id: "moon-fm2", label: "Moon habitat", pickerLabel: "Moon habitat (FM2)", focus: "55% 50%", heroAccent: "#c3cce4", photo: { nasaId: "as15-85-11425", caption: "Hadley Rille, Apollo 15", credit: "NASA JSC", date: "1971" } },
  rover: { id: "rover", label: "Rover", pickerLabel: "Pressurized rover", focus: "68% 60%", heroAccent: "#c3cce4", photo: { nasaId: "as17-147-22527", caption: "Apollo 17 Lunar Roving Vehicle", credit: "NASA JSC", date: "1972" } },
  mars: { id: "mars", label: "Mars", pickerLabel: "Mars habitat", focus: "60% 50%", heroAccent: "#f0936a", photo: { nasaId: "PIA24937", caption: "Mount Sharp from Curiosity (colour added by NASA/JPL)", credit: "NASA/JPL-Caltech", date: "2021" } },
  suit: { id: "suit", label: "Spacesuit", focus: "55% 45%", heroAccent: "#c3cce4", photo: { nasaId: "as17-134-20476", caption: "Apollo 17 EVA, Taurus-Littrow", credit: "NASA JSC", date: "1972" } },
};

const BY_ENV: Record<string, string> = { earth: "earth", spacecraft: "iss", station: "iss", moon: "moon-challenge", mars: "mars", rover: "rover", suit: "suit" };
export const sceneFor = (sc: { id: string; environment: string }): Scene => SCENES[sc.id] ?? SCENES[BY_ENV[sc.environment]] ?? SCENES["moon-challenge"];

/** A CSS-drawn planetary orb (no photo) tinted by the environment's accent — a shaded sphere. */
export const orbStyle = (accent: string): { background: string } => ({
  background: `radial-gradient(circle at 34% 29%, rgba(255,255,255,0.9), ${accent} 44%, rgba(0,0,0,0.6) 100%)`,
});
export const sceneSrcSet = (s: Scene) => `/scenes/${s.id}-960.webp 960w, /scenes/${s.id}-1600.webp 1600w`;
export const sceneSrc = (s: Scene) => `/scenes/${s.id}-1600.webp`;
export const photoUrl = (nasaId: string) => `https://images.nasa.gov/details/${nasaId}`;
