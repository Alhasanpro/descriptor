import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const identity = require("../desktop/product-identity.cjs") as {
  PRODUCT_NAME: string;
  LEGACY_USER_DATA_NAME: string;
  BUNDLE_ID: string;
};

test("uses Descriptor as the visible app name while preserving Mac identity and data", () => {
  const desktopPackage = JSON.parse(readFileSync(new URL("../desktop/package.json", import.meta.url), "utf8"));

  assert.equal(identity.PRODUCT_NAME, "Descriptor");
  assert.equal(desktopPackage.build.productName, identity.PRODUCT_NAME);
  assert.equal(identity.BUNDLE_ID, "com.alhasan.descripter");
  assert.equal(desktopPackage.build.appId, identity.BUNDLE_ID);
  assert.equal(identity.LEGACY_USER_DATA_NAME, "Descripter");
});
