// Photos tied to an option value (e.g. the pink photo is for "Pink"), so the
// right photo shows for what the customer chose: gallery, basket, packs,
// orders and the Google feed. Client-safe.

/** The photo for the chosen values: the first photo tagged with one of them, else the first photo. */
export function imageFor<T extends { url: string; forValue?: string }>(images: T[], values: (string | null | undefined)[]): T | undefined {
  const chosen = values.filter((v): v is string => !!v);
  return images.find((img) => img.forValue && chosen.includes(img.forValue)) ?? images[0];
}

/** Browser event the product form sends when choices change; the gallery listens. */
export const CHOICE_EVENT = "product-choice";
export type ChoiceDetail = { productId: string; values: (string | null)[] };
