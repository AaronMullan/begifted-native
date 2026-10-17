import { assertEquals } from "jsr:@std/assert@1";
import { moderationStopKind } from "./safety-kind.ts";

const messages = [{ role: "user", content: "hi" }];

Deno.test("a child-sexual hit keeps the plain decline", async () => {
  assertEquals(
    await moderationStopKind(
      { blocked: true, categories: ["sexual/minors", "self-harm"] },
      messages
    ),
    "generic"
  );
});

Deno.test("a clean screen carries on without a check", async () => {
  assertEquals(
    await moderationStopKind({ blocked: false, categories: [] }, messages),
    null
  );
});
