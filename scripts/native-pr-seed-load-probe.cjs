'use strict';

/**
 * Test-only preload for `native-pr-seed.test.mjs`. Load it with `node --require` before the fixture
 * so the test can see the order in which the seed guard runs and client modules load.
 *
 * It writes one stderr line per event and changes nothing else:
 *  - `LOAD-PROBE guard <name>` when a guard export is called;
 *  - `LOAD-PROBE client <request>` when a database or bucket client module is loaded.
 *
 * Every client is built from one of these modules, so a client cannot exist before its module line.
 * The guard line proves the probe sees the fixture's own module loads, so a missing client line
 * cannot come from a loader the probe does not observe.
 */

const Module = require('node:module');
const { writeSync } = require('node:fs');

const GUARD = /(^|\/)native-pr-seed-guard(\.cjs)?$/;
const CLIENTS = [/^pg$/, /^@prisma\/adapter-pg$/, /^@prisma\/client(\/|$)/, /^@aws-sdk\/client-s3$/, /^sharp$/, /generated\/prisma\/client\//];

function trace(line) {
  writeSync(2, `LOAD-PROBE ${line}\n`);
}

const load = Module._load;
Module._load = function probedLoad(request, ...rest) {
  if (CLIENTS.some(pattern => pattern.test(request))) trace(`client ${request}`);
  const loaded = load.call(this, request, ...rest);
  if (!GUARD.test(request)) return loaded;
  const wrapped = { ...loaded };
  for (const [name, value] of Object.entries(loaded)) {
    if (typeof value !== 'function') continue;
    wrapped[name] = function probedGuard(...args) {
      trace(`guard ${name}`);
      return value.apply(this, args);
    };
  }
  return wrapped;
};
