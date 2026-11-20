// Ziyaretçi sayfasının çevirileri. Anahtar metnin Türkçesidir: Türkçe seçiliyken olduğu gibi
// görünür. {ad} yer tutucudur. İngilizcede [tekil, çoğul] verilirse n'ye göre seçilir.
// Yeni metin eklerken buraya da eklenmezse TypeScript hata verir.

type Entry = { en: string | readonly [string, string]; az: string };

export const DICT = {
    // Üst kısım
    Yorum: { en: "Comment", az: "Şərh" },
    "Yorum yap": { en: "Add comment", az: "Şərh yaz" },
    "Dashboard girişi": { en: "Dashboard login", az: "Dashboard-a giriş" },
    "Dil seç": { en: "Choose language", az: "Dil seç" },
    "İstekler şu an kapalı, birazdan tekrar açılacak.": {
        en: "Requests are closed right now, they'll reopen soon.",
        az: "İstəklər hazırda bağlıdır, bir azdan yenidən açılacaq.",
    },
    "Canlı müzik başlayınca istek yapma ve oy verme açılacak.": {
        en: "Requests and voting open when the live music starts.",
        az: "Canlı musiqi başlayanda istək və səsvermə açılacaq.",
    },
    "Sonraki sahne: {x}": { en: "Next show: {x}", az: "Növbəti çıxış: {x}" },

    // Alt menü
    "Ana menü": { en: "Main menu", az: "Əsas menyu" },
    Playlist: { en: "Playlist", az: "Pleylist" },
    "İstek Listesi": { en: "Requests", az: "İstək siyahısı" },
    Yorumlar: { en: "Comments", az: "Şərhlər" },
    "Yeni istek: {name}": { en: "New request: {name}", az: "Yeni istək: {name}" },
    "{n} yeni istek geldi": { en: "{n} new requests", az: "{n} yeni istək gəldi" },

    // İstek butonu ve arama
    "İstek Parça Yap": { en: "Request a Song", az: "Mahnı istə" },
    "İstekler şu an kapalı": { en: "Requests are closed", az: "İstəklər hazırda bağlıdır" },
    "Sonraki istek hakkın {time} sonra": {
        en: "Next request in {time}",
        az: "Növbəti istək {time} sonra",
    },
    "İsteğe katıldın · {n} kişi istedi: {name}": {
        en: ["You joined · {n} person asked: {name}", "You joined · {n} people asked: {name}"],
        az: "İstəyə qoşuldun · {n} nəfər istədi: {name}",
    },
    "İstek gönderildi: {name}": { en: "Request sent: {name}", az: "İstək göndərildi: {name}" },
    "Şarkı adı yaz": { en: "Type a song name", az: "Mahnının adını yaz" },
    "Şarkı ara": { en: "Search songs", az: "Mahnı axtar" },
    Kapat: { en: "Close", az: "Bağla" },
    "En çok beğenilenler": { en: "Most liked", az: "Ən çox bəyənilənlər" },
    "Sonuç yok. Şarkı adını farklı yazmayı dene.": {
        en: "No results. Try spelling the song name differently.",
        az: "Nəticə yoxdur. Mahnının adını başqa cür yazmağa çalış.",
    },
    "Aranıyor…": { en: "Searching…", az: "Axtarılır…" },
    Listemizde: { en: "In our list", az: "Siyahımızda" },
    "Gönderiliyor…": { en: "Sending…", az: "Göndərilir…" },
    İste: { en: "Request", az: "İstə" },
    "Arama yapılamadı. Biraz sonra tekrar dene.": {
        en: "Search failed. Try again in a moment.",
        az: "Axtarış alınmadı. Bir azdan yenidən yoxla.",
    },
    "Her cihazdan {min} dakikada en fazla {n} istek atılabilir.": {
        en: [
            "Each device can send {n} request every {min} min.",
            "Each device can send up to {n} requests every {min} min.",
        ],
        az: "Hər cihazdan {min} dəqiqədə ən çox {n} istək göndərmək olar.",
    },
    "Bu kelimeyle arama yapılamaz.": {
        en: "You can't search with that word.",
        az: "Bu sözlə axtarış etmək olmaz.",
    },

    // Şarkı satırları
    "İstekler şu an kapalı. Canlı müzik başlayınca açılacak.": {
        en: "Requests are closed. They open when the live music starts.",
        az: "İstəklər hazırda bağlıdır. Canlı musiqi başlayanda açılacaq.",
    },
    "Sonraki istek hakkın {time} sonra açılacak.": {
        en: "Your next request opens in {time}.",
        az: "Növbəti istək hüququn {time} sonra açılacaq.",
    },
    "Repertuvarımızda yok": { en: "Not in our repertoire", az: "Repertuarımızda yoxdur" },
    "{name} şarkısını ben de istiyorum": {
        en: "I want {name} too",
        az: "{name} mahnısını mən də istəyirəm",
    },
    "{name} şarkısını iste": { en: "Request {name}", az: "{name} mahnısını istə" },
    İstedin: { en: "Requested", az: "İstədin" },
    Çalındı: { en: "Played", az: "Çalındı" },
    "Ben de": { en: "Me too", az: "Mən də" },
    Çalıyor: { en: "Playing", az: "Çalınır" },
    Yeni: { en: "New", az: "Yeni" },
    "{album} kapağı": { en: "{album} cover", az: "{album} albomunun qapağı" },
    "Bu hafta": { en: "This week", az: "Bu həftə" },
    "Geçen hafta": { en: "Last week", az: "Keçən həftə" },
    "{n} hafta önce": { en: ["{n} week ago", "{n} weeks ago"], az: "{n} həftə əvvəl" },
    "{n} ay önce": { en: ["{n} month ago", "{n} months ago"], az: "{n} ay əvvəl" },
    "{n} yıl önce": { en: ["{n} year ago", "{n} years ago"], az: "{n} il əvvəl" },
    "Oylama şu an kapalı.": { en: "Voting is closed right now.", az: "Səsvermə hazırda bağlıdır." },
    "Bu şarkı henüz çalınmadı. Çalınca oy verebilirsin.": {
        en: "This song hasn't been played yet. You can vote once it's played.",
        az: "Bu mahnı hələ çalınmayıb. Çalınanda səs verə bilərsən.",
    },
    "{name} şarkısını beğen": { en: "Like {name}", az: "{name} mahnısını bəyən" },
    "{name} şarkısını beğenme": { en: "Dislike {name}", az: "{name} mahnısını bəyənmə" },

    // İstek listesi
    "Liste güncellenemedi, tekrar denenecek.": {
        en: "Couldn't update the list, retrying.",
        az: "Siyahı yenilənmədi, yenidən cəhd ediləcək.",
    },
    "Bu gece": { en: "Tonight", az: "Bu gecə" },
    "Eski istekler": { en: "Past requests", az: "Köhnə istəklər" },
    canlı: { en: "live", az: "canlı" },
    "{n} bekleyen": { en: "{n} waiting", az: "{n} gözləyən" },
    Bekliyor: { en: "Waiting", az: "Gözləyir" },
    Çalınacak: { en: "Coming up", az: "Çalınacaq" },
    'Henüz istek yok. Yukarıdaki "İstek Parça Yap" butonuna dokun, şarkını ara ve ilk isteği sen yap.':
        {
            en: 'No requests yet. Tap "Request a Song" above, find your song and be the first.',
            az: 'Hələ istək yoxdur. Yuxarıdakı "Mahnı istə" düyməsinə toxun, mahnını tap və ilk istəyi sən et.',
        },
    "Canlı müzik başlayınca bu gecenin istekleri burada görünecek. O zamana kadar daha önce istenen şarkılara göz atabilirsin.":
        {
            en: "Tonight's requests will show up here once the live music starts. Meanwhile, browse songs requested before.",
            az: "Canlı musiqi başlayanda bu gecənin istəkləri burada görünəcək. O vaxta qədər əvvəllər istənilən mahnılara baxa bilərsən.",
        },
    "Eski isteklere bak": { en: "See past requests", az: "Köhnə istəklərə bax" },
    'Listedeki bir şarkıyı sen de istiyorsan "Ben de"ye dokun.': {
        en: 'Want a song on the list too? Tap "Me too".',
        az: 'Siyahıdakı mahnını sən də istəyirsənsə, "Mən də" düyməsinə toxun.',
    },
    "{n} kişi istedi": {
        en: ["{n} person asked", "{n} people asked"],
        az: "{n} nəfər istədi",
    },
    "Senin isteğin": { en: "Your request", az: "Sənin istəyin" },
    "az önce": { en: "just now", az: "indicə" },
    "{n} dakika önce": { en: ["{n} min ago", "{n} min ago"], az: "{n} dəqiqə əvvəl" },
    "{n} saat önce": { en: ["{n} hour ago", "{n} hours ago"], az: "{n} saat əvvəl" },
    dün: { en: "yesterday", az: "dünən" },
    "{n} gün önce": { en: ["{n} day ago", "{n} days ago"], az: "{n} gün əvvəl" },

    // Eski istekler
    "Eski istekler alınamadı.": {
        en: "Couldn't load past requests.",
        az: "Köhnə istəklər yüklənmədi.",
    },
    "Tekrar dene": { en: "Try again", az: "Yenidən yoxla" },
    "Henüz eski istek yok. Geceler geçtikçe istenen şarkılar burada birikir.": {
        en: "No past requests yet. Requested songs will collect here night by night.",
        az: "Hələ köhnə istək yoxdur. Gecələr keçdikcə istənilən mahnılar burada toplanacaq.",
    },
    "Ara · {n} şarkı": { en: ["Search · {n} song", "Search · {n} songs"], az: "Axtar · {n} mahnı" },
    "Eski isteklerde ara": { en: "Search past requests", az: "Köhnə istəklərdə axtar" },
    "Aramayı temizle": { en: "Clear search", az: "Axtarışı təmizlə" },
    "Sıralamayı değiştir": { en: "Change sorting", az: "Sıralamanı dəyiş" },
    "En çok istenen": { en: "Most requested", az: "Ən çox istənilən" },
    "En yeni": { en: "Newest", az: "Ən yeni" },
    '"{q}" daha önce istenmemiş. Yukarıdaki "İstek Parça Yap" butonundan arayabilirsin.': {
        en: '"{q}" hasn\'t been requested before. You can find it with "Request a Song" above.',
        az: '"{q}" əvvəllər istənilməyib. Yuxarıdakı "Mahnı istə" düyməsi ilə axtara bilərsən.',
    },
    "{n} kez istendi": { en: "Requested {n}×", az: "{n} dəfə istənilib" },
    "{n} kez çalındı": { en: "Played {n}×", az: "{n} dəfə çalınıb" },
    Listede: { en: "On the list", az: "Siyahıda" },

    // Playlist
    "Playlistte ara · {n} şarkı": {
        en: ["Search playlist · {n} song", "Search playlist · {n} songs"],
        az: "Pleylistdə axtar · {n} mahnı",
    },
    "Playlistte şarkı ara": { en: "Search songs in the playlist", az: "Pleylistdə mahnı axtar" },
    '"{q}" playlistte yok. "İstek Parça Yap" butonundan isteyebilirsin.': {
        en: '"{q}" isn\'t in the playlist. You can request it with "Request a Song".',
        az: '"{q}" pleylistdə yoxdur. "Mahnı istə" düyməsi ilə istəyə bilərsən.',
    },
    "Playlist şu an yüklenemedi. Birazdan sayfayı yenile; istek listesi çalışmaya devam ediyor.": {
        en: "The playlist couldn't load right now. Refresh in a bit; requests still work.",
        az: "Pleylist hazırda yüklənmədi. Bir azdan səhifəni yenilə; istək siyahısı işləməyə davam edir.",
    },

    // Sözler
    Sözler: { en: "Lyrics", az: "Sözlər" },
    "{name} şarkısının sözlerini aç": {
        en: "Open lyrics for {name}",
        az: "{name} mahnısının sözlərini aç",
    },
    "{name} şarkı sözleri": { en: "{name} lyrics", az: "{name} mahnı sözləri" },
    "Google'da ara": { en: "Search on Google", az: "Google-da axtar" },
    "Sözler yükleniyor": { en: "Loading lyrics", az: "Sözlər yüklənir" },
    "Bu sözler {site} adresinden alınmıştır.": {
        en: "These lyrics are from {site}.",
        az: "Bu sözlər {site} saytından götürülüb.",
    },
    "Yanlışsa Google'da ara": { en: "Wrong? Search on Google", az: "Səhvdirsə, Google-da axtar" },
    "Bu şarkı enstrümantal, sözü yok.": {
        en: "This song is instrumental, no lyrics.",
        az: "Bu mahnı instrumentaldır, sözü yoxdur.",
    },
    "Bu şarkının sözleri bulunamadı.": {
        en: "Couldn't find lyrics for this song.",
        az: "Bu mahnının sözləri tapılmadı.",
    },
    "Sözler şu an alınamadı.": {
        en: "Couldn't load the lyrics right now.",
        az: "Sözlər hazırda yüklənmədi.",
    },

    // Mini oynatıcı ve son gece
    Şarkı: { en: "Song", az: "Mahnı" },
    "Çalan şarkı: {name}. Listede göster": {
        en: "Now playing: {name}. Show in list",
        az: "Çalınan mahnı: {name}. Siyahıda göstər",
    },
    "Son gecede çaldıklarımız": { en: "Played at our last show", az: "Son gecədə çaldıqlarımız" },
    "{n} şarkı": { en: ["{n} song", "{n} songs"], az: "{n} mahnı" },
    "{n}. şarkı": { en: "Song {n}", az: "{n}. mahnı" },

    // Anket
    "Oy gönderilemedi. Tekrar dokun.": {
        en: "Vote failed. Tap again.",
        az: "Səs göndərilmədi. Yenidən toxun.",
    },
    "Sıradaki şarkı oylaması": { en: "Next song vote", az: "Növbəti mahnı səsverməsi" },
    "Oylama bitti": { en: "Voting ended", az: "Səsvermə bitdi" },
    "Sıradaki şarkıyı siz seçin": { en: "You pick the next song", az: "Növbəti mahnını siz seçin" },
    "{n} oy": { en: ["{n} vote", "{n} votes"], az: "{n} səs" },
    "Kazanan: {name}. Birazdan çalıyoruz.": {
        en: "Winner: {name}. Coming up shortly.",
        az: "Qalib: {name}. Bir azdan çalırıq.",
    },
    "Bu sefer oy çıkmadı.": { en: "No votes this time.", az: "Bu dəfə səs verilmədi." },
    "Oyun alındı. Fikrini değiştirmek için başka şarkıya dokun.": {
        en: "Vote counted. Tap another song to change it.",
        az: "Səsin qəbul olundu. Fikrini dəyişmək üçün başqa mahnıya toxun.",
    },
    "Çalmamızı istediğin şarkıya dokun.": {
        en: "Tap the song you want us to play.",
        az: "Çalmağımızı istədiyin mahnıya toxun.",
    },
    "{name}, {artists}: yüzde {pct}": {
        en: "{name}, {artists}: {pct} percent",
        az: "{name}, {artists}: {pct} faiz",
    },
    ", senin oyun": { en: ", your vote", az: ", sənin səsin" },
    Oyun: { en: "Your vote", az: "Səsin" },

    // Kendi isteğim
    "İsteğin şimdi çalıyor: {name}": {
        en: "Your request is playing now: {name}",
        az: "İstəyin indi çalınır: {name}",
    },
    "İsteğin onaylandı, çalınacak: {name}": {
        en: "Your request was approved, coming up: {name}",
        az: "İstəyin təsdiqləndi, çalınacaq: {name}",
    },
    "İsteğin repertuvarımızda yok: {name}": {
        en: "Your request isn't in our repertoire: {name}",
        az: "İstəyin repertuarımızda yoxdur: {name}",
    },

    // Yorum formu
    "Çok kötü": { en: "Very bad", az: "Çox pis" },
    Kötü: { en: "Bad", az: "Pis" },
    "Fena değil": { en: "Not bad", az: "Pis deyil" },
    İyi: { en: "Good", az: "Yaxşı" },
    Harika: { en: "Great", az: "Əla" },
    "Önce yıldızlarla bir puan ver.": {
        en: "Pick a star rating first.",
        az: "Əvvəlcə ulduzlarla qiymət ver.",
    },
    "Gönderilemedi, tekrar dene.": { en: "Couldn't send, try again.", az: "Göndərilmədi, yenidən yoxla." },
    "Teşekkürler!": { en: "Thank you!", az: "Təşəkkürlər!" },
    "Yorumun Yorumlar sekmesinde herkese görünüyor.": {
        en: "Your comment is now visible to everyone under Comments.",
        az: "Şərhin Şərhlər bölməsində hamıya görünür.",
    },
    "Puanın bize ulaştı.": { en: "We got your rating.", az: "Qiymətin bizə çatdı." },
    "Bizi Instagram'da takip et": { en: "Follow us on Instagram", az: "Bizi Instagram-da izlə" },
    Tamam: { en: "OK", az: "Tamam" },
    "Bize yorum bırak": { en: "Leave us a comment", az: "Bizə şərh yaz" },
    "Bu geceyi nasıl buldun?": { en: "How was tonight?", az: "Bu gecə necə keçdi?" },
    "Genel puan": { en: "Overall rating", az: "Ümumi qiymət" },
    "{n} yıldız, {label}": { en: ["{n} star, {label}", "{n} stars, {label}"], az: "{n} ulduz, {label}" },
    Yorumun: { en: "Your comment", az: "Şərhin" },
    "Ne düşündüğünü yaz…": { en: "Tell us what you think…", az: "Nə düşündüyünü yaz…" },
    İsmin: { en: "Your name", az: "Adın" },
    "(isteğe bağlı)": { en: "(optional)", az: "(istəyə bağlı)" },
    "Boş bırakırsan anonim": { en: "Leave empty to stay anonymous", az: "Boş qoysan, anonim qalar" },
    Gönder: { en: "Send", az: "Göndər" },
    "Yorumlar herkese açık. Küfür ve hakaret içeren yorumlar gönderilemez.": {
        en: "Comments are public. Swearing and insults can't be posted.",
        az: "Şərhlər hamıya açıqdır. Söyüş və təhqir olan şərhlər göndərilə bilməz.",
    },
    "Yorumunda uygunsuz bir kelime var, lütfen düzelt.": {
        en: "Your comment has an inappropriate word, please fix it.",
        az: "Şərhində uyğunsuz söz var, zəhmət olmasa düzəlt.",
    },
    "İsminde uygunsuz bir kelime var.": {
        en: "Your name has an inappropriate word.",
        az: "Adında uyğunsuz söz var.",
    },
    "Yoruma link eklenemez.": {
        en: "Links aren't allowed in comments.",
        az: "Şərhə link əlavə etmək olmaz.",
    },

    // Yorumlar sekmesi
    "{n} değerlendirme": { en: ["{n} rating", "{n} ratings"], az: "{n} qiymət" },
    "5 üzerinden {n}": { en: "{n} out of 5", az: "5-dən {n}" },
    "Henüz yorum yok. İlk yorumu sen yaz!": {
        en: "No comments yet. Be the first to write one!",
        az: "Hələ şərh yoxdur. İlk şərhi sən yaz!",
    },
    "Yorumlar alınamadı.": { en: "Couldn't load comments.", az: "Şərhlər yüklənmədi." },
    Anonim: { en: "Anonymous", az: "Anonim" },

    // Sunucudan gelen hata mesajları (lib/i18n translateServer)
    "İstekler şu an kapalı.": { en: "Requests are closed right now.", az: "İstəklər hazırda bağlıdır." },
    "Çok fazla deneme yaptın, biraz bekle.": {
        en: "Too many attempts, please wait a bit.",
        az: "Çox cəhd etdin, bir az gözlə.",
    },
    "Geçersiz şarkı.": { en: "Invalid song.", az: "Yanlış mahnı." },
    "Şarkı bulunamadı.": { en: "Song not found.", az: "Mahnı tapılmadı." },
    "Bu şarkı istek listesine eklenemez.": {
        en: "This song can't be added to the request list.",
        az: "Bu mahnı istək siyahısına əlavə edilə bilməz.",
    },
    "Bu şarkı repertuvarımızda yok.": {
        en: "This song isn't in our repertoire.",
        az: "Bu mahnı repertuarımızda yoxdur.",
    },
    "Bu şarkıyı zaten istedin.": {
        en: "You've already requested this song.",
        az: "Bu mahnını artıq istəmisən.",
    },
    "Bu şarkı bu gece zaten çalındı.": {
        en: "This song has already been played tonight.",
        az: "Bu mahnı bu gecə artıq çalınıb.",
    },
    "Liste alınamadı.": { en: "Couldn't load the list.", az: "Siyahı yüklənmədi." },
    "Durum alınamadı.": { en: "Couldn't load the status.", az: "Vəziyyət yüklənmədi." },
    "İsteklerin alınamadı.": { en: "Couldn't load your requests.", az: "İstəklərin yüklənmədi." },
    "Öneriler alınamadı.": { en: "Couldn't load suggestions.", az: "Təkliflər yüklənmədi." },
    "Oylar alınamadı.": { en: "Couldn't load votes.", az: "Səslər yüklənmədi." },
    "Anket alınamadı.": { en: "Couldn't load the poll.", az: "Səsvermə yüklənmədi." },
    "Sözler alınamadı.": { en: "Couldn't load the lyrics.", az: "Sözlər yüklənmədi." },
    "Çok fazla istek, biraz bekle.": {
        en: "Too many requests, please wait a bit.",
        az: "Çox sorğu göndərdin, bir az gözlə.",
    },
    "Yorum en fazla {n} karakter olabilir.": {
        en: "A comment can be at most {n} characters.",
        az: "Şərh ən çox {n} simvol ola bilər.",
    },
    "İsim en fazla {n} karakter olabilir.": {
        en: "A name can be at most {n} characters.",
        az: "Ad ən çox {n} simvol ola bilər.",
    },
    "İstek gönderilemedi. Tekrar dene.": {
        en: "Couldn't send the request. Try again.",
        az: "İstək göndərilmədi. Yenidən yoxla.",
    },
    "İstek gönderilemedi. Tekrar dokun.": {
        en: "Couldn't send the request. Tap again.",
        az: "İstək göndərilmədi. Yenidən toxun.",
    },
    "{w} dakikada {l} istek hakkın var, hepsini kullandın. {m} dk sonra tekrar isteyebilirsin.": {
        en: "Limit reached: {l} per {w} min. You can request again in {m} min.",
        az: "{w} dəqiqədə {l} istək hüququn var, hamısını istifadə etdin. {m} dəq sonra yenidən istəyə bilərsən.",
    },
    "Çok fazla arama yaptın, biraz bekle.": {
        en: "Too many searches, please wait a bit.",
        az: "Çox axtarış etdin, bir az gözlə.",
    },
    "Arama başarısız": { en: "Search failed", az: "Axtarış alınmadı" },
    "Çok fazla işlem.": { en: "Too many actions.", az: "Çox əməliyyat." },
    "Geçersiz oy.": { en: "Invalid vote.", az: "Yanlış səs." },
    "Çok hızlı oy veriyorsun, biraz bekle.": {
        en: "You're voting too fast, wait a bit.",
        az: "Çox tez səs verirsən, bir az gözlə.",
    },
    "Şu an oy verilemiyor.": { en: "Voting isn't available right now.", az: "Hazırda səs vermək olmur." },
    "Bu şarkıya oy verilemez.": { en: "You can't vote for this song.", az: "Bu mahnıya səs vermək olmaz." },
    "Oy gönderilemedi. Tekrar dene.": { en: "Vote failed. Try again.", az: "Səs göndərilmədi. Yenidən yoxla." },
    "Oylama bitti.": { en: "Voting has ended.", az: "Səsvermə bitib." },
    "Geçersiz istek.": { en: "Invalid request.", az: "Yanlış sorğu." },
    "Lütfen 1 ile 5 arasında bir puan ver.": {
        en: "Please give a rating from 1 to 5.",
        az: "Zəhmət olmasa 1-dən 5-ə qədər qiymət ver.",
    },
    "Çok sık yorum yapıyorsun, biraz sonra tekrar dene.": {
        en: "You're commenting too often, try again in a bit.",
        az: "Çox tez-tez şərh yazırsan, bir azdan yenidən yoxla.",
    },
    "Yorum gönderilemedi, tekrar dene.": {
        en: "Couldn't send the comment, try again.",
        az: "Şərh göndərilmədi, yenidən yoxla.",
    },

    // Hata sayfası
    "Bir şeyler ters gitti": { en: "Something went wrong", az: "Nəsə səhv getdi" },
    "Sayfa yüklenirken bir sorun oldu. Tekrar dene, düzelmezse sayfayı yenile.": {
        en: "There was a problem loading the page. Try again, or refresh if it persists.",
        az: "Səhifə yüklənərkən problem yarandı. Yenidən yoxla, düzəlməsə səhifəni yenilə.",
    },
} satisfies Record<string, Entry>;

export type MsgKey = keyof typeof DICT;

// Sayı içeren sunucu mesajları: kalıba uyarsa çevrilir
export const SERVER_PATTERNS: {
    re: RegExp;
    key: MsgKey;
    vars: (m: RegExpExecArray) => Record<string, string | number>;
}[] = [
    {
        re: /^(\d+) dakikada (\d+) istek hakkın var, hepsini kullandın\. (\d+) dk sonra tekrar isteyebilirsin\.$/,
        key: "{w} dakikada {l} istek hakkın var, hepsini kullandın. {m} dk sonra tekrar isteyebilirsin.",
        vars: (m) => ({ w: m[1], l: m[2], m: m[3] }),
    },
    {
        re: /^Yorum en fazla (\d+) karakter olabilir\.$/,
        key: "Yorum en fazla {n} karakter olabilir.",
        vars: (m) => ({ n: m[1] }),
    },
    {
        re: /^İsim en fazla (\d+) karakter olabilir\.$/,
        key: "İsim en fazla {n} karakter olabilir.",
        vars: (m) => ({ n: m[1] }),
    },
];
