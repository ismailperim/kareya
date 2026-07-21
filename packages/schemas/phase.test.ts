import assert from "node:assert/strict";
import { test } from "vitest";

import { canTransition, isPhase, transition } from "./phase";

test("happy path: BRIEF → … → LIVE → CARE", () => {
  assert.equal(transition("BRIEF", "BRIEF_COMPLETED"), "BRIEF_COMPLETED");
  assert.equal(transition("BRIEF_COMPLETED", "BUILDING"), "BUILDING");
  assert.equal(transition("BUILDING", "PREVIEW_READY"), "PREVIEW_READY");
  assert.equal(transition("PREVIEW_READY", "LIVE"), "LIVE");
  assert.equal(transition("LIVE", "CARE"), "CARE");
});

test("failure + retry: BUILDING → FAILED → BUILDING", () => {
  assert.equal(transition("BUILDING", "FAILED"), "FAILED");
  assert.equal(transition("FAILED", "BUILDING"), "BUILDING");
});

test("revision loop: PREVIEW_READY/LIVE/CARE → BUILDING", () => {
  assert.ok(canTransition("PREVIEW_READY", "BUILDING"));
  assert.ok(canTransition("LIVE", "BUILDING"));
  assert.ok(canTransition("CARE", "BUILDING"));
});

test("invalid transitions rejected", () => {
  assert.equal(canTransition("BRIEF", "LIVE"), false);
  assert.equal(canTransition("BRIEF", "PREVIEW_READY"), false);
  assert.throws(() => transition("LIVE", "BRIEF"));
  assert.throws(() => transition("BUILDING", "CARE"));
});

test("isPhase guard", () => {
  assert.ok(isPhase("BUILDING"));
  assert.equal(isPhase("NOPE"), false);
  assert.equal(isPhase(42), false);
});
