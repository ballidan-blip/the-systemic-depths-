import { readdir, writeFile } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { defineConfig } from "vitest/config";

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const absolute = resolve(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute) : [absolute];
  }));
  return nested.flat();
}

function offlinePrecachePlugin() {
  return {
    name: "systemic-depths-offline-precache",
    apply: "build" as const,
    async closeBundle() {
      const outputDirectory = resolve("dist");
      const files = (await listFiles(outputDirectory))
        .map(file => relative(outputDirectory, file).split(sep).join("/"))
        .filter(file => file !== "sw.js" && /\.(html|js|css|svg|webmanifest)$/.test(file))
        .sort();
      const worker = [
        'const PREFIX = "systemic-depths-";',
        'const CACHE = PREFIX + "precache-v3";',
        'const BASE = new URL("./", self.registration.scope);',
        "const ASSETS = " + JSON.stringify(files) + ".map(path => new URL(path, BASE).toString());",
        'self.addEventListener("install", event => event.waitUntil((async () => { const cache = await caches.open(CACHE); await cache.addAll(ASSETS); await self.skipWaiting(); })()));',
        'self.addEventListener("activate", event => event.waitUntil((async () => { const keys = await caches.keys(); await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))); await self.clients.claim(); })()));',
        'self.addEventListener("fetch", event => { const request = event.request; const url = new URL(request.url); if (request.method !== "GET" || url.origin !== self.location.origin) return; if (request.mode === "navigate") { event.respondWith((async () => { try { const response = await fetch(request); if (response.ok) { const cache = await caches.open(CACHE); await cache.put(new URL("index.html", BASE), response.clone()); } return response; } catch { return (await caches.match(new URL("index.html", BASE))) || Response.error(); } })()); return; } if (ASSETS.includes(url.href)) event.respondWith(caches.match(request).then(cached => cached || fetch(request))); });'
      ].join("\n");
      await writeFile(resolve(outputDirectory, "sw.js"), worker + "\n", "utf8");
    }
  };
}

export default defineConfig({
  base: "./",
  plugins: [offlinePrecachePlugin()],
  server: { host: "0.0.0.0" },
  preview: { host: "0.0.0.0" },
  test: { environment: "node", clearMocks: true },
});
