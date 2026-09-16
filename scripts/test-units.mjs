import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAmountToCents,
  centsToDecimalString,
  formatMoney,
  normalizeLatinDigits,
} from "../src/lib/money.ts";
import {
  isValidIsoDate,
  startOfMonthIso,
  endOfMonthIso,
  daysBetween,
  monthsInRange,
} from "../src/lib/dates.ts";
import { hashPassword, verifyPassword } from "../src/lib/auth/password.ts";

test("Money Math: parses standard and localized numbers to integer cents", () => {
  assert.equal(parseAmountToCents("10"), 1000);
  assert.equal(parseAmountToCents("10.50"), 1050);
  assert.equal(parseAmountToCents("10,50"), 1050);
  assert.equal(parseAmountToCents("۱۲٫۵۰"), 1250);
  assert.equal(parseAmountToCents("١٢.٥٠"), 1250);
  assert.equal(parseAmountToCents("1000000.00"), 100000000);
  assert.equal(parseAmountToCents("-5"), null);
  assert.equal(parseAmountToCents("12.345"), null);
  assert.equal(parseAmountToCents("abc"), null);
});

test("Money Formatting: converts cents to decimal strings and formatted currency", () => {
  assert.equal(centsToDecimalString(1050), "10.50");
  assert.equal(centsToDecimalString(0), "0.00");
  assert.equal(centsToDecimalString(-2500), "-25.00");
  assert.ok(formatMoney(1050, "USD").includes("10.50"));
});

test("Dates: calendar calculations and bounds", () => {
  assert.equal(isValidIsoDate("2026-09-15"), true);
  assert.equal(isValidIsoDate("2026-02-29"), false);
  assert.equal(isValidIsoDate("invalid"), false);
  assert.equal(startOfMonthIso("2026-09-15"), "2026-09-01");
  assert.equal(endOfMonthIso("2026-09-15"), "2026-09-30");
  assert.equal(daysBetween("2026-09-01", "2026-09-15"), 14);
  assert.equal(monthsInRange("2026-01-01", "2026-03-01").length, 3);
});

test("Security: scrypt password hashing and timing-safe verification", async () => {
  const password = "superSecretPassword123!";
  const hash = await hashPassword(password);
  assert.ok(hash.startsWith("scrypt$"));
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrongPassword", hash), false);
  assert.equal(await verifyPassword(password, "malformed-hash"), false);
});
