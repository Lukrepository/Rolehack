// Written for Rolehack by Lucas Ruiz, 2026-10-02.
//
// So that "node --test win/web/test/" runs every *.test.mjs here, on any
// node.  Node 20 searches a directory it is given and runs each test file in
// it (this one too, run by its own name, which then does nothing); node 21
// and later instead run the directory itself as a module, which is this file,
// and it brings the tests in.  CommonJS, as a directory's index.js is.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

if (path.resolve(process.argv[1] || '') === __dirname) {
  for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.mjs')).sort()) {
    import(pathToFileURL(path.join(__dirname, f)).href);
  }
}
