import assert from "node:assert/strict";
import { classifyArticle, fallbackClassification } from "../lib/market/classifier";
void (async () => {
  assert.equal(fallbackClassification({ title: "Festival keluarga", text: "Acara event" }).kind, "event");
  const ai = await classifyArticle({ title: "Kuliner", text: "restoran baru" }, async () => JSON.stringify({ kind: "fnb", tags: ["food"], targetAudience: "families", relevanceScore: 140, description: "desc" }));
  assert.equal(ai.kind, "fnb"); assert.equal(ai.relevanceScore, 100); assert.equal(ai.targetAudience, "families");
  assert.equal((await classifyArticle({ title: "Destinasi", text: "pantai" }, async () => { throw new Error("offline"); })).kind, "destination");
  console.log("market classifier checks passed");
})();
