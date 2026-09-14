import { afterEach, describe, expect, it } from "vitest";
import { abbreviate, formatNumber, setAbbreviatedNumbers, thousandsLetter } from "./number-format";

describe("number format", () => {
  afterEach(() => setAbbreviatedNumbers(false));

  it("names each thousand with a letter, going on to two letters after Z", () => {
    expect(thousandsLetter(1)).toBe("A");
    expect(thousandsLetter(2)).toBe("B");
    expect(thousandsLetter(26)).toBe("Z");
    expect(thousandsLetter(27)).toBe("AA");
    expect(thousandsLetter(28)).toBe("AB");
  });

  it("abbreviates with three significant figures, and leaves numbers under 1,000 as they are", () => {
    expect(abbreviate(1000)).toBe("1.00A");
    expect(abbreviate(1_000_000)).toBe("1.00B");
    expect(abbreviate(13_400)).toBe("13.4A");
    expect(abbreviate(471e15)).toBe("471E");
    expect(abbreviate(6.68e24)).toBe("6.68H");
    expect(abbreviate(999_999)).toBe("1.00B");
    expect(abbreviate(-2500)).toBe("-2.50A");
    expect(abbreviate(372.6)).toBe("372.6");
    expect(abbreviate(1e81)).toBe("1.00AA");
  });

  it("writes full numbers until the setting is on", () => {
    expect(formatNumber(1_234_567)).toBe("1,234,567");
    setAbbreviatedNumbers(true);
    expect(formatNumber(1_234_567)).toBe("1.23B");
  });
});
