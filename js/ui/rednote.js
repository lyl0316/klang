// "Share to RedNote" (小红书) from a concert page's Share sheet: a ready-made post about the
// performance — a 3:4 picture card (1080 × 1440, RedNote's usual note shape) drawn on a canvas
// from the listing's facts, and a post title and text with emoji lines and hashtags, both editable.
//
// RedNote has no web share API, so the flow is the phone's own: "Share picture" copies the post text
// and opens the share sheet with the picture (pick 小红书 there, then paste the text); "Save picture",
// "Copy text" and "Open RedNote" (the app's xhsdiscover:// link) cover the other ways round.
// Nothing leaves the device until you share it. The card uses no images from the venue's site:
// only text from the listing, with the organiser credited.
//
// Text follows the interface language (Chinese for most RedNote readers; English otherwise). It names the
// organiser's website rather than pasting links, which RedNote doesn't make clickable and tends to hide.
//
// Export: openRedNoteSheet({ concert, items, when, venue, city, country, keepSheet })

import { h, icon, toast, download } from '../util.js';
import { openSheet } from './sheet.js';
import { roleText } from './components.js';
import { t, isZh, composerShort, countryName } from '../i18n.js';

const W = 1080;
const H = 1440;
const PAD = 88;
const TITLE_MAX = 20; // RedNote's title field takes 20 characters
const SERIF = '"Songti SC", "STSong", "Noto Serif SC", "Source Han Serif SC", Georgia, "Times New Roman", serif';
const SANS = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif';
const GOLD = '#d8b26a';
const INK = '#f6f1e7';
const MUTED = 'rgba(246, 241, 231, 0.62)';

const colon = () => (isZh() ? '：' : ': ');
const isOpera = (c) => /opera/i.test(c.type || '');

// "Mozart: Symphony No. 40" (composer as shown in the app, the work as published)
function workLine(it) {
  const comp = it.composer ? composerShort(it.composer) : it.composerShort || it.composerName || '';
  const work = it.rawTitle || [it.title, it.catalog].filter(Boolean).join(', ');
  return [comp, work].filter(Boolean).join(colon());
}

// Performers first by weight: the conductor, then soloists and ensembles (an opera's singers before its
// chorus and orchestra), then the rest; at most `max`.
function leadCredits(c, max) {
  const group = /orchest|ensemble|choir|chor|chorus|coro|quartet|quartett|trio/i;
  const rank = (cr) => {
    const text = `${cr.role || ''} ${cr.name || ''}`;
    if (/conduct|dirig|direction|leitung/i.test(cr.role || '') && !/chor|chorus|coro/i.test(cr.role || '')) return 0;
    if (isOpera(c)) return group.test(text) || /chor|chorus/i.test(cr.role || '') ? 2 : 1;
    return group.test(text) ? 1 : 2;
  };
  return (c.credits || []).map((cr, i) => ({ cr, i })).sort((a, b) => rank(a.cr) - rank(b.cr) || a.i - b.i).slice(0, max).map((x) => x.cr);
}

const creditLine = (cr) => (cr.role ? `${cr.name} · ${roleText(cr.role)}` : cr.name);

