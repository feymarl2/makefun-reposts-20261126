// makefun-x-reposts-02 entry program (Node 22, standard library only).
//
// The entry is the six quote-posts named in POSTS.json: each one quotes a
// different @makefunai pool post and carries the make.fun play code in its
// own words. This program validates POSTS.json locally (shape, X status
// addresses, at most 15 posts, no duplicates) and then copies it to the
// output directory, where the competition gate reads it.
//
// Outside the grader's container:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_POSTS = 15;
const STATUS_PATH = /^\/(?:i\/web\/)?(?:[^/]+\/)?status\/(\d+)$/;
const X_HOSTS = new Set([
  'x.com',
  'twitter.com',
  'www.x.com',
  'www.twitter.com',
  'mobile.x.com',
  'mobile.twitter.com',
]);

function fail(message: string): never {
  console.error(`POSTS.json rejected: ${message}`);
  process.exit(1);
}

const sourcePath = join(BOT_DIR, 'POSTS.json');
const raw = readFileSync(sourcePath, 'utf8');
if (Buffer.byteLength(raw, 'utf8') > 16_384) {
  fail('file is larger than 16384 bytes');
}

let parsed: unknown;
try {
  parsed = JSON.parse(raw);
} catch {
  fail('file is not valid JSON');
}

if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
  fail('top level must be a JSON object');
}

const keys = Object.keys(parsed);
if (keys.length !== 1 || keys[0] !== 'posts') {
  fail('object must contain only the "posts" field');
}

const posts = (parsed as { posts?: unknown }).posts;
if (!Array.isArray(posts) || posts.length === 0) {
  fail('"posts" must be a non-empty array');
}
if (posts.length > MAX_POSTS) {
  fail(`"posts" names ${posts.length} posts, more than the ${MAX_POSTS} allowed`);
}

const seen = new Set<string>();
for (const entry of posts) {
  if (typeof entry !== 'string') {
    fail('every post address must be a string');
  }
  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    fail(`not a valid URL: ${entry}`);
  }
  if (!X_HOSTS.has(url.hostname)) {
    fail(`address does not point to X: ${entry}`);
  }
  const match = url.pathname.match(STATUS_PATH);
  if (!match) {
    fail(`address does not name an X status: ${entry}`);
  }
  if (seen.has(match[1])) {
    fail(`duplicate status id: ${match[1]}`);
  }
  seen.add(match[1]);
}

mkdirSync(OUTPUT_DIR, { recursive: true });
copyFileSync(sourcePath, join(OUTPUT_DIR, 'POSTS.json'));
const summary = [...seen].sort().join(', ');
console.log(`POSTS.json OK: ${posts.length} post(s) copied to ${OUTPUT_DIR} (status ids: ${summary})`);
