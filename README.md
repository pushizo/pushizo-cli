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

**Pushizo CLI** — The `pushizo` command for scripts and terminals. Lists apps, segments and templates as JSON, sends a notification to subscribed users, and uploads push credentials from a file (`pushizo channels`) without printing their contents. Reads PUSHIZO_API_KEY, PUSHIZO_APP_ID and PUSHIZO_API_URL from the environment; the key is never printed. Node.js 20+, no dependencies.

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
bildirim gönderir; push anahtarlarını dosyadan yükler ve doğrular. Node.js 20+; bağımlılığı yoktur.

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
| `PUSHIZO_CREDENTIALS_DIR` | `channels` komutunun anahtar dosyalarını okuyabileceği dizin (varsayılan: bulunduğunuz dizin) |

Anahtarı komut satırı argümanı olarak vermeyin; kabuk geçmişine düşer. Ortam değişkeni veya gizli bilgi yöneticisi
kullanın.

## Komutlar

```bash
pushizo apps                         # app listesi
pushizo segments                     # PUSHIZO_APP_ID segmentleri
pushizo templates                    # PUSHIZO_APP_ID şablonları
pushizo send "Başlık" "Gövde metni"  # "Subscribed Users" segmentine bildirim (en + tr aynı metin)
pushizo channels status              # kanal başına sağlayıcı ve durum
pushizo --version
```

Çıktı biçimlendirilmiş JSON'dur; `jq` ile işlenebilir:

```bash
pushizo segments | jq -r '.data[].name'
```

Çıkış kodu başarıda `0`, eksik ayar, ağ veya HTTP hatasında `1`'dir; hata ayrıntısı standart hataya yazılır.

## Push anahtarını dosyadan yükleme

`pushizo channels <kanal>` anahtarı dosyadan okur, yükler ve sağlayıcıya doğrulatır. `admin` kapsamlı anahtar ister.

```bash
pushizo channels apns --key-file AuthKey_ABCDE12345.p8 --team-id TEAM123456 --bundle-id com.ornek.app --environment production
pushizo channels apns --key-file sertifika.p12 --p12-password-env P12_PAROLA
pushizo channels fcm --key-file firebase-servis-hesabi.json
pushizo channels hms --hms-app-id 123456789 --client-secret-env HMS_CLIENT_SECRET
pushizo channels adm --client-id amzn1.application-oa2-client.x --client-secret-file adm-secret.txt
pushizo channels wns --package-sid ms-app://s-1-15-2-x --client-secret-file wns-secret.txt
pushizo channels webpush --subject mailto:siz@ornek.com --site-url https://ornek.com
```

- `.p8` dosyasında Key ID `AuthKey_XXXXXXXXXX.p8` adından okunur; ad farklıysa `--key-id` verin.
- Sır değeri alan seçenek yoktur: `client_secret` ve `.p12` parolası dosya yolu (`--…-file`) ya da ortam değişkeni
  adı (`--…-env`) ile verilir; böylece kabuk geçmişine düşmez.
- Dosyalar bulunduğunuz dizinin (ya da `PUSHIZO_CREDENTIALS_DIR`) altında olmalıdır; `..`, mutlak yol ve sembolik bağ
  ile dışarı çıkış reddedilir. Anahtar dosyası en çok 64 KB, metin sırrı 4 KB olabilir.
- Çıktı yalnız durumdur (`saved`, `ok`, `status`, `error_code`, `hint`, dosya adı, boyutu ve SHA-256 parmak izinin ilk
  12 hanesi). Dosya içeriği ve sırlar yazdırılmaz. Doğrulama geçerse çıkış kodu `0`, geçmezse `1`'dir.

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
