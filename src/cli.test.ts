import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { HELP, run, VERSION } from './cli.js';

function harness(response?: { status: number; body: string }) {
  const out: string[] = [];
  const err: string[] = [];
  const fetch = vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(response?.body ?? '{}', { status: response?.status ?? 200 }),
  );
  return {
    out,
    err,
    fetch,
    io: { out: (t: string) => void out.push(t), err: (t: string) => void err.push(t), fetch },
  };
}

describe('pushizo cli', () => {
  it('--help ve --version ağ çağrısı yapmaz', async () => {
    const h = harness();
    expect(await run(['--help'], {}, h.io)).toBe(0);
    expect(h.out.join('')).toBe(HELP);
    expect(await run(['--version'], {}, h.io)).toBe(0);
    expect(h.out.at(-1)).toBe(`${VERSION}\n`);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it('argümansız çağrı yardımı gösterir ve 1 döner', async () => {
    const h = harness();
    expect(await run([], {}, h.io)).toBe(1);
    expect(h.out.join('')).toContain('Usage:');
  });

  it('anahtar yoksa istek atmaz', async () => {
    const h = harness();
    expect(await run(['apps'], {}, h.io)).toBe(1);
    expect(h.err.join('')).toContain('PUSHIZO_API_KEY');
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it('segments app kimliğiyle ve Bearer anahtarla çağrılır; anahtar çıktıya yazılmaz', async () => {
    const h = harness({ status: 200, body: '{"data":[{"id":"seg_1"}]}' });
    const env = {
      PUSHIZO_API_KEY: 'hs_test_value',
      PUSHIZO_APP_ID: 'app 1',
      PUSHIZO_API_URL: 'http://localhost:4000/',
    };
    expect(await run(['segments'], env, h.io)).toBe(0);
    const [url, init] = h.fetch.mock.calls[0]!;
    expect(url).toBe('http://localhost:4000/v1/apps/app%201/segments');
    expect((init?.headers as Record<string, string>).authorization).toBe('Bearer hs_test_value');
    expect(h.out.join('')).toContain('seg_1');
    expect([...h.out, ...h.err].join('')).not.toContain('hs_test_value');
  });

  it('send gövdesi ve HTTP hatası', async () => {
    const h = harness({ status: 422, body: '{"error":{"code":"HS_VALIDATION_ERROR"}}' });
    const env = { PUSHIZO_API_KEY: 'k_1234', PUSHIZO_APP_ID: 'app_1' };
    expect(await run(['send', 'Başlık', 'Gövde', 'metni'], env, h.io)).toBe(1);
    const [, init] = h.fetch.mock.calls[0]!;
    expect(JSON.parse(init?.body as string)).toMatchObject({
      app_id: 'app_1',
      headings: { en: 'Başlık' },
      contents: { en: 'Gövde metni' },
    });
    expect(h.err.join('')).toContain('HTTP 422');
  });

  it('bilinmeyen komut 1 döner', async () => {
    const h = harness();
    expect(await run(['nope'], {}, h.io)).toBe(1);
    expect(h.err.join('')).toContain('nope');
  });
});

describe('pushizo channels (ADR-0097)', () => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'pushizo-cli-')));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const p8 = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const secret = `cs_${randomBytes(14).toString('hex')}`;
  writeFileSync(path.join(dir, 'AuthKey_ABCDE12345.p8'), p8);
  writeFileSync(path.join(dir, 'secret.txt'), secret);
  const env = { PUSHIZO_API_KEY: 'hs_live_gizli_anahtar', PUSHIZO_APP_ID: 'app_1', PUSHIZO_API_URL: 'https://api.test' };

  function channelHarness(replies: { status: number; body: unknown }[]) {
    const out: string[] = [];
    const err: string[] = [];
    const requests: { url: string; method?: string; body?: string }[] = [];
    const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: url as string, method: init?.method, body: init?.body as string | undefined });
      const reply = replies[requests.length - 1] ?? { status: 200, body: {} };
      return new Response(JSON.stringify(reply.body), { status: reply.status });
    });
    return { out, err, requests, io: { out: (t: string) => void out.push(t), err: (t: string) => void err.push(t), fetch, cwd: dir } };
  }

  it('channels status kanal özetini yazar', async () => {
    const h = channelHarness([{ status: 200, body: { data: [{ channel: 'ios_push', provider: 'apns', status: 'active' }] } }]);
    expect(await run(['channels', 'status'], env, h.io)).toBe(0);
    expect(h.requests[0]).toMatchObject({ url: 'https://api.test/v1/apps/app_1/channels/status', method: 'GET' });
    expect(h.out.join('')).toContain('"active"');
  });

  it('apns: dosyadan yükler, doğrular; anahtar içeriği ve API anahtarı çıktıya yazılmaz', async () => {
    const h = channelHarness([
      { status: 200, body: { channel: 'ios_push', config: {} } },
      { status: 200, body: { ok: true, channel: { status: 'active' } } },
    ]);
    const code = await run(['channels', 'apns', '--key-file', 'AuthKey_ABCDE12345.p8', '--team-id', 'TEAM123456', '--bundle-id', 'com.example.app', '--environment', 'production'], env, h.io);
    expect(code).toBe(0);
    expect(h.requests.map((r) => `${r.method} ${r.url}`)).toEqual(['PUT https://api.test/v1/apps/app_1/channels/ios_push', 'POST https://api.test/v1/apps/app_1/channels/ios_push/validate']);
    expect(JSON.parse(h.requests[0]!.body!)).toMatchObject({ provider: 'apns', key_id: 'ABCDE12345', team_id: 'TEAM123456', environment: 'production', p8: p8.trim() });
    const printed = h.out.join('') + h.err.join('');
    expect(JSON.parse(h.out.join(''))).toMatchObject({ channel: 'ios_push', saved: true, ok: true, status: 'active' });
    expect(printed).not.toContain('PRIVATE KEY');
    expect(printed).not.toContain(p8.split('\n')[1]!);
    expect(printed).not.toContain(env.PUSHIZO_API_KEY);
  });

  it('doğrulama başarısızsa 1 döner ve yankılanan sır arındırılır', async () => {
    const h = channelHarness([
      { status: 200, body: {} },
      { status: 200, body: { ok: false, kind: 'auth', code: 'invalid_client', message: `bad secret ${secret}`, channel: { status: 'invalid' } } },
    ]);
    expect(await run(['channels', 'hms', '--hms-app-id', '123456789', '--client-secret-file', 'secret.txt'], env, h.io)).toBe(1);
    expect(JSON.parse(h.out.join(''))).toMatchObject({ status: 'invalid', error_code: 'invalid_client', message: 'bad secret [redacted]' });
    expect(h.out.join('')).not.toContain(secret);
  });

  it('kök dışındaki dosya, bilinmeyen seçenek ve sır değeri alan bayrak reddedilir; istek atılmaz', async () => {
    const outside = channelHarness([]);
    expect(await run(['channels', 'apns', '--key-file', '../AuthKey_ABCDE12345.p8', '--team-id', 'TEAM123456', '--bundle-id', 'a.b.c', '--environment', 'sandbox'], env, outside.io)).toBe(1);
    expect(outside.err.join('')).toContain('PATH_OUTSIDE_ROOT');
    const unknown = channelHarness([]);
    expect(await run(['channels', 'hms', '--hms-app-id', '123456789', '--client-secret', secret], env, unknown.io)).toBe(1);
    expect(unknown.err.join('')).toContain('--client-secret');
    expect(unknown.err.join('')).not.toContain(secret);
    const usage = channelHarness([]);
    expect(await run(['channels', 'telegram'], env, usage.io)).toBe(1);
    expect(outside.requests.length + unknown.requests.length + usage.requests.length).toBe(0);
  });
});
