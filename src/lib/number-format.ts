/**
 * How the analyzer writes numbers: full, with thousands separators, or abbreviated the way the game does,
 * a letter for every thousand (1,000 is 1.00A, 1,000,000 is 1.00B, ... Z, then AA, AB and on) with three
 * significant figures. The profile's setting switches it; every number on the page goes through here.
 */

let abbreviated = false;

/** Switches abbreviated numbers on or off for everything formatted from now on. */
export function setAbbreviatedNumbers(on: boolean) {
  abbreviated = on;
}

/** The letters for a power of a thousand: 1 is A, 26 is Z, 27 is AA. */
export function thousandsLetter(power: number): string {
  let n = power;
  let letters = "";
  while (n > 0) {
    const index = (n - 1) % 26;
    letters = String.fromCharCode(65 + index) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

/** A number abbreviated with its thousands letter and three significant figures (below 1,000 as it is). */
export function abbreviate(value: number, maximumFractionDigits = 2): string {
  const size = Math.abs(value);
  if (!Number.isFinite(size) || size < 1000) return value.toLocaleString("en", { maximumFractionDigits });
  let power = Math.floor(Math.log10(size) / 3);
  let scaled = size / 1000 ** power;
  // Rounding can carry into the next letter (999.999A is 1.00B), and log10 can land a hair under a power.
  if (scaled < 1) {
    power -= 1;
    scaled *= 1000;
  }
  let text = scaled.toFixed(scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2);
  if (Number(text) >= 1000) {
    power += 1;
    scaled /= 1000;
    text = scaled.toFixed(2);
  }
  return `${value < 0 ? "-" : ""}${text}${thousandsLetter(power)}`;
}

/** A number as the page shows it: abbreviated when the setting is on, full with separators otherwise. */
export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return abbreviated ? abbreviate(value, maximumFractionDigits) : value.toLocaleString("en", { maximumFractionDigits });
}
