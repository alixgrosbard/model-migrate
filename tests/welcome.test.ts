import { describe, expect, it } from "vitest";
import {
  idempotencyKey,
  otherModelsInNext30Days,
  readUnsubscribeToken,
  signUnsubscribeToken,
  upcomingShutdowns,
  welcomeContent,
  type ShutdownModel,
} from "../service/src/welcome.ts";

const day = "2026-10-19";

describe("welcome list", () => {
  it("lists the next five shutdowns on or after today and counts the rest", () => {
    const models = [
      row("past", "2026-10-01"),
      row("floor", "2026-10-20", "not_before"),
      row("soon-a", "2026-10-20"),
      row("soon-b", "2026-10-21"),
      row("soon-c", "2026-10-22"),
      row("soon-d", "2026-11-01"),
      row("soon-e", "2026-11-02"),
      row("later", "2026-12-01"),
      row("month", "2026-10-01", "month_only"),
      row("dup", "2026-10-20", "exact", "openai", "dup-long-slug"),
    ];
    models.push({ ...row("dup", "2026-10-20"), slug: "dup" });
    const next = upcomingShutdowns(models, day, 5);
    expect(next.map((model) => model.id)).toEqual(["month", "dup", "soon-a", "soon-b", "soon-c"]);
    expect(next.filter((model) => model.id === "dup")).toHaveLength(1);
    expect(next.find((model) => model.id === "dup")?.slug).toBe("dup");
    const others = otherModelsInNext30Days(models, next, day);
    expect(others).toBe(2);
    const withExtra = [...models, row("extra", "2026-11-10")];
    expect(otherModelsInNext30Days(withExtra, upcomingShutdowns(withExtra, day, 5), day)).toBe(3);
    const content = welcomeContent(models, day, "https://api.example/unsubscribe?token=abc");
    expect(content.subject).toBe("Welcome to SunsetDiff: month on 2026-10");
    expect(content.text).toContain("Thanks for signing up.");
    expect(content.text).toContain("More than 2 other models shut down in the next 30 days.");
    expect(content.text).toContain("https://sunsetdiff.com/deadlines/");
    expect(content.text).toContain("https://sunsetdiff.com/calendar/");
    expect(content.text).toContain("https://sunsetdiff.com/deadlines.ics");
    expect(content.text).toContain("Coming soon: Pro alerts tuned to just the models you use.");
    expect(content.text).toContain("Thanks, SunsetDiff");
    expect(content.html).toContain("https://sunsetdiff.com/models/openai/dup/");
    expect(`${content.subject}\n${content.text}\n${content.html}`).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("unsubscribe token", () => {
  it("accepts a signed token and rejects a tampered one", () => {
    const secret = "test-secret";
    const token = signUnsubscribeToken("person@example.com", secret);
    expect(readUnsubscribeToken(token, secret)).toBe("person@example.com");
    expect(readUnsubscribeToken(token, "other-secret")).toBeNull();
    expect(readUnsubscribeToken(`${token}x`, secret)).toBeNull();
    expect(readUnsubscribeToken("not-a-token", secret)).toBeNull();
    expect(idempotencyKey("person@example.com")).toBe(idempotencyKey("person@example.com"));
    expect(idempotencyKey("other@example.com")).not.toBe(idempotencyKey("person@example.com"));
  });
});

function row(
  id: string,
  shutdown: string,
  kind = "exact",
  provider = "openai",
  slug = id,
): ShutdownModel {
  return {
    id,
    slug,
    provider,
    display_name: id,
    shutdown_date: shutdown,
    shutdown_date_kind: kind,
  };
}
