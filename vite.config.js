import { defineConfig } from 'vite';
import path from 'path';

const userscriptHeader = `// ==UserScript==
// @name Tasker
// @namespace Violentmonkey Scripts
// @version 5.0.0
// @description Modular Tasker userscript
// @author Richitos
// @match https://cz25.the-west.cz/game.php*
// @match https://zz1.beta.the-west.net/game.php*
// @include https://.the-west.net/game.php
// @grant none
// ==/UserScript==\n\n`;

function userscriptHeaderPlugin() {
  return {
    name: 'userscript-header',
    generateBundle(options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        if (fileName === 'tasker.user.js') {
          const chunk = bundle[fileName];
          if (chunk.type === 'chunk') {
            chunk.code = userscriptHeader + chunk.code;
          }
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [userscriptHeaderPlugin()],
  build: {
    target: 'es2020',
    minify: false,
    outDir: 'dist',
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.js'),
      output: {
        entryFileNames: 'tasker.user.js',
        format: 'iife',
        intro: 'const window = typeof globalThis !== "undefined" ? globalThis : this;\n',
      },
    },
  },
});
