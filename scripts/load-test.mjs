// Aynı anda N kişinin siteyi açık tuttuğunu taklit eden yük testi.
// Tarayıcının yaptığı gibi her "kullanıcı" şunları yapar:
//   /api/state    60 sn'de bir (canlı bağlantı varken yedek; lib/system-context.tsx)
//   /api/requests 60 sn'de bir (canlı bağlantı varken yedek; lib/use-request-feed.ts)
//   /api/votes    60 sn'de bir (lib/use-votes.ts)
//   --no-live verilirse Realtime koptuğundaki gibi state 5 sn, requests 10 sn
//   ara sıra /api/search ile şarkı arar
//   --write verilirse ara sıra /api/requests'e POST ile istek atar (GERÇEK veritabanına yazar!)
//
// Kullanım:
//   node scripts/load-test.mjs                         -> localhost:3000, 30 kişi, 60 sn
//   node scripts/load-test.mjs --url https://site.vercel.app --users 30 --seconds 120
//   node scripts/load-test.mjs --write                 -> istek gönderme de dahil
//   node scripts/load-test.mjs --spread-ip             -> her kullanıcıya farklı sahte IP (sadece localhost'ta işe yarar)

const args = process.argv.slice(2);
const opt = (name, def) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const BASE = opt("url", "http://localhost:3000").replace(/\/$/, "");
const USERS = Number(opt("users", 30));
const SECONDS = Number(opt("seconds", 60));
const WRITE = flag("write");
const SPREAD_IP = flag("spread-ip");
const LIVE = !flag("no-live");

const SEARCHES = [
    "tarkan", "sezen aksu", "duman", "manga", "mor ve ötesi", "teoman",
    "sertab", "ajda pekkan", "barış manço", "cem karaca", "athena", "model",
    "coldplay", "dua lipa", "the weeknd", "queen", "daft punk", "imagine dragons",
];

const stats = new Map(); // endpoint -> { n, codes, ms[], bytes }
const errors = new Map(); // "endpoint 500: mesaj" -> sayı
let seenTrackIds = [];

function record(key, status, ms, bytes, errText) {
    let s = stats.get(key);
    if (!s) stats.set(key, (s = { n: 0, codes: {}, ms: [], bytes: 0 }));
    s.n++;
    s.codes[status] = (s.codes[status] ?? 0) + 1;
    s.ms.push(ms);
    s.bytes += bytes;
    if (errText) {
        const k = `${key} ${status}: ${errText.slice(0, 120)}`;
        errors.set(k, (errors.get(k) ?? 0) + 1);
    }
}

async function hit(user, key, path, init = {}) {
    const headers = { ...(init.headers ?? {}), cookie: user.cookie };
    if (SPREAD_IP) headers["x-forwarded-for"] = user.ip;
    const t0 = performance.now();
    try {
        const res = await fetch(BASE + path, { ...init, headers, cache: "no-store" });
        const text = await res.text();
        const ms = performance.now() - t0;

        // Oy için cihaz çerezini sakla, tarayıcı gibi davran
        const set = res.headers.getSetCookie?.() ?? [];
        for (const c of set) {
            const pair = c.split(";")[0];
            const name = pair.split("=")[0];
            user.jar.set(name, pair);
        }
        user.cookie = [...user.jar.values()].join("; ");

        let errText = null;
        if (!res.ok) {
            try {
                errText = JSON.parse(text).error ?? text;
            } catch {
                errText = text;
            }
        }
        record(key, res.status, ms, Buffer.byteLength(text), errText);
        return { status: res.status, text };
    } catch (e) {
        record(key, "NETWORK", performance.now() - t0, 0, String(e.cause?.code ?? e.message));
        return { status: 0, text: "" };
    }
}

function every(ms, fn, until) {
    // Kullanıcılar aynı anda başlamasın diye rastgele başlangıç
    const start = Math.random() * ms;
    return new Promise((resolve) => {
        const tick = async () => {
            if (Date.now() >= until) return resolve();
            await fn();
            setTimeout(tick, ms);
        };
        setTimeout(tick, start);
    });
}

