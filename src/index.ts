#!/usr/bin/env node
/**
 * pushizo apps | segments | templates | send | --help | --version
 * Ortam: PUSHIZO_API_KEY, PUSHIZO_APP_ID, PUSHIZO_API_URL (varsayılan https://api.pushizo.com)
 */
import { run } from './cli.js';

process.exitCode = await run(process.argv.slice(2), process.env, {
  out: (text) => void process.stdout.write(text),
  err: (text) => void process.stderr.write(text),
  fetch: globalThis.fetch,
});
