/**
 * `pushizo` komutunun gövdesi: argümanları yorumlar, public API'yi çağırır, JSON yazdırır ve çıkış kodu döner.
 * Giriş noktası (`index.ts`) yalnızca süreç bağlamını verir; bu ayrım birim testlerini sürece dokunmadan mümkün kılar.
 * API anahtarı hiçbir çıktıya yazılmaz.
 */
import { readFileSync } from 'node:fs';
import { CredentialError, UPLOAD_CHANNELS, uploadChannelCredentials, type ApiCall, type CredentialInput, type UploadChannel } from './credential-files.js';

export const DEFAULT_API_URL = 'https://api.pushizo.com';

export const VERSION: string = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version;

export interface CliIo {
  out(text: string): void;
  err(text: string): void;
  fetch: typeof fetch;
  /** `channels` komutunun dosya okuyabileceği kök dizin (varsayılan: `PUSHIZO_CREDENTIALS_DIR`, yoksa çalışma dizini). */
  cwd?: string;
}

export const HELP = `Pushizo CLI ${VERSION}

Usage:
  pushizo apps                      List apps
  pushizo segments                  List segments of PUSHIZO_APP_ID
  pushizo templates                 List templates of PUSHIZO_APP_ID
  pushizo send "<title>" "<body>"   Send a notification to subscribed users of PUSHIZO_APP_ID
  pushizo channels status           Provider and status per channel of PUSHIZO_APP_ID
  pushizo channels <apns|fcm|hms|adm|wns|webpush> [options]
                                    Upload push credentials from a file and validate them
  pushizo --help | --version

Channel options (file paths are read by this process; contents are never printed):
  apns      --key-file AuthKey_XXXXXXXXXX.p8 --team-id <id> --bundle-id <id> --environment <sandbox|production> [--key-id <id>]
            --key-file cert.p12 [--p12-password-file <path> | --p12-password-env <NAME>] [--bundle-id <id>]
  fcm       --key-file service-account.json [--confirm-project-change]
  hms       --hms-app-id <id> (--client-secret-file <path> | --client-secret-env <NAME>) [--high-priority]
  adm       --client-id <id> (--client-secret-file <path> | --client-secret-env <NAME>)
  wns       --package-sid <sid> (--client-secret-file <path> | --client-secret-env <NAME>)
  webpush   --subject <mailto:…|https://…> [--site-url <url>]
            [--vapid-public-key <key> (--vapid-private-key-file <path> | --vapid-private-key-env <NAME>)]
  Files must be inside the current directory (or PUSHIZO_CREDENTIALS_DIR). Needs an API key with the admin scope.

Environment:
  PUSHIZO_API_KEY   App or organization API key (required; never printed)
  PUSHIZO_APP_ID    App id for segments, templates and send
  PUSHIZO_API_URL   API base URL (default ${DEFAULT_API_URL})
  PUSHIZO_CREDENTIALS_DIR   Directory key files may be read from (default: current directory)

Türkçe: komutlar aynıdır. apps → app listesi, segments → segmentler, templates → şablonlar,
send "<başlık>" "<gövde>" → abone kullanıcılara bildirim. channels status → kanal durumları;
channels <kanal> → push anahtarını dosyadan yükler ve doğrular: dosyayı bu süreç okur, içerik ve sırlar çıktıya
yazılmaz, yalnız durum döner. Dosyalar bulunduğunuz dizinin (ya da PUSHIZO_CREDENTIALS_DIR) altında olmalıdır.
Ortam değişkenleri yukarıdaki gibidir; anahtar çıktıya yazılmaz.

Docs: https://docs.pushizo.com/docs/integrations/cli-sdks
`;

class CliError extends Error {}

const CHANNEL_VALUE_FLAGS = [
  'key-file', 'key-id', 'team-id', 'bundle-id', 'environment', 'p12-password-file', 'p12-password-env', 'hms-app-id', 'client-id', 'package-sid',
  'client-secret-file', 'client-secret-env', 'subject', 'site-url', 'vapid-public-key', 'vapid-private-key-file', 'vapid-private-key-env',
] as const;
const CHANNEL_BOOLEAN_FLAGS = ['confirm-project-change', 'high-priority'] as const;

/** `--key-file x --team-id y` → `{ key_file: 'x', team_id: 'y' }`. Sır değeri alan bayrak yoktur (yalnız yol ya da değişken adı). */
function parseChannelFlags(channel: UploadChannel, args: string[]): CredentialInput {
  const input: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    const name = arg.startsWith('--') ? arg.slice(2) : '';
    if ((CHANNEL_BOOLEAN_FLAGS as readonly string[]).includes(name)) {
      input[name.replaceAll('-', '_')] = true;
    } else if ((CHANNEL_VALUE_FLAGS as readonly string[]).includes(name)) {
      const value = args[i + 1];
      if (value === undefined || value.startsWith('--')) throw new CliError(`Missing value · Değer gerekli: ${arg}`);
      input[name.replaceAll('-', '_')] = value;
      i += 1;
    } else {
      throw new CliError(`Unknown option · Bilinmeyen seçenek: ${arg}`);
    }
  }
  if (input.environment !== undefined && input.environment !== 'sandbox' && input.environment !== 'production')
    throw new CliError('--environment must be sandbox or production · --environment sandbox ya da production olmalı.');
  return { ...(input as Omit<CredentialInput, 'channel'>), channel };
}

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
      case 'channels': {
        const target = rest[0];
        if (target === 'status') {
          print(await call('GET', `/v1/apps/${encodeURIComponent(needApp())}/channels/status`));
          return 0;
        }
        if (!target || !(UPLOAD_CHANNELS as readonly string[]).includes(target))
          throw new CliError(`Usage · Kullanım: pushizo channels <status|${UPLOAD_CHANNELS.join('|')}> [options]`);
        const input = parseChannelFlags(target as UploadChannel, rest.slice(1));
        if (!key) throw new CliError('PUSHIZO_API_KEY is required · PUSHIZO_API_KEY gerekli.');
        // Hata gövdesi ham yazdırılmaz: durum kodu ve gövde ortak modüle verilir, o sırlardan arındırıp özetler.
        const apiCall: ApiCall = async (method, path, body) => {
          let res: Response;
          try {
            res = await io.fetch(`${apiUrl}${path}`, {
              method,
              headers: {
                authorization: `Bearer ${key}`,
                accept: 'application/json',
                'user-agent': `pushizo-cli/${VERSION}`,
                ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
              },
              ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            });
          } catch (error) {
            throw new CliError(`Network error · Ağ hatası: ${error instanceof Error ? error.message : String(error)}`);
          }
          const text = await res.text();
          let json: unknown;
          try {
            json = text ? (JSON.parse(text) as unknown) : null;
          } catch {
            json = null;
          }
          return { status: res.status, json };
        };
        const result = await uploadChannelCredentials(input, needApp(), { rootDir: env.PUSHIZO_CREDENTIALS_DIR?.trim() || io.cwd || process.cwd(), env }, apiCall);
        print(result);
        return result.ok ? 0 : 1;
      }
      default:
        io.err(`Unknown command · Bilinmeyen komut: ${command}\n\n${HELP}`);
        return 1;
    }
  } catch (error) {
    if (error instanceof CredentialError) {
      io.err(`${error.code}: ${error.message}\n`);
      return 1;
    }
    if (error instanceof CliError) {
      io.err(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
}
