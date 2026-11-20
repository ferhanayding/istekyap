# İstekYap

Canlı müzik gecelerinde dinleyicilerin telefondan şarkı isteyip çalınanları oylayabildiği web sitesi. Ekip, şifreli bir dashboard'dan istekleri canlı görür, onaylar, çalar ve gecenin istatistiklerini takip eder.

Uygulamanın kullanıcı gözünden anlatımı (nasıl anlatılır, SSS, gece akışı): [İstekYap — Uygulama Dokümanı](https://claude.ai/artifact/KMDDbuxjG6fDT9aHLzCFbV)

## Neler var

**Ziyaretçi sayfası (`/`)**
- Spotify'da şarkı arama ve istek gönderme; playlistteki ve eski isteklerdeki şarkılar da "İste"ye dokunarak istenir; aynı şarkıyı isteyenler sayılır (×3)
- **İsteğe not**: istek gitmeden önce küçük bir kutu açılır, isteyen en fazla 50 karakterlik bir not yazabilir ("Kime ya da neden?", örn. "Ayşe'nin doğum günü 🎂"). Not küfür ve link filtresinden geçer, sadece dashboard'da isteğin altında görünür. Kutu, yanlışlıkla dokununca istek hakkının boşa gitmesini de önler
- İstek listesi iki sekme: **Bu gece** (canlı) ve **Eski istekler** (bugüne kadar istenen her şarkı: kaç kez istendi, çalındı, beğenildi; buradan da istenebilir)
- Şarkı sözleri (LRCLIB) ve her şarkı kartında 👍 / 👎. Sayılar bugüne kadarki toplamdır, gece bitince kaybolmaz; oy sadece bu gece çalınan şarkıya verilebilir (çalınmamışta dokununca neden yazar)
- **Yorumlar** sekmesi: herkesin yorumu ve ortalama puan. Küfür/hakaret (Türkçe, Azerbaycanca, İngilizce; `lib/blocklist.ts`) ve link içeren yorumlar gönderilemez; listeye takılan eski yorumlar da gösterilmez. Dashboard'dan silinen yorum herkesten anında kalkar. Yorum filtresi (`isBlockedComment`) şarkı filtresinden (`isBlocked`) biraz daha sıkıdır: şarkı adlarında masum geçen kelimeler ("Moby Dick", "Cock Robin") sadece yorumlarda engellenir
- Dil seçeneği: Türkçe (varsayılan), English, Azərbaycanca. "Yorum yap"ın yanındaki düğmeden seçilir, telefonda hatırlanır. Çeviriler `lib/i18n-dict.ts`'te (anahtar metnin Türkçesi); dashboard hep Türkçe
- Gece kapalıyken en üstte "Canlı müzik başlayınca istek yapma ve oy verme açılacak" uyarısı ve başlığın altında grubun Instagram'ı büyük bir kutuda ("Bizi Instagram'da takip edebilirsiniz 😃"). Gece açılınca kutu kalkar, başlıktaki küçük Instagram düğmesi geri gelir
- Link paylaşılınca (WhatsApp, Instagram, X) önizleme görseli çıkar: `app/opengraph-image.tsx`, derlemede bir kez üretilir

**Dashboard (`/dashboard`, giriş gerekli)**
- İstekler: onayla, reddet, sil, çal. İsteyenlerin notları kartın altında; "Ben de" diyen biri not yazınca istek yeni gelmiş gibi vurgulanır ve ses çalar
- **Gecenin Instagram kartı**: Sistem'de gece bitince, İstatistik'te "Bu gece / Son gece" altında. Hikâye boyutunda (1080×1920) görsel: tarih, kaç şarkı çalındı, kaç istek, kaç kişi, kaç beğeni, en çok istenen ve en çok beğenilen şarkı. Telefonda "Paylaş" ile doğrudan Instagram'a, bilgisayarda "İndir"
- Playlist: şarkı başına bugüne kadarki beğeni/beğenmeme (sitede görünenle aynı; gecelik döküm İstatistik'te), filtre ve sıralama
- İstatistik: bu gece / tüm zamanlar, saat saat istekler, en çok istenen / beğenilen / çalınan, geçmiş geceler
- Yorumlar
- Sistem: tek buton **Geceyi başlat / Geceyi bitir**, altında elle değiştirilebilen anahtarlar (istek alma, oylama, playlist), "Gelişmiş" altında kalıcı silme butonları

**Gece akışı**
- *Geceyi başlat*: istek ve oylama açılır. Önceki geceden kalanlar (liste, "çalındı" işaretleri) ziyaretçinin ekranından kalkar, istatistikte kalır. Oylar oy geçmişine taşınır: beğeni toplamları görünmeye devam eder, herkes yeni gecede yeniden oy verebilir. "Bu gece" istatistiği bu andan sayılır.
- *Geceyi bitir*: istek ve oylama kapanır, çalan şarkı durur, bu gecenin istekleri arşive gider (Eski istekler'de ve istatistikte "Son gece" olarak kalır), playlistteki "Çalındı" işaretleri kalkar. 10 dakika içinde geri alınabilir: sadece o bitişte arşivlenen istekler ve o gecenin "çalındı" işaretleri geri gelir; istek alma ve oylama bitirmeden önceki hâline döner (`supabase/gece-geri-alma.sql` gerekir, yoksa ikisi de açılır).

## Teknik yapı

| Parça | Görevi |
| --- | --- |
| Next.js 16 (App Router) | Sayfalar ve API route'ları |
| Vercel (Hobby) | Yayın. Sunucu fonksiyonları Frankfurt'ta (`vercel.json` → `fra1`), Supabase ile aynı bölgede |
| Supabase Postgres | İstekler, oylar, yorumlar, çalma ve oy geçmişi |
| Supabase Auth | Dashboard girişi (e-posta + şifre) |
| Supabase Realtime (Broadcast) | "Liste değişti" sinyali, `istek-yap` kanalı |
| Spotify Web API | Şarkı arama ve playlist |
| LRCLIB | Şarkı sözleri (anahtar istemez) |
| Google Fonts | Paylaşım görsellerinin yazı tipi (`lib/og.tsx`: sadece görseldeki harfler indirilir, alınamazsa görsel varsayılan yazı tipiyle çıkar) |

Akış: Telefon `/api/requests`'e istek atar → sunucu veritabanına yazar → Realtime kanalına `changed` sinyali (`v` sürüm numarasıyla) gönderir → açık sayfalar ve dashboard listeyi `?v=` ile yeniden çeker; aynı `v`'yi isteyen herkese Vercel CDN tek cevap verir. Canlı bağlantı varken sayfalar sadece dakikada bir yedek kontrol yapar, bağlantı koparsa 5–10 saniyelik yoklamaya döner. Arka plandaki sekme hiç istek atmaz (dashboard hariç: yeni istek sesi için).

Hız için:
- Ana sayfa tamamen hazır (statik) HTML'dir. Spotify playlist'i (`lib/playlist.ts`) ve istek/oylama/playlist anahtarları (`lib/app-flags.ts`) bu HTML'e gömülür: playlist en geç 2 dakikada bir, anahtarlar dashboard'dan değişince hemen yenilenir.
- İlk veriler (`/api/state`, `/api/requests`, `/api/votes`) JS yüklenir yüklenmez istenir (`lib/early-fetch.ts`), Realtime kütüphanesi sayfa açıldıktan sonra ayrı yüklenir.
- Dashboard API'leri girişi `getClaims` ile sunucuda doğrular (Supabase'e ayrıca gitmez).

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
| `app_state` | id (tek satır, 1), night_open, night_started_at, night_ended_at, requests_open, voting_open, playlist_visible, now_playing, now_playing_title, now_playing_cover, now_playing_since, updated_at |
| `song_votes` | spotify_id, device_id, value (1 / -1), updated_at |
| `song_vote_counts` | view: spotify_id, likes, dislikes |
| `played_songs` | spotify_id, played_at |
| `comments` | id, rating, message, name, created_at |

Sonradan eklenenler yerel `supabase/` klasöründe durur. Klasör `.gitignore`'da olduğu için repoda yoktur; dosyaları proje sahibinden al. SQL Editor'de **bu sırayla** çalıştırılır (hepsi tekrar çalıştırılabilir):

1. `supabase/istek-sayaci.sql` — istek sayacı, arşiv, `request_devices`, `make_request()` fonksiyonu
2. `supabase/istek-sayaci-2.sql` — `last_requested_at` (1. dosyanın yeni hali bunu zaten içerir; eski kurulumlar için)
3. `supabase/istatistik.sql` — `play_history`, `vote_history`, `archive_votes()` fonksiyonu
4. `supabase/gece.sql` — `night_open`, `night_started_at`, `night_ended_at` (Geceyi başlat/bitir)
5. `supabase/istek-siniri.sql` — `request_limit`, `request_window_min` (dashboard'dan ayarlanan istek sınırı)
6. `supabase/istek-kilidi.sql` — `make_request_limited()`: sınır veritabanında, cihaza özel kilit altında sayılır (aynı anda giden iki istek ikisi birden geçemez). Çalıştırılmadıysa eski `make_request()` kullanılır
7. `supabase/yeni-ozellikler.sql` — `next_show` ("Sonraki sahne" yazısı) ve `polls`, `poll_votes` ("Sıradaki şarkıyı siz seçin" anketi). Çalıştırılmadıysa bu iki özellik kapalı kalır, gerisi çalışır
8. `supabase/notlar.sql` — `song_notes` (dashboard'da sözlerin üstündeki şarkı notları)
9. `supabase/oy-toplamlari.sql` — `song_vote_totals` görünümü: şarkı başına bugüne kadarki beğeni/beğenmeme tek sorguda. Çalıştırılmadıysa toplam `vote_history` + `song_vote_counts`'tan uygulamada hesaplanır
10. `supabase/gece-geri-alma.sql` — `end_requests_open`, `end_voting_open`: "Geceyi bitir" geri alınınca istek alma ve oylama bitirmeden önceki hâline döner. Çalıştırılmadıysa geri alınca ikisi de açılır
11. `supabase/istek-notu.sql` — `request_devices.note`: isteğe eklenen not (en fazla 50 karakter, isteyen her cihazın notu ayrı). Çalıştırılmadıysa istekler yine gider, sadece notlar kaydedilmez

### Ziyaretçi tarafındaki küçük özellikler

- **Ben de**: bu geceki listede bekleyen/çalınacak isteğe katılma (istek hakkından düşer). Açılan kutuda katılan da not yazabilir.
- **Senin isteğin**: kişinin kendi istekleri listede işaretlenir; onaylanınca, çalmaya başlayınca ya da reddedilince bildirim gelir. Kaynak `/api/requests/mine` (çerezdeki cihaz kimliği).
- **Geri sayım**: istek hakkı dolunca ana buton kilitlenir ve "Sonraki istek hakkın 4:32 sonra" yazar.
- **Repertuvarımızda yok**: reddedilen istek ziyaretçiye böyle görünür (dashboard'da "Reddedildi" kalır).
- **Anket**: dashboard'da playlist ve istek satırlarındaki oy kutusu simgesiyle 2-4 şarkı seçilir, "Anketi başlat"a basılır; salon telefonundan oylar, sonuç canlı görünür. Cihaz başına tek oy.
- **Gece kapalıyken**: üstteki şeritte "Sonraki sahne" (dashboard → Sistem), istek listesinde "Son gecede çaldıklarımız".

Tarayıcı veritabanına doğrudan yazmaz; tüm okuma ve yazmalar sunucu (`SUPABASE_SECRET_KEY`) üzerinden geçer. Tarayıcı publishable key'i sadece Realtime kanalını dinlemek için kullanır.

## Klasörler

```text
app/
  page.tsx                 ziyaretçi sayfası
  dashboard/               yönetim paneli
  login/                   dashboard girişi
  api/
    requests/  search/  votes/  comments/  lyrics/  state/   herkese açık API
    requests/history/      Eski istekler
    dashboard/ (requests, songs, stats, system, comments, story)       giriş gerektiren API (story: gecenin Instagram kartı)
    auth/                  Spotify refresh token alma (sadece npm run dev ile çalışır)
  components/              arayüz bileşenleri (dashboard/ altında panel bileşenleri)
lib/
  rate-limit.ts            cihaz + IP başına hız sınırı
  device.ts                ziyaretçiyi tanıyan çerez
  live-server.ts / live-client.ts   Realtime sinyali
  lrclib.ts                şarkı sözleri
  stats.ts                 istatistik hesabı
  spotify.ts / search.ts   Spotify erişimi (token önbelleği, zaman aşımı, tekrar deneme)
  playlist.ts              önbellekli playlist ("use cache")
  app-flags.ts             sayfaya gömülen açma/kapama anahtarları
  early-fetch.ts           ilk verileri erken isteme
  og.tsx                   paylaşım görselleri: renkler, logo, yazı tipi (link önizlemesi, gece kartı, iPhone ikonu)
proxy.ts                   /dashboard ve /api/dashboard için giriş kontrolü
scripts/load-test.mjs      yük testi
supabase/                  veritabanı ek SQL dosyaları (yerelde, git'e girmez)
```

## Kurallar ve limitler

| Kural | Sınır |
| --- | --- |
| İstek | Cihaz başına varsayılan 5 dakikada 1 gerçekleşen istek. Dashboard → Sistem → "İstek sınırı"ndan değişir (sadece gece, istek alma ve oylama kapalıyken; `supabase/istek-siniri.sql` gerekir). Ayrıca kötüye kullanıma karşı 10 dakikada en az 30 deneme (aynı IP'ye 10 katı) |
| Tekrar istek | Bu gece çalınan ya da reddedilen şarkı tekrar istenemez (sayaç artmaz, istek hakkı harcanmaz); yeni gecede sıfırlanır |
| Arama | Cihaz başına dakikada 30 (aynı IP'ye 300; çerezi olmayan ziyaretçiye sadece IP sınırı) |
| Yorum | Cihaz başına 10 dakikada 3 (aynı IP'ye 60) |
| İstek notu | En fazla 50 karakter, tek satır; küfür/hakaret ve link içeremez (yorumla aynı filtre). Uygunsuz notla istek gönderilmez, istek hakkı da harcanmaz |
| Aynı şarkı | Bir cihaz sayacı bir kez artırır |
| Şarkı sözü | Cihaz başına dakikada 20 (aynı IP'ye 200; çerezi olmayan ziyaretçiye sadece IP sınırı) |
| Oy | Cihaz başına dakikada 30; sadece bu gece çalınmış şarkılara |
| Şarkı uzunluğu | 1–12 dakika arası istenebilir (playlistimizdeki şarkılar muaf) |
| Müstehcen | Spotify'ın "explicit" etiketi ve küfür listesi (playlistimizdeki şarkılar muaf) |

İstek sınırı veritabanından (`request_devices`) sayılır, Vercel'in birden çok sunucu örneğinde de doğru çalışır. Diğer hız sınırları sunucu belleğinde tutulur; her sunucu örneği kendi sayacını tutar.

Dashboard'da elle "Çalındı" denen istek de "Çal" gibi çalma geçmişine yazılır ve o gece oylanabilir olur. Çalındı'dan "Bekleyene al" ile geri alınan şarkı yeniden istenebilir.

Arama ve şarkı sözü cevapları herkese ortak önbellekten gittiği için bu iki API ziyaretçiye çerez yazmaz; cihaz çerezi ilk istek, oy ya da yorumda verilir.

Bütün sayfalara temel güvenlik başlıkları eklenir (`next.config.ts`): başka sitelere gömülemez, kamera/mikrofon/konum kapalı.

Ücretsiz planlar: Supabase Realtime 200 eşzamanlı bağlantı, 500 MB veritabanı, 7 gün kullanılmazsa proje durur. Vercel Hobby ayda 1 milyon istek. 30 kişiyle yapılan yük testinde dakikada ~110 sunucu isteği ölçüldü.

## Yük testi

```bash
node scripts/load-test.mjs --url http://localhost:3000 --users 30 --seconds 120
```

`--write` gerçek istek gönderir (veritabanına yazar), `--spread-ip` farklı IP'leri taklit eder, `--no-live` Realtime yokmuş gibi sık yoklama yapar.