async function runUser(i, until) {
    const user = {
        ip: `10.0.${Math.floor(i / 250)}.${(i % 250) + 1}`,
        jar: new Map(),
        cookie: "",
    };

    const jobs = [
        every(LIVE ? 60_000 : 5_000, () => hit(user, "GET /api/state", "/api/state"), until),
        every(LIVE ? 60_000 : 10_000, () => hit(user, "GET /api/requests", "/api/requests"), until),
        every(60_000, () => hit(user, "GET /api/votes", "/api/votes"), until),
        // Herkes ortalama 30 sn'de bir şarkı arar
        every(30_000, async () => {
            const q = SEARCHES[Math.floor(Math.random() * SEARCHES.length)];
            const r = await hit(user, "GET /api/search", `/api/search?q=${encodeURIComponent(q)}`);
            try {
                const list = JSON.parse(r.text);
                if (Array.isArray(list)) seenTrackIds.push(...list.map((t) => t.id));
                if (seenTrackIds.length > 500) seenTrackIds = seenTrackIds.slice(-500);
            } catch {}
        }, until),
    ];

    if (WRITE) {
        // Herkes ortalama 45 sn'de bir istek gönderir
        jobs.push(
            every(45_000, async () => {
                const id = seenTrackIds[Math.floor(Math.random() * seenTrackIds.length)];
                if (!id) return;
                await hit(user, "POST /api/requests", "/api/requests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                });
            }, until)
        );
    }

    // İlk açılışta ana sayfa da yüklenir (playlist burada Spotify'dan çekilir)
    await hit(user, "GET / (sayfa)", "/");
    await Promise.all(jobs);
}

const pct = (arr, p) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const kb = (b) => (b / 1024).toFixed(1);

async function main() {
    console.log(
        `\n${USERS} kullanıcı · ${SECONDS} sn · ${BASE}` +
        `${WRITE ? " · YAZMA AÇIK (gerçek istek gönderir)" : " · sadece okuma"}` +
        `${SPREAD_IP ? " · her kullanıcı farklı IP" : " · herkes aynı IP (ortak Wi-Fi gibi)"}\n`
    );
    const until = Date.now() + SECONDS * 1000;
    const t0 = Date.now();
    const progress = setInterval(() => {
        const total = [...stats.values()].reduce((a, s) => a + s.n, 0);
        process.stdout.write(`\r  ${Math.round((Date.now() - t0) / 1000)} sn · ${total} istek`);
    }, 1000);

    await Promise.all(Array.from({ length: USERS }, (_, i) => runUser(i, until)));
    clearInterval(progress);
    const elapsed = (Date.now() - t0) / 1000;

    console.log("\n\nUç nokta              istek  /dk     p50ms  p95ms  maxms  ort.KB  durum kodları");
    console.log("─".repeat(100));
    let totalN = 0, totalBytes = 0;
    for (const [key, s] of [...stats.entries()].sort()) {
        totalN += s.n;
        totalBytes += s.bytes;
        console.log(
            key.padEnd(22) +
            String(s.n).padStart(5) +
            String(Math.round((s.n / elapsed) * 60)).padStart(6) +
            String(Math.round(pct(s.ms, 50))).padStart(9) +
            String(Math.round(pct(s.ms, 95))).padStart(7) +
            String(Math.round(Math.max(...s.ms))).padStart(7) +
            kb(s.bytes / s.n).padStart(8) +
            "  " + JSON.stringify(s.codes)
        );
    }

    const perMin = (totalN / elapsed) * 60;
    console.log("─".repeat(100));
    console.log(`Toplam: ${totalN} istek, dakikada ${Math.round(perMin)}, ${kb(totalBytes)} KB veri`);

    // Vercel Hobby: ayda 1M edge request ve 1M function çağrısı (sert sınır)
    const hoursFor1M = 1_000_000 / (perMin * 60);
    const mbPerHour = (totalBytes / elapsed) * 3600 / 1024 / 1024;
    console.log(`\nBu tempoyla:`);
    console.log(`  saatte ~${Math.round(perMin * 60).toLocaleString("tr-TR")} istek, ~${mbPerHour.toFixed(1)} MB veri`);
    console.log(`  Vercel Hobby'nin aylık 1M istek hakkı ~${hoursFor1M.toFixed(1)} saatte biter`);

    if (errors.size) {
        console.log("\nHatalar:");
        for (const [k, n] of [...errors.entries()].sort((a, b) => b[1] - a[1])) {
            console.log(`  ${String(n).padStart(4)}×  ${k}`);
        }
    } else {
        console.log("\nHiç hata yok.");
    }
}

main();
