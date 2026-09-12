#!/usr/bin/env node
// Rewrites the npm packages table in README.md between the
// NPM_PACKAGES markers using live data from the npm registry, so any
// package published under NPM_USER shows up automatically.

import { readFile, writeFile } from "node:fs/promises";

const NPM_USER = "iamahmed";
const README_PATH = new URL("../README.md", import.meta.url);
const START_MARKER = "<!--START_SECTION:npm-packages-->";
const END_MARKER = "<!--END_SECTION:npm-packages-->";

async function fetchPackages() {
  const url = `https://registry.npmjs.org/-/v1/search?text=maintainer:${NPM_USER}&size=50`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`npm registry search failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.objects.map((o) => o.package);
}

function buildTable(packages) {
  if (packages.length === 0) {
    return "_No public npm packages yet._";
  }
  const rows = packages
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((pkg) => {
      const name = `[**${pkg.name}**](https://www.npmjs.com/package/${pkg.name})`;
      const version = `\`v${pkg.version}\``;
      const description = (pkg.description || "").replace(/\|/g, "\\|");
      return `| ${name} | ${version} | ${description} |`;
    });
  return [
    "| Package | Version | Description |",
    "|---|---|---|",
    ...rows,
  ].join("\n");
}

async function main() {
  const packages = await fetchPackages();
  const table = buildTable(packages);

  const readme = await readFile(README_PATH, "utf8");
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error("npm-packages markers not found in README.md");
  }

  const updated =
    readme.slice(0, startIdx + START_MARKER.length) +
    "\n\n" +
    table +
    "\n\n" +
    readme.slice(endIdx);

  await writeFile(README_PATH, updated);
  console.log(`Updated npm packages section with ${packages.length} package(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
