#!/usr/bin/env node
/**
 * pushizo apps | segments | templates | send
 * Ortam: PUSHIZO_API_KEY, PUSHIZO_APP_ID, PUSHIZO_API_URL (varsayılan https://api.pushizo.com)
 */
const apiUrl = (process.env.PUSHIZO_API_URL ?? 'https://api.pushizo.com').replace(/\/+$/, '');
const key = process.env.PUSHIZO_API_KEY ?? '';
const appId = process.env.PUSHIZO_APP_ID ?? '';

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  if (!key) {
    console.error('PUSHIZO_API_KEY gerekli.');
    process.exit(1);
  }
  const res = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(text.slice(0, 500));
    process.exit(1);
  }
  return text ? JSON.parse(text) : {};
}

function needApp(): string {
  if (!appId) {
    console.error('PUSHIZO_APP_ID gerekli.');
    process.exit(1);
  }
  return appId;
}

const [command, ...rest] = process.argv.slice(2);

if (command === 'apps') {
  console.log(JSON.stringify(await call('GET', '/v1/apps'), null, 2));
} else if (command === 'segments') {
  console.log(JSON.stringify(await call('GET', `/v1/apps/${needApp()}/segments`), null, 2));
} else if (command === 'templates') {
  console.log(JSON.stringify(await call('GET', `/v1/apps/${needApp()}/templates`), null, 2));
} else if (command === 'send') {
  const title = rest[0];
  const body = rest.slice(1).join(' ');
  if (!title || !body) {
    console.error('Kullanım: pushizo send "başlık" "gövde"');
    process.exit(1);
  }
  const result = await call('POST', '/v1/notifications', {
    app_id: needApp(),
    target: { included_segments: ['Subscribed Users'] },
    headings: { en: title, tr: title },
    contents: { en: body, tr: body },
  });
  console.log(JSON.stringify(result, null, 2));
} else {
  console.error('Komutlar: apps, segments, templates, send');
  process.exit(command ? 1 : 0);
}
