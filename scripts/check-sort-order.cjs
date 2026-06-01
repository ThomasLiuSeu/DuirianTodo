#!/usr/bin/env node
/**
 * Regression test: ensure sort_order is not populated with Date.now()
 * because Postgres integer cannot hold millisecond timestamps.
 */
const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "src", "hooks", "useTodos.ts");
const source = fs.readFileSync(target, "utf-8");

// Any use of Date.now() in the file is a bug for sort_order.
if (source.includes("Date.now()")) {
  console.error("FAIL: Date.now() still used in useTodos.ts (causes integer overflow)");
  process.exit(1);
}

console.log("PASS: no Date.now() in useTodos.ts");
process.exit(0);
