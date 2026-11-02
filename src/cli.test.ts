import { describe, expect, it, vi } from 'vitest';
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