// '#古典音乐' style tags: kind of concert, city, country, up to two composers.
function hashtags(c, items, city, country) {
  const comps = [...new Set(items.map((it) => (it.composer ? composerShort(it.composer) : it.composerShort)).filter(Boolean))].slice(0, 2);
  const tags = isZh()
    ? ['古典音乐', isOpera(c) ? '歌剧' : '音乐会', city, country ? `${country}生活` : null, ...comps, '看演出']
    : ['ClassicalMusic', isOpera(c) ? 'Opera' : 'Concert', city, country, ...comps];
  return [...new Set(tags.filter(Boolean).map((x) => String(x).replace(/[\s'’.·-]+/g, '')))].map((x) => `#${x}`).join(' ');
}

// RedNote's title field: "City｜Title" when it fits, else the title, cut at a word when too long.
function postTitle(c, city) {
  const fits = (x) => [...x].length <= TITLE_MAX;
  const withCity = isZh() ? `${city ? `${city}｜` : ''}${c.title}` : `${c.title}${city ? ` · ${city}` : ''}`;
  if (fits(withCity)) return withCity;
  if (fits(c.title)) return c.title;
  const cut = [...c.title].slice(0, TITLE_MAX - 1).join('');
  const word = cut.replace(/\s+\S*$/, '').replace(/[\s&,;:·|–-]+$/, '');
  return `${word.length >= TITLE_MAX / 2 ? word : cut}…`;
}

function postBody({ concert: c, items, when, venue, city, country }) {
  const works = items.map(workLine).filter(Boolean);
  const people = leadCredits(c, 6);
  const where = [venue, city].filter(Boolean).join(isZh() ? '，' : ', ');
  const lines = isZh()
    ? [
      `🎻 ${c.title}`,
      c.series ? `✨ ${c.series}` : null,
      '',
      `📅 时间：${when}（当地时间）`,
      where ? `📍 地点：${where}` : null,
      works.length ? '' : null,
      works.length ? '🎼 曲目：' : null,
      ...works.slice(0, 8).map((w) => `· ${w}`),
      people.length ? '' : null,
      people.length ? '🎤 演出：' : null,
      ...people.map((cr) => `· ${cr.role ? `${roleText(cr.role)}：` : ''}${cr.name}`),
      '',
      '💭 我的期待：',
      '',
      c.sourceName ? `🎫 购票：${c.sourceName} 官网` : null,
      '📲 演出信息来自 Klang',
      '',
      hashtags(c, items, city, country),
    ]
    : [
      `🎻 ${c.title}`,
      c.series ? `✨ ${c.series}` : null,
      '',
      `📅 When: ${when} (local time)`,
      where ? `📍 Where: ${where}` : null,
      works.length ? '' : null,
      works.length ? '🎼 Programme:' : null,
      ...works.slice(0, 8).map((w) => `· ${w}`),
      people.length ? '' : null,
      people.length ? '🎤 Performers:' : null,
      ...people.map((cr) => `· ${cr.role ? `${roleText(cr.role)}: ` : ''}${cr.name}`),
      '',
      '💭 What I’m looking forward to: ',
      '',
      c.sourceName ? `🎫 Tickets: ${c.sourceName} website` : null,
      '📲 Found on Klang',
      '',
      hashtags(c, items, city, country),
    ];
  return lines.filter((x) => x !== null).join('\n').replace(/\n{3,}/g, '\n\n');
}

// ---------- the picture card ----------

// Break text into lines that fit `max` pixels: words for Latin text, characters for Chinese.
function wrap(ctx, text, max, maxLines) {
  const tokens = String(text || '').match(/[⺀-鿿豈-﫿＀-￯]|[^\s⺀-鿿豈-﫿＀-￯]+|\s+/g) || [];
  const lines = [];
  let line = '';
  const push = () => {
    if (line.trim()) lines.push(line.trim());
    line = '';
  };
  for (const tok of tokens) {
    if (ctx.measureText(line + tok).width <= max) {
      line += tok;
      continue;
    }
    if (/^\s+$/.test(tok)) {
      push();
      continue;
    }
    push();
    if (ctx.measureText(tok).width <= max) {
      line = tok;
      continue;
    }
    for (const ch of tok) { // one very long word: break it by characters
      if (ctx.measureText(line + ch).width > max) push();
      line += ch;
    }
  }
  push();
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > max) last = [...last].slice(0, -1).join('');
    kept[maxLines - 1] = `${last}…`;
    return kept;
  }
  return lines;
}

// Draws lines from y; returns the y below them.
function drawLines(ctx, lines, x, y, lineHeight) {
  for (const l of lines) {
    ctx.fillText(l, x, y);
    y += lineHeight;
  }
  return y;
}

function drawCard({ concert: c, items, when, venue, city, country }) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const inner = W - PAD * 2;

  const bg = ctx.createLinearGradient(0, 0, W * 0.4, H);
  bg.addColorStop(0, '#2a211b');
  bg.addColorStop(0.55, '#1b1714');
  bg.addColorStop(1, '#0f0d0c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, H * 0.08, 10, W * 0.85, H * 0.08, W * 0.75);
  glow.addColorStop(0, 'rgba(216, 178, 106, 0.22)');
  glow.addColorStop(1, 'rgba(216, 178, 106, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(216, 178, 106, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let y = PAD + 52;

  // kicker: kind of evening · city, country
  ctx.fillStyle = GOLD;
  ctx.font = `600 30px ${SANS}`;
  const kicker = [isZh() ? (isOpera(c) ? '歌剧' : '音乐会') : (isOpera(c) ? 'OPERA' : 'CONCERT'), [city, country].filter(Boolean).join(isZh() ? '·' : ', ')]
    .filter(Boolean).join('  ·  ');
  ctx.fillText(isZh() ? kicker : kicker.toUpperCase(), PAD, y);
  y += 78;

  // title: as large as fits in three lines
  ctx.fillStyle = INK;
  let size = 96;
  let lines;
  for (; size >= 56; size -= 6) {
    ctx.font = `700 ${size}px ${SERIF}`;
    lines = wrap(ctx, c.title, inner, 3);
    if (lines.length <= 2 || size <= 62) break;
  }
  y = drawLines(ctx, lines, PAD, y + size * 0.15, size * 1.18);
  if (c.series) {
    ctx.fillStyle = MUTED;
    ctx.font = `400 32px ${SANS}`;
    y = drawLines(ctx, wrap(ctx, c.series, inner, 2), PAD, y + 6, 44);
  }

  // date and place
  y += 34;
  ctx.fillStyle = GOLD;
  ctx.font = `600 44px ${SANS}`;
  y = drawLines(ctx, wrap(ctx, `📅  ${when}`, inner, 2), PAD, y, 58);
  ctx.fillStyle = INK;
  ctx.font = `500 36px ${SANS}`;
  y = drawLines(ctx, wrap(ctx, `📍  ${[venue, city].filter(Boolean).join(isZh() ? '，' : ', ')}`, inner, 2), PAD, y + 8, 50);

  // rule
  y += 28;
  ctx.fillStyle = 'rgba(216, 178, 106, 0.55)';
  ctx.fillRect(PAD, y, 120, 3);
  y += 64;

  const footerTop = H - PAD - 96;
  const section = (label, rows, rowFont, rowHeight) => {
    if (!rows.length || y > footerTop - 120) return;
    ctx.fillStyle = GOLD;
    ctx.font = `600 30px ${SANS}`;
    ctx.fillText(isZh() ? label : label.toUpperCase(), PAD, y);
    y += 52;
    ctx.font = rowFont;
    for (const row of rows) {
      const wrapped = wrap(ctx, row, inner, 2);
      if (y + rowHeight * (wrapped.length - 1) > footerTop - 30) {
        ctx.fillStyle = MUTED;
        ctx.fillText('…', PAD, y);
        y += rowHeight;
        break;
      }
      ctx.fillStyle = INK;
      y = drawLines(ctx, wrapped, PAD, y, rowHeight) + 8;
    }
    y += 36;
  };
  section(isZh() ? '曲目' : 'Programme', items.map(workLine).filter(Boolean).slice(0, 6), `400 38px ${SERIF}`, 52);
  section(isZh() ? '演出' : 'Performers', leadCredits(c, 5).map(creditLine), `400 36px ${SANS}`, 50);

  // footer: Klang + where the facts come from
  ctx.fillStyle = 'rgba(216, 178, 106, 0.35)';
  ctx.fillRect(PAD, footerTop, inner, 1.5);
  ctx.fillStyle = INK;
  ctx.font = `700 40px ${SERIF}`;
  ctx.fillText('Klang', PAD, footerTop + 62);
  ctx.fillStyle = MUTED;
  ctx.font = `400 24px ${SANS}`;
  ctx.textAlign = 'right';
  const src = c.sourceName ? (isZh() ? `信息来源：${c.sourceName}` : `Listing: ${c.sourceName}`) : '';
  ctx.fillText(wrap(ctx, src, inner - 200, 1)[0] || '', W - PAD, footerTop + 46);
  ctx.fillText(isZh() ? '在 Klang 发现古典音乐会' : 'Classical concerts on Klang', W - PAD, footerTop + 80);
  ctx.textAlign = 'left';
  return canvas;
}

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));

function fileName(c) {
  return `klang-${String(c.id).replace(/[^a-z0-9-]+/gi, '-').slice(0, 60)}.png`;
}

async function copy(text, ok) {
  try {
    await navigator.clipboard.writeText(text);
    if (ok) toast(t(ok));
    return true;
  } catch {
    toast(t('Couldn’t copy — select the text and copy it'));
    return false;
  }
}

// ---------- the sheet ----------
export function openRedNoteSheet(opts) {
  const { concert: c, keepSheet = (s) => s } = opts;
  const city = opts.city || '';
  const countryLabel = opts.country ? countryName(opts.country) : '';
  const data = { ...opts, city, country: countryLabel };

  const canvas = drawCard(data);
  const img = h('img', { class: 'rn-card', src: canvas.toDataURL('image/png'), alt: t('Picture for your post: {title}', { title: c.title }) });
  let file = null;
  toBlob(canvas).then((blob) => {
    if (blob) file = new File([blob], fileName(c), { type: 'image/png' });
  });

  const titleField = h('input', { class: 'input rn-title', type: 'text', value: postTitle(c, city), maxlength: String(TITLE_MAX + 4), 'aria-label': t('Post title') });
  const bodyField = h('textarea', { class: 'input rn-body', rows: '12', 'aria-label': t('Post text') });
  bodyField.value = postBody(data);
  const fullText = () => [titleField.value.trim(), bodyField.value.trim()].filter(Boolean).join('\n\n');

  const saveImage = async () => {
    const blob = file || (await toBlob(canvas));
    if (blob) download(fileName(c), blob, 'image/png');
  };

  // Started synchronously inside the tap, so iOS keeps the gesture for both the clipboard and the share sheet.
  const sharePicture = () => {
    const text = fullText();
    const copied = navigator.clipboard?.writeText(text).then(() => true, () => false) || Promise.resolve(false);
    if (file && navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] })
        .then(() => copied.then((ok) => ok && toast(t('Text copied — paste it into your RedNote post'))))
        .catch((err) => {
          if (err?.name !== 'AbortError') saveImage();
        });
      return;
    }
    saveImage();
    copied.then((ok) => toast(t(ok ? 'Picture saved and text copied — add both to a new RedNote post' : 'Picture saved')));
  };

  const body = h('div', { class: 'rn-sheet' },
    h('p', { class: 'hint rn-how' }, t('A ready-made post: tap Share picture, pick RedNote (小红书), then paste the text. You can edit the text first.')),
    img,
    h('div', { class: 'rn-actions' },
      h('button', { type: 'button', class: 'btn primary', onclick: sharePicture }, icon('share', 16), ' ', t('Share picture')),
      h('button', { type: 'button', class: 'btn', onclick: saveImage }, t('Save picture'))),
    h('label', { class: 'rn-label' }, t('Title'), titleField),
    h('label', { class: 'rn-label' }, t('Text'), bodyField),
    h('div', { class: 'rn-actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => copy(fullText(), 'Title and text copied') }, t('Copy text')),
      h('a', { class: 'btn', href: 'xhsdiscover://', onclick: () => copy(fullText()) }, t('Open RedNote'))),
    h('p', { class: 'hint' }, t('Long-press the picture to save it to Photos.')));

  return keepSheet(openSheet({
    title: t('Share to RedNote'),
    subtitle: c.title,
    body,
    footer: h('div', { class: 'hint' }, t('Nothing is sent until you share it. The picture uses only the listing’s facts.')),
  }));
}
