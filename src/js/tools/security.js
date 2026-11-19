/* Kategorie: Sicherheit & Krypto */
(() => {
  'use strict';
  const { register } = window.TB;

  /* MD5 (RFC 1321) für Uint8Array — WebCrypto kennt kein MD5 */
  const md5 = (bytes) => {
    const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
    const len = bytes.length, nBlocks = ((len + 8) >> 6) + 1;
    const w = new Uint32Array(nBlocks * 16);
    for (let i = 0; i < len; i++) w[i >> 2] |= bytes[i] << ((i % 4) * 8);
    w[len >> 2] |= 0x80 << ((len % 4) * 8);
    w[nBlocks * 16 - 2] = (len * 8) >>> 0;
    w[nBlocks * 16 - 1] = Math.floor(len / 0x20000000);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let blk = 0; blk < nBlocks; blk++) {
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        const s = S[(i >> 4) * 4 + (i % 4)];
        F = (F + A + K[i] + w[blk * 16 + g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + ((F << s) | (F >>> (32 - s)))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    return [a0, b0, c0, d0].map((x) => [0, 8, 16, 24].map((s) => ((x >>> s) & 255).toString(16).padStart(2, '0')).join('')).join('');
  };
  window.TB.md5 = md5;

  const sha = async (algo, bytes) => {
    const h = new Uint8Array(await crypto.subtle.digest(algo, bytes));
    return window.TB.util.bytesToHex(h);
  };

  register({
    id: 'hash', name: 'Hash Generator', glyph: '#!', cat: 'security',
    desc: 'MD5, SHA-1, SHA-256, SHA-384, SHA-512 für Text oder Dateien.', keywords: 'md5 sha checksum prüfsumme digest file',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:12px"><div class="seg" id="src"><button class="on" data-v="text">Text</button><button data-v="file">Datei</button></div>
          <label class="check"><input type="checkbox" id="upper"> Grossbuchstaben</label></div>
        <div id="textBox" class="field"><textarea id="in" placeholder="Text eingeben …" spellcheck="false"></textarea></div>
        <div id="fileBox" class="field" hidden><input type="file" id="file"/><div class="small muted" id="finfo"></div></div></div>
        <div class="panel"><h3>Ergebnis</h3><div id="res"></div>
        <div class="field" style="margin-top:14px"><div class="label">Prüfsumme vergleichen</div><input id="cmp" class="mono" placeholder="Erwarteten Hash einfügen …"/><div id="cmpRes"></div></div></div>`;
      let bytes = new Uint8Array(), last = {};
      const run = async () => {
        const up = U.q('#upper').checked;
        last = { MD5: md5(bytes) };
        for (const a of ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']) last[a] = await sha(a, bytes);
        if (up) for (const k in last) last[k] = last[k].toUpperCase();
        U.q('#res').innerHTML = U.kv(Object.entries(last));
        compare();
      };
      const compare = () => {
        const c = U.q('#cmp').value.trim().toLowerCase();
        if (!c) { U.q('#cmpRes').innerHTML = ''; return; }
        const hit = Object.entries(last).find(([, v]) => v.toLowerCase() === c);
        U.q('#cmpRes').innerHTML = hit ? `<div class="msg ok">✓ Übereinstimmung mit ${hit[0]}</div>` : '<div class="msg err">✗ Keine Übereinstimmung</div>';
      };
      U.q('#in').addEventListener('input', () => { bytes = U.utf8.enc(U.q('#in').value); run(); });
      U.q('#upper').onchange = run;
      U.q('#cmp').oninput = compare;
      U.q('#src').onclick = (e) => {
        const b = e.target.closest('button'); if (!b) return;
        U.qa('#src button').forEach((x) => x.classList.toggle('on', x === b));
        U.q('#textBox').hidden = b.dataset.v !== 'text'; U.q('#fileBox').hidden = b.dataset.v !== 'file';
      };
      U.q('#file').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        U.q('#finfo').textContent = `${f.name} · ${U.fmtNum(f.size / 1048576)} MB — wird berechnet …`;
        bytes = new Uint8Array(await f.arrayBuffer());
        await run();
        U.q('#finfo').textContent = `${f.name} · ${U.fmtNum(f.size / 1048576)} MB`;
      };
      run();
    },
  });

  register({
    id: 'hmac', name: 'HMAC Generator', glyph: 'MAC', cat: 'security',
    desc: 'HMAC-Signaturen mit SHA-1/256/384/512 erzeugen (z. B. für Webhooks).', keywords: 'signature webhook secret',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">Nachricht</div><textarea id="msgIn" spellcheck="false"></textarea></div>
        <div class="cols"><div class="field"><div class="label">Geheimer Schlüssel</div><input id="key" class="mono"/></div>
        <div class="field"><div class="label">Algorithmus</div><select id="algo"><option>SHA-256</option><option>SHA-512</option><option>SHA-384</option><option>SHA-1</option></select></div></div></div>
        <div class="panel"><h3>Signatur</h3><div id="res"></div></div>`;
      const run = async () => {
        const k = await crypto.subtle.importKey('raw', U.utf8.enc(U.q('#key').value || '\0'), { name: 'HMAC', hash: U.q('#algo').value }, false, ['sign']);
        const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, U.utf8.enc(U.q('#msgIn').value)));
        U.q('#res').innerHTML = U.kv([['Hex', U.bytesToHex(sig)], ['Base64', U.bytesToB64(sig)]]);
      };
      ['#msgIn', '#key', '#algo'].forEach((s) => U.q(s).addEventListener('input', run));
      run();
    },
  });

  const SETS = { lower: 'abcdefghijklmnopqrstuvwxyz', upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', digits: '0123456789', symbols: '!@#$%^&*()-_=+[]{};:,.<>/?~' };
  const AMBIG = /[Il1O0o]/g;

  register({
    id: 'password', name: 'Passwort Generator', glyph: '***', cat: 'security',
    desc: 'Sichere Zufallspasswörter mit Entropie-Anzeige erzeugen.', keywords: 'password random secure generate kennwort',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row"><div class="out grow big" id="pw" style="font-size:22px"></div>
          <button class="btn btn-primary" id="gen">${U.icon('refresh')}Neu</button><button class="btn" data-copy="#pw">${U.icon('copy')}Kopieren</button></div>
          <div style="margin-top:12px"><div class="meter"><i id="bar"></i></div><div class="row small" style="margin-top:6px"><span id="ent" class="muted"></span><span class="spacer"></span><span id="lvl"></span></div></div></div>
        <div class="panel"><div class="field"><div class="label">Länge <span class="hint" id="lenV"></span></div><input type="range" id="len" min="6" max="128" value="20"/></div>
          <div class="row" style="gap:18px">
            <label class="check"><input type="checkbox" id="lower" checked> a–z</label><label class="check"><input type="checkbox" id="upper" checked> A–Z</label>
            <label class="check"><input type="checkbox" id="digits" checked> 0–9</label><label class="check"><input type="checkbox" id="symbols" checked> !@#$</label>
            <label class="check"><input type="checkbox" id="amb"> Verwechselbare Zeichen vermeiden (Il1O0)</label></div>
          <div class="field" style="margin-top:14px"><div class="label">Mehrere auf einmal</div><div class="row"><input type="number" id="cnt" value="10" min="1" max="500" style="width:100px"/><button class="btn" id="bulk">Liste erzeugen</button></div></div>
          <textarea id="list" readonly hidden style="margin-top:8px"></textarea></div>`;
      const pool = () => {
        let p = ''; for (const k in SETS) if (U.q('#' + k).checked) p += SETS[k];
        if (U.q('#amb').checked) p = p.replace(AMBIG, '');
        return p;
      };
      const one = () => {
        const p = pool(), n = +U.q('#len').value;
        if (!p) return '';
        // Mindestens ein Zeichen aus jeder gewählten Gruppe
        const groups = Object.keys(SETS).filter((k) => U.q('#' + k).checked).map((k) => U.q('#amb').checked ? SETS[k].replace(AMBIG, '') : SETS[k]);
        const chars = Array.from({ length: n }, () => p[U.randInt(p.length)]);
        groups.forEach((g, i) => { if (i < n && !chars.some((c) => g.includes(c))) chars[U.randInt(n)] = g[U.randInt(g.length)]; });
        return chars.join('');
      };
      const gen = () => {
        const pw = one(); U.q('#pw').textContent = pw;
        U.q('#lenV').textContent = U.q('#len').value + ' Zeichen';
        const bits = pw.length * Math.log2(pool().length || 1);
        const pct = Math.min(100, bits / 1.28);
        const [c, l] = bits < 40 ? ['var(--err)', 'Schwach'] : bits < 64 ? ['var(--warn)', 'Mittel'] : bits < 100 ? ['var(--ok)', 'Stark'] : ['var(--accent-text)', 'Sehr stark'];
        U.q('#bar').style.width = pct + '%'; U.q('#bar').style.background = c;
        U.q('#ent').textContent = `≈ ${Math.round(bits)} Bit Entropie`; U.q('#lvl').innerHTML = `<b style="color:${c}">${l}</b>`;
      };
      U.q('#gen').onclick = gen;
      root.querySelectorAll('input').forEach((i) => { if (i.id !== 'cnt') i.addEventListener('input', gen); });
      U.q('#bulk').onclick = () => { const l = U.q('#list'); l.hidden = false; l.value = Array.from({ length: Math.min(500, +U.q('#cnt').value || 1) }, one).join('\n'); };
      gen();
    },
  });

  register({
    id: 'password-check', name: 'Passwort-Check', glyph: '✓*', cat: 'security',
    desc: 'Stärke eines Passworts lokal prüfen – inkl. geschätzter Knackzeit.', keywords: 'strength entropy crack time',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">Passwort <span class="hint">wird nirgends gespeichert oder gesendet</span></div>
        <div class="row"><input type="password" id="pw" class="mono grow" autocomplete="off"/><button class="btn" id="show">Anzeigen</button></div></div>
        <div class="meter"><i id="bar"></i></div><div id="sum" style="margin-top:10px"></div></div><div class="panel"><h3>Analyse</h3><div id="det"></div></div>`;
      const COMMON = ['123456', 'password', 'passwort', 'qwertz', 'qwerty', 'admin', 'welcome', 'letmein', 'hallo', 'iloveyou', 'abc123', 'monkey', 'dragon', 'sommer', 'winter', 'schweiz', 'master', 'login'];
      const fmtTime = (s) => {
        if (s < 1) return 'sofort';
        const u = [['Jahrhunderte', 3.15e9], ['Jahre', 3.15e7], ['Tage', 86400], ['Stunden', 3600], ['Minuten', 60], ['Sekunden', 1]];
        if (s > 3.15e11) return 'praktisch nie';
        for (const [n, v] of u) if (s >= v) return U.fmtNum(s / v, 0) + ' ' + n;
        return 'sofort';
      };
      const run = () => {
        const p = U.q('#pw').value;
        let size = 0;
        const has = { lower: /[a-z]/.test(p), upper: /[A-Z]/.test(p), digit: /\d/.test(p), sym: /[^a-zA-Z0-9]/.test(p) };
        if (has.lower) size += 26; if (has.upper) size += 26; if (has.digit) size += 10; if (has.sym) size += 33;
        let bits = p.length * Math.log2(size || 1);
        const issues = [];
        if (/(.)\1{2,}/.test(p)) { bits *= .8; issues.push('Wiederholte Zeichen'); }
        if (/(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|wer|asd|yxc)/i.test(p)) { bits *= .8; issues.push('Zeichenfolgen (123, abc, qwe)'); }
        if (COMMON.some((w) => p.toLowerCase().includes(w))) { bits *= .5; issues.push('Enthält ein häufiges Passwort/Wort'); }
        if (/^\d+$/.test(p)) issues.push('Nur Ziffern');
        if (p.length && p.length < 12) issues.push('Kürzer als 12 Zeichen');
        const secs = 2 ** bits / 1e10 / 2; // 10 Mrd. Versuche/s (GPU-Cluster)
        const [c, l] = !p ? ['var(--surface-3)', ''] : bits < 40 ? ['var(--err)', 'Schwach'] : bits < 64 ? ['var(--warn)', 'Mittel'] : bits < 90 ? ['var(--ok)', 'Stark'] : ['var(--accent-text)', 'Sehr stark'];
        U.q('#bar').style.width = Math.min(100, bits / 1.28) + '%'; U.q('#bar').style.background = c;
        U.q('#sum').innerHTML = p ? `<b style="color:${c}">${l}</b> <span class="muted">· ≈ ${Math.round(bits)} Bit · Knackzeit offline: <b>${fmtTime(secs)}</b></span>` : '';
        const chk = (ok, t) => `<div class="row" style="margin:4px 0"><span class="badge ${ok ? 'ok' : 'err'}">${ok ? '✓' : '✗'}</span>${t}</div>`;
        U.q('#det').innerHTML = chk(p.length >= 12, `Länge: ${p.length} Zeichen (empfohlen ≥ 12)`) + chk(has.lower, 'Kleinbuchstaben') + chk(has.upper, 'Grossbuchstaben') + chk(has.digit, 'Ziffern') + chk(has.sym, 'Sonderzeichen') +
          (issues.length ? `<div class="msg err">Schwachstellen: ${issues.join(' · ')}</div>` : p ? '<div class="msg ok">Keine offensichtlichen Muster gefunden</div>' : '');
      };
      U.q('#pw').oninput = run;
      U.q('#show').onclick = () => { const i = U.q('#pw'); i.type = i.type === 'password' ? 'text' : 'password'; U.q('#show').textContent = i.type === 'password' ? 'Anzeigen' : 'Verbergen'; };
      run();
    },
  });

  const uuid4 = () => crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  const uuid7 = () => {
    const b = crypto.getRandomValues(new Uint8Array(16));
    let ts = BigInt(Date.now());
    for (let i = 5; i >= 0; i--) { b[i] = Number(ts & 0xffn); ts >>= 8n; }
    b[6] = (b[6] & 0x0f) | 0x70; b[8] = (b[8] & 0x3f) | 0x80;
    const h = window.TB.util.bytesToHex(b);
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };

  register({
    id: 'uuid', name: 'UUID Generator', glyph: 'ID', cat: 'security',
    desc: 'UUID v4 (zufällig) und v7 (zeitbasiert) einzeln oder in Mengen.', keywords: 'guid uuid4 uuid7 identifier',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:14px">
          <div class="seg" id="ver"><button class="on" data-v="4">v4 zufällig</button><button data-v="7">v7 zeitbasiert</button><button data-v="nil">NIL</button></div>
          <input type="number" id="n" value="5" min="1" max="1000" style="width:90px"/>
          <label class="check"><input type="checkbox" id="up"> Grossbuchstaben</label><label class="check"><input type="checkbox" id="nh"> Ohne Bindestriche</label><label class="check"><input type="checkbox" id="br"> {Klammern}</label>
          <span class="spacer"></span><button class="btn btn-primary" id="gen">${U.icon('refresh')}Generieren</button><button class="btn" data-copy="#out">${U.icon('copy')}Kopieren</button></div>
        <textarea id="out" readonly style="min-height:240px"></textarea></div>
        <div class="panel"><h3>UUID analysieren</h3><input id="ana" class="mono" placeholder="UUID einfügen …"/><div id="anaRes" style="margin-top:10px"></div></div>`;
      let v = '4';
      const gen = () => {
        const n = Math.min(1000, Math.max(1, +U.q('#n').value || 1));
        U.q('#out').value = Array.from({ length: n }, () => {
          let u = v === '4' ? uuid4() : v === '7' ? uuid7() : '00000000-0000-0000-0000-000000000000';
          if (U.q('#nh').checked) u = u.replace(/-/g, '');
          if (U.q('#up').checked) u = u.toUpperCase();
          if (U.q('#br').checked) u = '{' + u + '}';
          return u;
        }).join('\n');
      };
      U.q('#ver').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; v = b.dataset.v; U.qa('#ver button').forEach((x) => x.classList.toggle('on', x === b)); gen(); };
      ['#n', '#up', '#nh', '#br'].forEach((s) => U.q(s).addEventListener('input', gen));
      U.q('#gen').onclick = gen;
      U.q('#ana').oninput = () => {
        const s = U.q('#ana').value.trim().replace(/[{}]/g, '').toLowerCase();
        const h = s.replace(/-/g, '');
        if (!/^[0-9a-f]{32}$/.test(h)) { U.q('#anaRes').innerHTML = s ? '<div class="msg err">Keine gültige UUID</div>' : ''; return; }
        const ver = parseInt(h[12], 16), varN = parseInt(h[16], 16);
        const rows = [['Version', 'v' + ver], ['Variante', varN >= 8 && varN <= 11 ? 'RFC 4122 / 9562' : varN < 8 ? 'NCS (alt)' : 'Microsoft / reserviert']];
        if (ver === 7) rows.push(['Zeitstempel', new Date(parseInt(h.slice(0, 12), 16)).toLocaleString('de-CH')]);
        if (ver === 1) { const t = BigInt('0x' + h.slice(13, 16) + h.slice(8, 12) + h.slice(0, 8)); rows.push(['Zeitstempel', new Date(Number((t - 122192928000000000n) / 10000n)).toLocaleString('de-CH')]); }
        U.q('#anaRes').innerHTML = U.kv(rows);
      };
      gen();
    },
  });

  register({
    id: 'token', name: 'Token Generator', glyph: 'TKN', cat: 'security',
    desc: 'Zufällige API-Keys, Secrets und Tokens (Hex, Base64url, Alphanumerisch).', keywords: 'api key secret random string bytes',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:14px">
          <div class="seg" id="fmt"><button class="on" data-v="hex">Hex</button><button data-v="b64">Base64url</button><button data-v="alnum">Alphanumerisch</button></div>
          <label class="check">Bytes <input type="number" id="len" value="32" min="4" max="512" style="width:90px"></label>
          <label class="check">Präfix <input id="pre" placeholder="sk_live_" style="width:130px"></label>
          <span class="spacer"></span><button class="btn btn-primary" id="gen">${U.icon('refresh')}Neu</button></div>
        <div class="row"><div class="out grow" id="out" style="font-size:15px"></div><button class="btn" data-copy="#out">${U.icon('copy')}Kopieren</button></div>
        <div class="small muted" id="info" style="margin-top:8px"></div></div>`;
      let f = 'hex';
      const gen = () => {
        const n = Math.min(512, Math.max(4, +U.q('#len').value || 32));
        let t;
        if (f === 'hex') t = U.bytesToHex(crypto.getRandomValues(new Uint8Array(n)));
        else if (f === 'b64') t = U.bytesToB64(crypto.getRandomValues(new Uint8Array(n))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        else { const a = SETS.lower + SETS.upper + SETS.digits; t = Array.from({ length: Math.ceil(n * 8 / Math.log2(62)) }, () => a[U.randInt(62)]).join(''); }
        U.q('#out').textContent = U.q('#pre').value + t;
        U.q('#info').textContent = `${n * 8} Bit Zufall · ${t.length} Zeichen`;
      };
      U.q('#fmt').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; f = b.dataset.v; U.qa('#fmt button').forEach((x) => x.classList.toggle('on', x === b)); gen(); };
      U.q('#gen').onclick = gen; U.q('#len').oninput = gen; U.q('#pre').oninput = gen;
      gen();
    },
  });

  /* AES-GCM mit PBKDF2 */
  const deriveKey = async (pass, salt) => {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  };

  register({
    id: 'aes', name: 'Text verschlüsseln', glyph: 'AES', cat: 'security',
    desc: 'Texte mit AES-256-GCM und Passwort ver- und entschlüsseln.', keywords: 'encrypt decrypt aes gcm cipher secret note',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="row" style="margin-bottom:14px"><div class="seg" id="mode"><button class="on" data-v="enc">Verschlüsseln</button><button data-v="dec">Entschlüsseln</button></div>
          <input type="password" id="pass" placeholder="Passwort" style="width:260px"/><button class="btn btn-primary" id="go">Ausführen</button></div>
        <div class="cols"><div class="field"><div class="label">Eingabe</div><textarea id="in" spellcheck="false"></textarea></div>
        <div class="field"><div class="label">Ausgabe <span class="hint"><button class="copy-btn" data-copy="#out">${U.icon('copy')}</button></span></div><textarea id="out" readonly></textarea></div></div><div id="msg"></div>
        <p class="small muted">AES-256-GCM · Schlüssel via PBKDF2-SHA256 (310 000 Iterationen) · Format: Base64(Salt 16 B | IV 12 B | Ciphertext). Alles lokal.</p></div>`;
      let m = 'enc';
      U.q('#mode').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; m = b.dataset.v; U.qa('#mode button').forEach((x) => x.classList.toggle('on', x === b)); };
      U.q('#go').onclick = async () => {
        const pass = U.q('#pass').value, v = U.q('#in').value; U.q('#msg').innerHTML = '';
        if (!pass) { U.q('#msg').innerHTML = '<div class="msg err">Bitte Passwort eingeben</div>'; return; }
        try {
          if (m === 'enc') {
            const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
            const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(pass, salt), U.utf8.enc(v)));
            const all = new Uint8Array(28 + ct.length); all.set(salt); all.set(iv, 16); all.set(ct, 28);
            U.q('#out').value = U.bytesToB64(all);
          } else {
            const all = U.b64ToBytes(v.trim());
            const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(16, 28) }, await deriveKey(pass, all.slice(0, 16)), all.slice(28));
            U.q('#out').value = U.utf8.dec(new Uint8Array(pt));
          }
          U.q('#msg').innerHTML = '<div class="msg ok">Erfolgreich</div>';
        } catch { U.q('#msg').innerHTML = '<div class="msg err">Entschlüsselung fehlgeschlagen – falsches Passwort oder beschädigte Daten</div>'; }
      };
    },
  });

  register({
    id: 'basic-auth', name: 'Basic Auth Header', glyph: 'AUT', cat: 'security',
    desc: 'HTTP Basic-Authorization-Header aus Benutzer und Passwort erzeugen.', keywords: 'http authorization header curl',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="cols"><div class="field"><div class="label">Benutzer</div><input id="u" value="admin"/></div><div class="field"><div class="label">Passwort</div><input id="p" type="text"/></div></div></div><div class="panel"><div id="res"></div></div>`;
      const run = () => {
        const b = U.bytesToB64(U.utf8.enc(U.q('#u').value + ':' + U.q('#p').value));
        U.q('#res').innerHTML = U.kv([['Header', 'Authorization: Basic ' + b], ['Wert', 'Basic ' + b], ['curl', `curl -H "Authorization: Basic ${b}" https://…`], ['URL-Form', `https://${encodeURIComponent(U.q('#u').value)}:${encodeURIComponent(U.q('#p').value)}@host`]]);
      };
      U.q('#u').oninput = run; U.q('#p').oninput = run; run();
    },
  });

  /* TOTP (RFC 6238) */
  const b32dec = (s) => {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    s = s.toUpperCase().replace(/[\s=-]/g, '');
    let bits = '';
    for (const c of s) { const v = A.indexOf(c); if (v < 0) throw new Error('Ungültiges Base32'); bits += v.toString(2).padStart(5, '0'); }
    const out = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < out.length; i++) out[i] = parseInt(bits.substr(i * 8, 8), 2);
    return out;
  };
  const b32enc = (bytes) => {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = ''; for (const b of bytes) bits += b.toString(2).padStart(8, '0');
    let out = ''; for (let i = 0; i < bits.length; i += 5) out += A[parseInt(bits.substr(i, 5).padEnd(5, '0'), 2)];
    return out;
  };
  const totp = async (secret, step = 30, digits = 6, algo = 'SHA-1', t = Date.now()) => {
    const ctr = Math.floor(t / 1000 / step);
    const buf = new ArrayBuffer(8); const dv = new DataView(buf);
    dv.setUint32(0, Math.floor(ctr / 2 ** 32)); dv.setUint32(4, ctr >>> 0);
    const k = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: algo }, false, ['sign']);
    const h = new Uint8Array(await crypto.subtle.sign('HMAC', k, buf));
    const o = h[h.length - 1] & 15;
    const code = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 10 ** digits;
    return String(code).padStart(digits, '0');
  };
  window.TB.totp = totp; window.TB.b32dec = b32dec;

  register({
    id: 'totp', name: '2FA / TOTP Codes', glyph: '2FA', cat: 'security',
    desc: 'Einmal-Codes (Google Authenticator kompatibel) aus einem Secret berechnen.', keywords: 'otp 2fa mfa authenticator totp hotp',
    render(root, U) {
      root.innerHTML = `<div class="panel"><div class="field"><div class="label">Secret (Base32) oder otpauth:// URI</div><div class="row"><input id="sec" class="mono grow" placeholder="JBSWY3DPEHPK3PXP"/><button class="btn" id="new">Neues Secret</button></div></div>
        <div class="cols-3"><div class="field"><div class="label">Stellen</div><select id="dig"><option>6</option><option>8</option></select></div>
        <div class="field"><div class="label">Intervall (s)</div><input type="number" id="step" value="30" min="10"/></div>
        <div class="field"><div class="label">Algorithmus</div><select id="alg"><option>SHA-1</option><option>SHA-256</option><option>SHA-512</option></select></div></div></div>
        <div class="panel" style="text-align:center"><div class="totp" id="code">——————</div><div class="meter" style="max-width:320px;margin:12px auto 6px"><i id="bar" style="background:var(--accent-text)"></i></div>
        <div class="small muted" id="left"></div><div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-copy="#code">${U.icon('copy')}Code kopieren</button></div>
        <div class="small muted" style="margin-top:12px" id="nxt"></div><div id="msg"></div></div>`;
      const parse = () => {
        let s = U.q('#sec').value.trim();
        if (s.startsWith('otpauth://')) {
          try {
            const u = new URL(s); const p = u.searchParams;
            if (p.get('digits')) U.q('#dig').value = p.get('digits');
            if (p.get('period')) U.q('#step').value = p.get('period');
            if (p.get('algorithm')) U.q('#alg').value = p.get('algorithm').toUpperCase().replace('SHA', 'SHA-');
            s = p.get('secret') || '';
          } catch { /* ignore */ }
        }
        return s;
      };
      const tick = async () => {
        const step = Math.max(10, +U.q('#step').value || 30);
        const left = step - Math.floor(Date.now() / 1000) % step;
        U.q('#bar').style.width = (left / step * 100) + '%'; U.q('#left').textContent = `Gültig noch ${left} s`;
        const s = parse(); U.q('#msg').innerHTML = '';
        if (!s) { U.q('#code').textContent = '——————'; return; }
        try {
          const key = b32dec(s), d = +U.q('#dig').value, a = U.q('#alg').value;
          const c = await totp(key, step, d, a);
          U.q('#code').textContent = c;
          U.q('#nxt').textContent = 'Nächster Code: ' + await totp(key, step, d, a, Date.now() + step * 1000);
        } catch (e) { U.q('#code').textContent = '——————'; U.q('#msg').innerHTML = `<div class="msg err">${U.esc(e.message)}</div>`; }
      };
      U.q('#new').onclick = () => { U.q('#sec').value = b32enc(crypto.getRandomValues(new Uint8Array(20))); tick(); };
      ['#sec', '#dig', '#step', '#alg'].forEach((s) => U.q(s).addEventListener('input', tick));
      tick();
      const iv = setInterval(tick, 1000);
      return () => clearInterval(iv);
    },
  });
})();
