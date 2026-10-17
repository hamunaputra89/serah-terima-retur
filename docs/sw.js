/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "402b66900e731ca748771b6fc5e7a068"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "48e3c89b41a416a75a1135b322ecf4ec"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1bea3e79fea6e0628c702a06ec604851"
  }, {
    "url": "pwa-192x192.png",
    "revision": "6ac1172ed67f66f38e1df07839bb43b3"
  }, {
    "url": "index.html",
    "revision": "d9e672983c8c9bd57d5e26c2ce33d007"
  }, {
    "url": "icon.svg",
    "revision": "576a44d83d3edbbbdf6487a394627064"
  }, {
    "url": "favicon.ico",
    "revision": "9458ae918d4b354c1a65aa6dbdc5e0ce"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "15834cdf234912ae5affdaf595746252"
  }, {
    "url": "404.html",
    "revision": "752d410b17673ccddc0e283a1271c3d2"
  }, {
    "url": "assets/purify.es-B7SQ8EAD.js",
    "revision": null
  }, {
    "url": "assets/index.es-D6eSkkwE.js",
    "revision": null
  }, {
    "url": "assets/index-D5ItKvWi.js",
    "revision": null
  }, {
    "url": "assets/index-Bs5dzo2M.css",
    "revision": null
  }, {
    "url": "assets/html2canvas-Cu-4USKz.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "15834cdf234912ae5affdaf595746252"
  }, {
    "url": "favicon.ico",
    "revision": "9458ae918d4b354c1a65aa6dbdc5e0ce"
  }, {
    "url": "icon.svg",
    "revision": "576a44d83d3edbbbdf6487a394627064"
  }, {
    "url": "pwa-192x192.png",
    "revision": "6ac1172ed67f66f38e1df07839bb43b3"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1bea3e79fea6e0628c702a06ec604851"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "48e3c89b41a416a75a1135b322ecf4ec"
  }, {
    "url": "manifest.webmanifest",
    "revision": "774b1d6089833f162360234a5adff5ec"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
