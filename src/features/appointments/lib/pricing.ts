import { round2 } from "@/lib/utils";

export interface AddonPrices {
  price_french: number;
  price_nail_art: number;
  price_complex_art: number;
  price_strass: number;
}

export interface PricingInput {
  servicePrice: number;
  french: boolean;
  nailArtCount: number;
  complexArtCount: number;
  strassCount: number;
  discount?: number;
}

export interface PricingLine { label: string; quantity: number; unitPrice: number; total: number }

/** Single source of truth for an appointment's price. Used by the form (live total) and the server action. */
export function computePricing(input: PricingInput, prices: AddonPrices) {
  const lines: PricingLine[] = [];
  const add = (label: string, quantity: number, unitPrice: number) => {
    if (quantity > 0) lines.push({ label, quantity, unitPrice, total: round2(quantity * unitPrice) });
  };
  add("French", input.french ? 1 : 0, Number(prices.price_french));
  add("Nail art", input.nailArtCount, Number(prices.price_nail_art));
  add("Complex nail art", input.complexArtCount, Number(prices.price_complex_art));
  add("Strass", input.strassCount, Number(prices.price_strass));

  const extras = round2(lines.reduce((s, l) => s + l.total, 0));
  const subtotal = round2(Number(input.servicePrice) + extras);
  const discount = Math.min(round2(input.discount ?? 0), subtotal);
  return { lines, extras, subtotal, discount, total: round2(subtotal - discount) };
}
