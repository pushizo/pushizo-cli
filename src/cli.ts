/**
 * `pushizo` komutunun gövdesi: argümanları yorumlar, public API'yi çağırır, JSON yazdırır ve çıkış kodu döner.
 * Giriş noktası (`index.ts`) yalnızca süreç bağlamını verir; bu ayrım birim testlerini sürece dokunmadan mümkün kılar.
 * API anahtarı hiçbir çıktıya yazılmaz.
 */
import { readFileSync } from 'node:fs';

export const DEFAULT_API_URL = 'https://api.pushizo.com';

export const VERSION: string = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version;

export interface CliIo {
  out(text: string): void;
  err(text: string): void;
  fetch: typeof fetch;
}

export const HELP = `Pushizo CLI ${VERSION}

Usage:
  pushizo apps                      List apps
  pushizo segments                  List segments of PUSHIZO_APP_ID
  pushizo templates                 List templates of PUSHIZO_APP_ID
  pushizo send "<title>" "<body>"   Send a notification to subscribed users of PUSHIZO_APP_ID
  pushizo --help | --version

Environment:
  PUSHIZO_API_KEY   App or organization API key (required; never printed)
  PUSHIZO_APP_ID    App id for segments, templates and send
  PUSHIZO_API_URL   API base URL (default ${DEFAULT_API_URL})

Türkçe: komutlar aynıdır. apps → app listesi, segments → segmentler, templates → şablonlar,
send "<başlık>" "<gövde>" → abone kullanıcılara bildirim. Ortam değişkenleri yukarıdaki gibidir; anahtar çıktıya yazılmaz.

Docs: https://docs.pushizo.com/docs/integrations/cli-sdks
`;

class CliError extends Error {}

export async function run(
  argv: string[],
  env: Record<string, string | undefined>,
  io: CliIo,
): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    io.out(HELP);
    return command ? 0 : 1;
  }
  if (command === 'version' || command === '--version' || command === '-v') {
    io.out(`${VERSION}\n`);
    return 0;
  }

  const apiUrl = (env.PUSHIZO_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
  const key = env.PUSHIZO_API_KEY ?? '';
  const appId = env.PUSHIZO_APP_ID ?? '';

  const needApp = (): string => {
    if (!appId) throw new CliError('PUSHIZO_APP_ID is required · PUSHIZO_APP_ID gerekli.');
    return appId;
  };

  const call = async (method: string, path: string, body?: unknown): Promise<unknown> => {
    if (!key) throw new CliError('PUSHIZO_API_KEY is required · PUSHIZO_API_KEY gerekli.');
    let res: Response;
    try {
      res = await io.fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${key}`,
          accept: 'application/json',
          'user-agent': `pushizo-cli/${VERSION}`,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      throw new CliError(
        `Network error · Ağ hatası: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const text = await res.text();
    if (!res.ok) throw new CliError(`HTTP ${res.status}: ${text.slice(0, 500)}`);
    return text ? (JSON.parse(text) as unknown) : {};
  };

  const print = (value: unknown) => io.out(`${JSON.stringify(value, null, 2)}\n`);

  try {
    switch (command) {
      case 'apps':
        print(await call('GET', '/v1/apps'));
        return 0;
      case 'segments':
        print(await call('GET', `/v1/apps/${encodeURIComponent(needApp())}/segments`));
        return 0;
      case 'templates':
        print(await call('GET', `/v1/apps/${encodeURIComponent(needApp())}/templates`));
        return 0;
      case 'send': {
        const title = rest[0];
        const text = rest.slice(1).join(' ');
        if (!title || !text) throw new CliError('Usage · Kullanım: pushizo send "<title>" "<body>"');
        print(
          await call('POST', '/v1/notifications', {
            app_id: needApp(),
            target: { included_segments: ['Subscribed Users'] },
            headings: { en: title, tr: title },
            contents: { en: text, tr: text },
          }),
        );
        return 0;
      }
      default:
        io.err(`Unknown command · Bilinmeyen komut: ${command}\n\n${HELP}`);
        return 1;
    }
  } catch (error) {
    if (error instanceof CliError) {
      io.err(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
}
