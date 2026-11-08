# İstekYap

Canlı müzik gecelerinde dinleyicilerin telefondan şarkı isteyip çalınanları oylayabildiği web sitesi. Ekip, şifreli bir dashboard'dan istekleri canlı görür, onaylar, çalar ve gecenin istatistiklerini takip eder.

Uygulamanın kullanıcı gözünden anlatımı (nasıl anlatılır, SSS, gece akışı): [İstekYap — Uygulama Dokümanı](https://claude.ai/artifact/KMDDbuxjG6fDT9aHLzCFbV)

## Neler var

**Ziyaretçi sayfası (`/`)**
- Spotify'da şarkı arama ve istek gönderme; aynı şarkıyı isteyenler sayılır (×3)
- Canlı istek listesi ve "şu an çalan" kartı
- Şarkı sözleri (LRCLIB), çalınan şarkılara 👍 / 👎, yorum ve puan

**Dashboard (`/dashboard`, giriş gerekli)**
- İstekler: onayla, reddet, sil, çal
- Playlist: şarkı başına beğeniler, filtre ve sıralama
- İstatistik: bu gece / tüm zamanlar, saat saat istekler, en çok istenen / beğenilen / çalınan, geçmiş geceler
- Yorumlar
- Sistem: istek alma, oylama, playlist görünürlüğü; listeyi arşivle (geri alınabilir), sıfırlama butonları

## Teknik yapı

| Parça | Görevi |
| --- | --- |
| Next.js 16 (App Router) | Sayfalar ve API route'ları |
| Vercel (Hobby) | Yayın |
| Supabase Postgres | İstekler, oylar, yorumlar, çalma ve oy geçmişi |
| Supabase Auth | Dashboard girişi (e-posta + şifre) |
| Supabase Realtime (Broadcast) | "Liste değişti" sinyali, `istek-yap` kanalı |
| Spotify Web API | Şarkı arama ve playlist |
| LRCLIB | Şarkı sözleri (anahtar istemez) |

Akış: Telefon `/api/requests`'e istek atar → sunucu veritabanına yazar → Realtime kanalına `changed` sinyali gönderir → açık sayfalar listeyi yeniden çeker. Canlı bağlantı varken sayfalar sadece dakikada bir yedek kontrol yapar, bağlantı koparsa 5–10 saniyelik yoklamaya döner. Arka plandaki sekme hiç istek atmaz.

## Kurulum

```bash
npm install
```

`.env.local` dosyasını oluştur (değerleri asla commit'leme):

| Değişken | Nereden |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > API Keys (publishable) |
| `SUPABASE_SECRET_KEY` | Supabase > API Keys (secret) — sadece sunucuda kullanılır |
| `SPOTIFY_CLIENT_ID` | Spotify Developer Dashboard |
| `SPOTIFY_CLIENT_SECRET` | Spotify Developer Dashboard |
| `SPOTIFY_REDIRECT_URI` | Spotify uygulamasına eklenen callback, örn. `http://127.0.0.1:3000/api/auth/callback` |
| `SPOTIFY_REFRESH_TOKEN` | Aşağıdaki "Spotify token" adımı |
| `SPOTIFY_PLAYLIST_ID` | Playlist linkindeki ID |

**Spotify token:** Geliştirme sunucusu açıkken `/api/auth/login` adresine git, Spotify'da izin ver; callback sayfası `refresh_token`'ı gösterir. Onu `SPOTIFY_REFRESH_TOKEN` olarak kaydet.

**Dashboard kullanıcısı:** Supabase > Authentication > Users'tan e-posta ve şifreyle eklenir. Sitede kayıt ekranı yoktur.

```bash
npm run dev
```

http://localhost:3000 ziyaretçi sayfası, http://localhost:3000/dashboard yönetim paneli.

## Veritabanı

Temel tablolar Supabase panelinden oluşturuldu ve repoda SQL dosyası olarak yok:

| Tablo | Sütunlar |
| --- | --- |
| `requests` | id, spotify_id, name, artists, cover, status (`pending` / `approved` / `played` / `rejected`), created_at |
| `app_state` | id (tek satır, 1), requests_open, voting_open, playlist_visible, now_playing, now_playing_title, now_playing_cover, now_playing_since, updated_at |
| `song_votes` | spotify_id, device_id, value (1 / -1), updated_at |
| `song_vote_counts` | view: spotify_id, likes, dislikes |
| `played_songs` | spotify_id, played_at |
| `comments` | id, rating, message, name, created_at |

Sonradan eklenenler yerel `supabase/` klasöründe durur. Klasör `.gitignore`'da olduğu için repoda yoktur; dosyaları proje sahibinden al. SQL Editor'de **bu sırayla** çalıştırılır (hepsi tekrar çalıştırılabilir):

1. `supabase/istek-sayaci.sql` — istek sayacı, arşiv, `request_devices`, `make_request()` fonksiyonu
2. `supabase/istek-sayaci-2.sql` — `last_requested_at` (1. dosyanın yeni hali bunu zaten içerir; eski kurulumlar için)
3. `supabase/istatistik.sql` — `play_history`, `vote_history`, `archive_votes()` fonksiyonu

Tarayıcı veritabanına doğrudan yazmaz; tüm okuma ve yazmalar sunucu (`SUPABASE_SECRET_KEY`) üzerinden geçer. Tarayıcı publishable key'i sadece Realtime kanalını dinlemek için kullanır.

## Klasörler

```text
app/
  page.tsx                 ziyaretçi sayfası
  dashboard/               yönetim paneli
  login/                   dashboard girişi
  api/
    requests/  search/  votes/  comments/  lyrics/  state/  playlist/   herkese açık API
    dashboard/ (requests, songs, stats, system, comments)              giriş gerektiren API
    auth/                  Spotify refresh token alma
  components/              arayüz bileşenleri (dashboard/ altında panel bileşenleri)
lib/
  rate-limit.ts            cihaz + IP başına hız sınırı
  device.ts                ziyaretçiyi tanıyan çerez
  live-server.ts / live-client.ts   Realtime sinyali
  lrclib.ts                şarkı sözleri
  stats.ts                 istatistik hesabı
  spotify.ts / search.ts   Spotify erişimi
proxy.ts                   /dashboard ve /api/dashboard için giriş kontrolü
scripts/load-test.mjs      yük testi
supabase/                  veritabanı ek SQL dosyaları (yerelde, git'e girmez)
```

## Kurallar ve limitler

| Kural | Sınır |
| --- | --- |
| İstek | Cihaz başına 10 dakikada 5 (aynı IP'ye 100) |
| Arama | Cihaz başına dakikada 30 (aynı IP'ye 300) |
| Yorum | Cihaz başına 10 dakikada 3 (aynı IP'ye 60) |
| Aynı şarkı | Bir cihaz sayacı bir kez artırır |

Hız sınırları sunucu belleğinde tutulur; Vercel'de her sunucu örneği kendi sayacını tutar.

Ücretsiz planlar: Supabase Realtime 200 eşzamanlı bağlantı, 500 MB veritabanı, 7 gün kullanılmazsa proje durur. Vercel Hobby ayda 1 milyon istek. 30 kişiyle yapılan yük testinde dakikada ~110 sunucu isteği ölçüldü.

## Yük testi

```bash
node scripts/load-test.mjs --url http://localhost:3000 --users 30 --seconds 120
```

`--write` gerçek istek gönderir (veritabanına yazar), `--spread-ip` farklı IP'leri taklit eder, `--no-live` Realtime yokmuş gibi sık yoklama yapar.
