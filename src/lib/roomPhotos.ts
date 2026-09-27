// Room photography for the home page and room tiles. Unsplash, free licence
// (commercial use allowed, no attribution required; we credit anyway).
// These are mood photos: the furniture pictured isn't necessarily ours,
// so copy beside them never claims it is.
import type { CategorySlug } from "./catalogue";

export interface RoomPhoto {
  /** images.unsplash.com path, sized per use with `unsplash()`. */
  src: string;
  alt: string;
  credit: string;
  /** Unsplash photo page, for the credit link. */
  page: string;
}

export function unsplash(src: string, w: number) {
  return `https://images.unsplash.com/${src}?auto=format&fit=crop&w=${w}&q=70`;
}

const p = (id: string, src: string, alt: string, credit: string): RoomPhoto => ({
  src,
  alt,
  credit,
  page: `https://unsplash.com/photos/${id}`,
});

const PHOTOS = {
  bright: p("Kh4tedFdHz4", "photo-1631510390389-c1e4fb20ff31", "A bright living room with a light wood sideboard, a round coffee table and armchairs by the window", "Spacejoy"),
  moody: p("AVK42DjB2sE", "photo-1643233948547-b0fbb4368089", "A small cane-fronted wooden cabinet against a deep green wall, with books and a vase on top", "Priscilla Du Preez"),
};

export const HERO_PHOTO = PHOTOS.bright;

export const ROOM_PHOTOS: Record<CategorySlug, RoomPhoto> = {
  "living-room": PHOTOS.bright,
  dining: p("urH155LONWs", "photo-1745794621090-d856c53b0cc2", "A dining room with a wooden table and mid-century chairs", "Clay Banks"),
  bedroom: p("7xRQZiIGKmo", "photo-1663337049364-5c6ba8ba1e78", "A bedroom with wooden bedside tables either side of the bed", "Annie Spratt"),
  "home-office": p("zIltX6n3m7w", "photo-1596022326953-84f20bfebb77", "A wooden trestle desk with a black chair and a plant", "Sven Brandsma"),
  storage: p("Z0RIV1K_rug", "photo-1762280237740-5a9292e527ab", "A wooden cabinet with a lamp and a plant against a white brick wall", "Samuell Morgenstern"),
  accents: PHOTOS.moody,
};
