import { describe, expect, it, vi } from "vitest";
import { isNewVisit, visitorCount, VISITOR_KEY } from "./visitors";

const env = { KV_REST_API_URL: "https://redis.example", KV_REST_API_TOKEN: "token" };
const replying = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as Response);

describe("visitorCount", () => {
  it("is null without Redis settings, and never calls out", async () => {
    const fetcher = replying({ result: 1 });
    expect(await visitorCount("count", {}, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("increments on a visit and reads otherwise", async () => {
    const fetcher = replying({ result: 42 });
    expect(await visitorCount("count", env, fetcher)).toBe(42);
    expect(fetcher).toHaveBeenCalledWith("https://redis.example", expect.objectContaining({ body: JSON.stringify(["INCR", VISITOR_KEY]) }));
    await visitorCount("read", env, fetcher);
    expect(fetcher).toHaveBeenLastCalledWith("https://redis.example", expect.objectContaining({ body: JSON.stringify(["GET", VISITOR_KEY]) }));
  });

  it("reads a missing key as 0 and a failed request as null", async () => {
    expect(await visitorCount("read", env, replying({ result: null }))).toBe(0);
    expect(await visitorCount("read", env, replying({}, false))).toBeNull();
    expect(await visitorCount("read", env, vi.fn(async () => Promise.reject(new Error("down"))))).toBeNull();
  });
});

describe("isNewVisit", () => {
  it("counts a browser once a day", () => {
    expect(isNewVisit(null, "2026-09-14")).toBe(true);
    expect(isNewVisit("2026-09-14", "2026-09-14")).toBe(false);
    expect(isNewVisit("2026-09-13", "2026-09-14")).toBe(true);
  });
});
