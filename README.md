<!-- pushizo:header -->
<p align="center">
  <a href="https://pushizo.com"><img src="https://raw.githubusercontent.com/pushizo/.github/main/profile/assets/mark.svg" alt="Pushizo" width="56" height="56"></a>
</p>
<p align="center">
  <a href="https://docs.pushizo.com/docs/integrations/cli-sdks"><img src="https://img.shields.io/badge/docs-docs.pushizo.com-5b4bdb" alt="Docs"></a>
  <a href="https://docs.pushizo.com/docs/api"><img src="https://img.shields.io/badge/API-reference-b44fc4" alt="API reference"></a>
  <a href="https://github.com/pushizo/pushizo-cli/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-16130f" alt="License: MIT"></a>
</p>
<p align="center"><a href="#english">English</a> · <a href="#türkçe">Türkçe</a></p>

## English

**Pushizo CLI** — The `pushizo` command for scripts and terminals. Lists apps, segments and templates as JSON and sends a notification to subscribed users. Reads PUSHIZO_API_KEY, PUSHIZO_APP_ID and PUSHIZO_API_URL from the environment; the key is never printed. Node.js 20+, no dependencies.

> **Status:** @pushizo/cli 0.1.0 is not on npm yet; until then you can install the release archive from this repository.<br>
> **Durum:** @pushizo/cli 0.1.0 henüz npm'de değil; o zamana kadar bu deponun sürüm arşivinden kurabilirsiniz.

**Install from GitHub until then · O zamana kadar GitHub'dan kurulum:**

```bash
npm install -g --allow-remote=root https://github.com/pushizo/pushizo-cli/releases/download/v0.1.0/pushizo-cli-0.1.0.tgz
pushizo --help
```

**After publication · Yayından sonra:**

```bash
npm install -g @pushizo/cli
pushizo --help
```

The detailed guide below is in Turkish; code samples are language-neutral. Full documentation:
[docs.pushizo.com/docs/integrations/cli-sdks](https://docs.pushizo.com/docs/integrations/cli-sdks) · API reference: [docs.pushizo.com/docs/api](https://docs.pushizo.com/docs/api).

## Türkçe
<!-- /pushizo:header -->

# Pushizo CLI

Betikler ve terminal için `pushizo` komutu. App, segment ve şablonları JSON olarak listeler; abone kullanıcılara
bildirim gönderir. Node.js 20+; bağımlılığı yoktur.

## Kurulum

```bash
npm install -g @pushizo/cli
pushizo --help
```

Kurmadan çalıştırmak için: `npx @pushizo/cli --help`.

## Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `PUSHIZO_API_KEY` | App veya organizasyon API anahtarı (zorunlu). Çıktıya ve hata mesajlarına yazılmaz. |
| `PUSHIZO_APP_ID` | `segments`, `templates` ve `send` için app kimliği |
| `PUSHIZO_API_URL` | API adresi (varsayılan `https://api.pushizo.com`; yerelde `http://localhost:4000`) |

Anahtarı komut satırı argümanı olarak vermeyin; kabuk geçmişine düşer. Ortam değişkeni veya gizli bilgi yöneticisi
kullanın.

## Komutlar

```bash
pushizo apps                         # app listesi
pushizo segments                     # PUSHIZO_APP_ID segmentleri
pushizo templates                    # PUSHIZO_APP_ID şablonları
pushizo send "Başlık" "Gövde metni"  # "Subscribed Users" segmentine bildirim (en + tr aynı metin)
pushizo --version
```

Çıktı biçimlendirilmiş JSON'dur; `jq` ile işlenebilir:

```bash
pushizo segments | jq -r '.data[].name'
```

Çıkış kodu başarıda `0`, eksik ayar, ağ veya HTTP hatasında `1`'dir; hata ayrıntısı standart hataya yazılır.

Daha geniş kullanım (kullanıcılar, kampanyalar, analitik) için sunucu SDK'larını veya REST API'yi kullanın:
[docs.pushizo.com/docs/api](https://docs.pushizo.com/docs/api).

<!-- pushizo:footer -->
---

## Support · Destek

- **Guide · Rehber:** [docs.pushizo.com/docs/integrations/cli-sdks](https://docs.pushizo.com/docs/integrations/cli-sdks)
- **API reference & OpenAPI · API referansı ve OpenAPI:** [docs.pushizo.com/docs/api](https://docs.pushizo.com/docs/api) ·
  [pushizo-openapi](https://github.com/pushizo/pushizo-openapi)
- **Bugs & ideas · Hata ve öneri:** [Issues](https://github.com/pushizo/pushizo-cli/issues)
- **Security · Güvenlik:** please do not open public issues; email [security@pushizo.com](mailto:security@pushizo.com) ·
  herkese açık issue açmayın, bu adrese yazın.
- **Help · Destek:** [support@pushizo.com](mailto:support@pushizo.com)

This repository is mirrored automatically from the Pushizo main repository on every release. Please open an issue
instead of a pull request; fixes land in the main repository and ship with the next release.
Bu depo her sürümde Pushizo ana deposundan otomatik yansıtılır. Pull request yerine issue açın; düzeltmeler ana depoda
yapılır ve bir sonraki sürümle buraya gelir.

Released under the MIT License · MIT lisanslıdır — [LICENSE](https://github.com/pushizo/pushizo-cli/blob/main/LICENSE).
<!-- /pushizo:footer -->
