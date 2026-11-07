'use strict';

/**
 * Link Vault — personal link library.
 * Plain JS, no dependencies, no build step. Data lives in localStorage on the
 * device; nothing leaves the device except the public oEmbed lookups below
 * (YouTube / TikTok) when a link is added. No login, no tracking.
 */

var STORAGE_KEY = 'linkvault.links.v1';
var PLAN_KEY = 'linkvault.plan.v1';

/* ------------------------------------------------------------------ taxonomy
 * One primary category + up to two secondary tags, matched by keywords over
 * title + description + URL + note. Short keywords (<=4 chars) match on word
 * boundaries so "ai" does not match "said" and "eat" does not match "great".
 */
var TAXONOMY = [
  { name: 'Travel', keywords: ['trip', 'travel', 'hotel', 'flight', 'beach', 'itinerary', 'tour', 'vacation', 'holiday', 'destination', 'stay', 'airbnb', 'resort', 'hostel', 'backpack', 'road trip', 'sightseeing', 'cruise', 'island', 'city guide', 'getaway'] },
  { name: 'Food & Recipes', keywords: ['restaurant', 'recipe', 'cafe', 'coffee', 'dish', 'food', 'cook', 'cooking', 'baking', 'dinner', 'lunch', 'breakfast', 'cuisine', 'street food', 'bakery', 'eat', 'eatery', 'diner', 'bistro'] },
  { name: 'Tech & Gadgets', keywords: ['ai', 'artificial intelligence', 'app', 'phone', 'software', 'coding', 'code', 'programming', 'gadget', 'laptop', 'tech', 'developer', 'api', 'machine learning', 'llm', 'rag', 'robot', 'computer'] },
  { name: 'Finance & Money', keywords: ['money', 'finance', 'invest', 'stock', 'budget', 'saving', 'bank', 'credit card', 'crypto', 'tax', 'salary', 'wealth', 'loan', 'insurance', 'mutual fund'] },
  { name: 'Fitness & Health', keywords: ['fitness', 'workout', 'gym', 'health', 'yoga', 'running', 'diet', 'exercise', 'muscle', 'weight loss', 'meditation', 'sleep', 'run'] },
  { name: 'Entertainment', keywords: ['movie', 'film', 'show', 'series', 'netflix', 'trailer', 'celebrity', 'concert', 'festival', 'gaming', 'game', 'drama'] },
  { name: 'Music', keywords: ['music', 'song', 'album', 'singer', 'band', 'playlist', 'guitar', 'piano', 'lyrics'] },
  { name: 'Sports', keywords: ['sport', 'football', 'cricket', 'soccer', 'tennis', 'match', 'player', 'tournament', 'olympics', 'racing', 'f1'] },
  { name: 'Education & How-to', keywords: ['interview', 'tutorial', 'how to', 'learn', 'course', 'study', 'exam', 'guide', 'lesson', 'class', 'school', 'college', 'tips', 'roadmap', 'practice', 'problem', 'explained', 'beginner'] },
  { name: 'News & Current Affairs', keywords: ['news', 'breaking', 'politics', 'election', 'government', 'world', 'update', 'report'] },
  { name: 'Shopping & Deals', keywords: ['deal', 'discount', 'offer', 'sale', 'buy', 'shop', 'shopping', 'price', 'amazon', 'coupon', 'product', 'review'] },
  { name: 'Humour & Memes', keywords: ['funny', 'meme', 'humour', 'humor', 'joke', 'laugh', 'viral', 'prank', 'comedy'] },
  { name: 'Lifestyle & Home', keywords: ['lifestyle', 'home', 'decor', 'fashion', 'style', 'outfit', 'skincare', 'beauty', 'routine', 'house', 'garden', 'daily'] },
  { name: 'Nature & Outdoors', keywords: ['nature', 'outdoor', 'hiking', 'camping', 'wildlife', 'forest', 'mountain', 'river', 'lake', 'national park', 'trek', 'adventure'] },
  { name: 'Other', keywords: [] },
  { name: 'Uncategorised', keywords: [] }
];

/* ------------------------------------------------------------------ seed data
 * The first saved link. Only a short summary of the caption is stored here —
 * never the reel's full caption text.
 */
var SEED_LINKS = [
  {
    id: 'seed-meghana-ai-interview',
    url: 'https://www.instagram.com/reel/DfW6UKlIUD2/',
    sharedUrl: 'https://www.instagram.com/reel/DfW6UKlIUD2/?obrf=MjB6cW5yYTM5NTV0',
    platform: 'Instagram',
    title: 'Meghana | AI systems — 25 AI engineer interview problems',
    author: 'meghana.ai (verified) — Meghana | AI systems',
    description: 'AI engineer technical interview prep — a 25-problem practice list covering RAG systems, retrieval and reranking, LLM cost and latency, agents and memory, evals, prompt injection and PII, fine-tuning vs RAG vs prompting, and serving models at scale; ends with a link to a GitHub interview roadmap.',
    pinnedComment: '',
    category: 'Education & How-to',
    tags: ['Tech & Gadgets'],
    summary: '25-problem AI engineer interview practice list (RAG, agents, evals, fine-tuning, serving) from Meghana | AI systems.',
    note: '',
    thumbnail: '',
    postedDate: '2026-11-05',
    savedDate: '2026-11-06',
    source: 'seed'
  }
];

/* ------------------------------------------------------------------ state */

var links = loadLinks();
var planChecks = loadPlanChecks();
var state = { query: '', category: 'All', platform: 'All' };
var pendingAdd = null; // link being reviewed before save

function loadLinks() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_LINKS.slice();
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED_LINKS.slice();
    return parsed;
  } catch (e) {
    return SEED_LINKS.slice();
  }
}

function saveLinks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(links)); } catch (e) { /* storage full/blocked */ }
}

function loadPlanChecks() {
  try { return JSON.parse(localStorage.getItem(PLAN_KEY) || '{}') || {}; } catch (e) { return {}; }
}

function savePlanChecks() {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(planChecks)); } catch (e) { /* ignore */ }
}

/* ------------------------------------------------------------------ helpers */

function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function newId() {
  return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function platformEmoji(platform) {
  return { Instagram: '📸', YouTube: '▶️', TikTok: '🎵', Facebook: '👍', X: '𝕏', Other: '🔗' }[platform] || '🔗';
}

function categoryBadgeClass(category) {
  return category === 'Uncategorised' ? 'badge uncat' : 'badge';
}

/* ------------------------------------------------------------------ URLs */

var TRACKING_PARAMS = ['obrf', 'igsh', 'si', 'fbclid', 'share_source', 'ref'];

function normalizeUrl(rawUrl) {
  var trimmed = String(rawUrl || '').trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) trimmed = 'https://' + trimmed;
  var u;
  try { u = new URL(trimmed); } catch (e) { return trimmed; }
  var params = new URLSearchParams(u.search);
  TRACKING_PARAMS.forEach(function (p) { params.delete(p); });
  Array.from(params.keys()).forEach(function (k) {
    if (k.toLowerCase().indexOf('utm_') === 0) params.delete(k);
  });
  var search = params.toString();
  u.search = search ? '?' + search : '';
  return u.toString();
}

function detectPlatform(rawUrl) {
  var host = '';
  try { host = new URL(rawUrl).hostname.toLowerCase(); } catch (e) { return 'Other'; }
  if (host.indexOf('instagram.com') !== -1) return 'Instagram';
  if (host.indexOf('youtube.com') !== -1 || host.indexOf('youtu.be') !== -1) return 'YouTube';
  if (host.indexOf('tiktok.com') !== -1) return 'TikTok';
  if (host.indexOf('facebook.com') !== -1 || host.indexOf('fb.watch') !== -1) return 'Facebook';
  if (host.indexOf('x.com') !== -1 || host.indexOf('twitter.com') !== -1) return 'X';
  return 'Other';
}

/* Title guess from the URL path, clearly marked as a guess in the UI. */
function guessTitleFromUrl(rawUrl) {
  try {
    var u = new URL(rawUrl);
    var parts = u.pathname.split('/').filter(Boolean);
    var slug = parts[parts.length - 1] || u.hostname;
    slug = decodeURIComponent(slug).replace(/[-_]+/g, ' ').replace(/\.[a-z0-9]+$/i, '').replace(/\s+/g, ' ').trim();
    if (!slug) return u.hostname;
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  } catch (e) {
    return rawUrl;
  }
}

/* ------------------------------------------------------------------ metadata
 * YouTube and TikTok publish public oEmbed endpoints (no key, no login).
 * Instagram has no reliable public metadata endpoint, so for Instagram and
 * everything else the title is guessed from the URL and the user pastes the
 * description themselves in the review step.
 */
function fetchWithTimeout(url, ms) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, ms);
  return fetch(url, { signal: controller.signal }).finally(function () { clearTimeout(timer); });
}

function fetchMetadata(rawUrl, platform) {
  var endpoint = null;
  if (platform === 'YouTube') {
    endpoint = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(rawUrl) + '&format=json';
  } else if (platform === 'TikTok') {
    endpoint = 'https://www.tiktok.com/oembed?url=' + encodeURIComponent(rawUrl);
  }
  if (!endpoint) return Promise.resolve({ title: '', author: '', thumbnail: '', description: '', fetched: false });
  return fetchWithTimeout(endpoint, 8000)
    .then(function (r) { if (!r.ok) throw new Error('oEmbed HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      return {
        title: d.title || '', author: d.author_name || '',
        thumbnail: d.thumbnail_url || '', description: '', fetched: true
      };
    })
    .catch(function () { return { title: '', author: '', thumbnail: '', description: '', fetched: false }; });
}

/* ------------------------------------------------------------------ categorise */

function keywordHit(text, kw) {
  var k = String(kw).toLowerCase();
  if (!k) return false;
  if (k.length <= 4) {
    var safe = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('\\b' + safe + '\\b').test(text);
  }
  return text.indexOf(k) !== -1;
}

function categorize(title, description, url, note) {
  var text = [title, description, url, note].join(' ').toLowerCase();
  var scored = [];
  TAXONOMY.forEach(function (cat) {
    if (cat.name === 'Other' || cat.name === 'Uncategorised') return;
    var score = 0;
    cat.keywords.forEach(function (kw) { if (keywordHit(text, kw)) score += 1; });
    if (score > 0) scored.push({ name: cat.name, score: score });
  });
  scored.sort(function (a, b) { return b.score - a.score; });
  if (!scored.length) return { category: 'Uncategorised', tags: [] };
  return {
    category: scored[0].name,
    tags: scored.slice(1, 3).map(function (s) { return s.name; })
  };
}

function makeSummary(title, description) {
  var text = (description || '').trim() || (title || '').trim();
  if (!text) return '';
  // First sentence: scan for . ! ? followed by a space or end-of-text.
  // (Deliberately no regex lookbehind, so old WebViews parse this file.)
  var end = -1;
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    if ((ch === '.' || ch === '!' || ch === '?') && (i === text.length - 1 || text.charAt(i + 1) === ' ')) { end = i; break; }
  }
  var first = end === -1 ? text : text.slice(0, end + 1);
  if (first.length > 160) first = first.slice(0, 157).trim() + '…';
  return first;
}

/* ------------------------------------------------------------------ add flow */

function setStatus(msg, isError) {
  var el = $('addStatus');
  el.textContent = msg;
  el.className = 'status' + (isError ? ' error' : '');
}

function findByUrl(normalisedUrl) {
  for (var i = 0; i < links.length; i++) {
    if (links[i].url === normalisedUrl) return links[i];
  }
  return null;
}

function onAddSubmit(event) {
  event.preventDefault();
  var rawUrl = $('urlInput').value;
  var note = $('noteInput').value.trim();
  var url = normalizeUrl(rawUrl);
  var platform = detectPlatform(url);

  var existing = findByUrl(url);
  if (existing) {
    if (note) { existing.note = note; saveLinks(); renderAll(); }
    setStatus('That link is already in your vault — opened it for editing instead.', false);
    openDetail(existing.id);
    return;
  }

  setStatus('Fetching what I can about this link…', false);
  $('addForm').querySelector('button[type="submit"]').disabled = true;

  fetchMetadata(url, platform).then(function (meta) {
    $('addForm').querySelector('button[type="submit"]').disabled = false;
    var title = meta.title || guessTitleFromUrl(url);
    var titleGuessed = !meta.title;
    var cat = categorize(title, meta.description || '', url, note);

    pendingAdd = {
      id: newId(), url: url, sharedUrl: rawUrl.trim(), platform: platform,
      title: title, author: meta.author || '', description: meta.description || '',
      pinnedComment: '', category: cat.category, tags: cat.tags,
      summary: '', note: note, thumbnail: meta.thumbnail || '',
      postedDate: '', savedDate: todayISO(), source: 'user', titleGuessed: titleGuessed
    };

    $('revTitle').value = pendingAdd.title;
    $('revAuthor').value = pendingAdd.author;
    $('revDesc').value = pendingAdd.description;
    $('revCategory').textContent = pendingAdd.category;
    $('revCategory').className = categoryBadgeClass(pendingAdd.category);
    $('fetchHint').textContent = meta.fetched
      ? 'Title and author came from the video page. Edit anything below, then save.'
      : (platform === 'Instagram'
        ? 'Instagram has no public metadata endpoint, so the title is a guess from the link — please fix it and paste the caption/description below.'
        : 'No public details were available for this link — the title is a guess from the link. Fix it and add a description below.');
    $('reviewPanel').hidden = false;
    $('reviewPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setStatus('', false);
  });
}

function onSaveReviewed() {
  if (!pendingAdd) return;
  pendingAdd.title = $('revTitle').value.trim() || pendingAdd.title;
  pendingAdd.author = $('revAuthor').value.trim();
  pendingAdd.description = $('revDesc').value.trim();
  var cat = categorize(pendingAdd.title, pendingAdd.description, pendingAdd.url, pendingAdd.note);
  pendingAdd.category = cat.category;
  pendingAdd.tags = cat.tags;
  pendingAdd.summary = makeSummary(pendingAdd.title, pendingAdd.description);
  delete pendingAdd.titleGuessed;

  var dup = findByUrl(pendingAdd.url);
  if (dup) { setStatus('That link is already in your vault.', true); pendingAdd = null; $('reviewPanel').hidden = true; return; }

  links.unshift(pendingAdd);
  saveLinks();
  pendingAdd = null;
  $('reviewPanel').hidden = true;
  $('addForm').reset();
  renderAll();
  setStatus('Saved to your vault.', false);
}

function onCancelAdd() {
  pendingAdd = null;
  $('reviewPanel').hidden = true;
  setStatus('', false);
}

/* ------------------------------------------------------------------ library view */

function visibleLinks() {
  var q = state.query.trim().toLowerCase();
  return links.filter(function (l) {
    if (state.category !== 'All' && l.category !== state.category) return false;
    if (state.platform !== 'All' && l.platform !== state.platform) return false;
    if (!q) return true;
    var hay = [l.title, l.description, l.summary, l.author, l.category, (l.tags || []).join(' '), l.url, l.note].join(' ').toLowerCase();
    return q.split(/\s+/).every(function (word) { return hay.indexOf(word) !== -1; });
  });
}

function renderChips() {
  var catsPresent = [];
  TAXONOMY.forEach(function (cat) {
    if (links.some(function (l) { return l.category === cat.name; })) catsPresent.push(cat.name);
  });
  var catHtml = ['All'].concat(catsPresent).map(function (c) {
    return '<button type="button" class="chip' + (state.category === c ? ' active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>';
  }).join('');
  $('categoryChips').innerHTML = catHtml;

  var platforms = ['All', 'Instagram', 'YouTube', 'TikTok', 'Other'];
  $('platformChips').innerHTML = platforms.map(function (p) {
    return '<button type="button" class="chip' + (state.platform === p ? ' active' : '') + '" data-plat="' + esc(p) + '">' + esc(p) + '</button>';
  }).join('');
}

function cardHtml(l) {
  var thumb = l.thumbnail
    ? '<img class="thumb" src="' + esc(l.thumbnail) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
    : '<div class="thumb-placeholder" aria-hidden="true">' + platformEmoji(l.platform) + '</div>';
  var tags = (l.tags || []).map(function (t) { return '<span class="badge tag">' + esc(t) + '</span>'; }).join('');
  return '<article class="link-card">' + thumb +
    '<div class="link-body">' +
      '<h3 class="link-title"><a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.title || l.url) + '</a></h3>' +
      '<p class="link-meta">' + esc(l.author || l.platform) + (l.postedDate ? ' · ' + esc(l.postedDate) : '') + ' · saved ' + esc(l.savedDate || '') + '</p>' +
      '<div class="badges"><span class="badge platform">' + esc(l.platform) + '</span>' +
      '<span class="' + categoryBadgeClass(l.category) + '">' + esc(l.category) + '</span>' + tags + '</div>' +
      (l.summary ? '<p class="link-summary">' + esc(l.summary) + '</p>' : '') +
      '<div class="card-actions">' +
        '<a class="btn small" href="' + esc(l.url) + '" target="_blank" rel="noopener">Open ↗</a>' +
        '<button class="btn small" type="button" data-details="' + esc(l.id) + '">Details</button>' +
        '<button class="btn small danger" type="button" data-delete="' + esc(l.id) + '">Delete</button>' +
      '</div>' +
    '</div></article>';
}

function renderGrid() {
  var shown = visibleLinks();
  $('grid').innerHTML = shown.map(cardHtml).join('');
  $('emptyState').hidden = shown.length !== 0;
  $('countLine').textContent = 'Showing ' + shown.length + ' of ' + links.length + ' saved link' + (links.length === 1 ? '' : 's');
  renderChips();
}

function renderAll() { renderGrid(); }

/* ------------------------------------------------------------------ detail modal */

function openDetail(id) {
  var l = null;
  links.forEach(function (x) { if (x.id === id) l = x; });
  if (!l) return;
  var catOptions = TAXONOMY.map(function (c) {
    return '<option value="' + esc(c.name) + '"' + (l.category === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>';
  }).join('');
  $('modalBody').innerHTML =
    (l.thumbnail ? '<img class="thumb" src="' + esc(l.thumbnail) + '" alt="">' : '') +
    '<h2>' + esc(l.title || l.url) + '</h2>' +
    '<p class="link-meta">' + esc(l.platform) + ' · ' + esc(l.author || 'unknown author') + ' · posted ' + esc(l.postedDate || 'unknown') + ' · saved ' + esc(l.savedDate || '') + '</p>' +
    '<dl>' +
      '<dt>Description</dt><dd>' + esc(l.description || '—') + '</dd>' +
      '<dt>First pinned comment</dt><dd>' + esc(l.pinnedComment || '— none recorded —') + '</dd>' +
      '<dt>Summary</dt><dd>' + esc(l.summary || '—') + '</dd>' +
      (l.note ? '<dt>Your note</dt><dd>' + esc(l.note) + '</dd>' : '') +
    '</dl>' +
    '<form id="editForm">' +
      '<label>Title<input name="title" type="text" value="' + esc(l.title || '') + '"></label>' +
      '<label>Author<input name="author" type="text" value="' + esc(l.author || '') + '"></label>' +
      '<label>Description<textarea name="description" rows="4">' + esc(l.description || '') + '</textarea></label>' +
      '<label>First pinned comment<textarea name="pinnedComment" rows="2">' + esc(l.pinnedComment || '') + '</textarea></label>' +
      '<label>Category<select name="category">' + catOptions + '</select></label>' +
      '<label>Tags (comma-separated)<input name="tags" type="text" value="' + esc((l.tags || []).join(', ')) + '"></label>' +
      '<label>Your note<input name="note" type="text" value="' + esc(l.note || '') + '"></label>' +
      '<div class="row">' +
        '<button class="btn primary" type="submit">Save changes</button>' +
        '<a class="btn" href="' + esc(l.url) + '" target="_blank" rel="noopener">Open original ↗</a>' +
        '<button class="btn danger" type="button" id="modalDelete">Delete</button>' +
      '</div>' +
    '</form>';
  $('modal').hidden = false;

  $('editForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = ev.target;
    l.title = f.title.value.trim() || l.title;
    l.author = f.author.value.trim();
    l.description = f.description.value.trim();
    l.pinnedComment = f.pinnedComment.value.trim();
    l.category = f.category.value;
    l.tags = f.tags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 2);
    l.note = f.note.value.trim();
    l.summary = makeSummary(l.title, l.description);
    saveLinks();
    closeModal();
    renderAll();
  });
  $('modalDelete').addEventListener('click', function () {
    if (confirm('Delete this link from your vault?')) {
      links = links.filter(function (x) { return x.id !== l.id; });
      saveLinks();
      closeModal();
      renderAll();
    }
  });
}

function closeModal() { $('modal').hidden = true; $('modalBody').innerHTML = ''; }

/* ------------------------------------------------------------------ plan mode
 * Groups matching links into labelled sections. Never invents options: when
 * nothing matches, it says so and suggests adding links.
 */
var PLANS = {
  trip: {
    label: 'trip',
    sections: [
      { title: 'Places to stay', test: function (l) { return l.category === 'Travel' && /hotel|stay|airbnb|resort|villa|hostel|lodge|\bbnb\b/i.test(l.title + ' ' + l.description); } },
      { title: 'Food & restaurants', test: function (l) { return l.category === 'Food & Recipes'; } },
      { title: 'Transport & tips', test: function (l) { return /flight|train|transport|taxi|metro|visa|passport|packing|budget/i.test(l.title + ' ' + l.description + ' ' + l.category); } },
      { title: 'Things to do', test: function (l) { return l.category === 'Travel' || l.category === 'Entertainment' || l.category === 'Nature & Outdoors'; } }
    ]
  },
  restaurant: {
    label: 'restaurant outing',
    sections: [
      { title: 'Restaurants & cafes', test: function (l) { return l.category === 'Food & Recipes' && /restaurant|caf[eé]|coffee|eatery|diner|bistro|bar/i.test(l.title + ' ' + l.description); } },
      { title: 'Dishes to try', test: function (l) { return l.category === 'Food & Recipes' && /recipe|dish|must.?try|signature|cook/i.test(l.title + ' ' + l.description); } },
      { title: 'Areas & tips', test: function (l) { return l.category === 'Food & Recipes'; } }
    ]
  },
  learn: {
    label: 'learning',
    sections: [
      { title: 'Education & How-to', test: function (l) { return l.category === 'Education & How-to'; } },
      { title: 'Tech & Gadgets', test: function (l) { return l.category === 'Tech & Gadgets' || (l.tags || []).indexOf('Tech & Gadgets') !== -1; } }
    ]
  }
};

function runPlan(goalKey, customKeyword) {
  var planKey = goalKey === 'custom' ? 'custom:' + (customKeyword || '').toLowerCase() : goalKey;
  var sections = [];
  var total = 0;

  if (goalKey === 'custom') {
    var q = (customKeyword || '').trim().toLowerCase();
    if (!q) { $('planResults').innerHTML = '<p class="plan-empty">Type a keyword above to plan around it.</p>'; return; }
    var matched = links.filter(function (l) {
      var hay = [l.title, l.description, l.summary, l.author, l.category, (l.tags || []).join(' '), l.url, l.note].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    var byCat = {};
    matched.forEach(function (l) { (byCat[l.category] = byCat[l.category] || []).push(l); });
    Object.keys(byCat).sort().forEach(function (cat) { sections.push({ title: cat, links: byCat[cat] }); });
    total = matched.length;
    renderPlan(planKey, '“' + customKeyword + '”', sections, total);
    return;
  }

  var plan = PLANS[goalKey];
  var used = {};
  plan.sections.forEach(function (sec) {
    var hits = links.filter(function (l) { return !used[l.id] && sec.test(l); });
    hits.forEach(function (l) { used[l.id] = true; });
    if (hits.length) sections.push({ title: sec.title, links: hits });
  });
  total = Object.keys(used).length;
  renderPlan(planKey, plan.label, sections, total);
}

function renderPlan(planKey, label, sections, total) {
  var box = $('planResults');
  if (!total) {
    box.innerHTML = '<p class="plan-empty">No saved links match this ' + esc(label) + ' yet. Add a few links first — paste a URL above and categorise it — then come back here.</p>';
    return;
  }
  var checks = planChecks[planKey] || {};
  var summaryBits = sections.map(function (s) {
    return s.links.length + ' ' + s.title.toLowerCase();
  }).join(' · ');
  var html = '<p class="plan-summary">Found ' + total + ' link' + (total === 1 ? '' : 's') + ' for your ' + esc(label) + ': ' + esc(summaryBits) + '.</p>';
  sections.forEach(function (sec) {
    html += '<div class="plan-section"><h4>' + esc(sec.title) + ' (' + sec.links.length + ')</h4>';
    sec.links.forEach(function (l) {
      var checked = !!checks[l.id];
      html += '<label class="plan-item' + (checked ? ' done' : '') + '">' +
        '<input type="checkbox" data-plan="' + esc(planKey) + '" data-link="' + esc(l.id) + '"' + (checked ? ' checked' : '') + '>' +
        '<span><span class="plan-title" data-details="' + esc(l.id) + '">' + esc(l.title || l.url) + '</span><br>' +
        '<span class="plan-meta">' + esc(l.platform) + ' · ' + esc(l.category) + (l.summary ? ' · ' + esc(l.summary) : '') + '</span></span>' +
        '</label>';
    });
    html += '</div>';
  });
  box.innerHTML = html;
}

/* ------------------------------------------------------------------ export / import */

function exportLinks() {
  var blob = new Blob([JSON.stringify(links, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'link-vault-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}

function importLinks(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var parsed = JSON.parse(String(reader.result));
      if (!Array.isArray(parsed)) throw new Error('not an array');
      var added = 0, updated = 0;
      parsed.forEach(function (item) {
        if (!item || typeof item.url !== 'string') return;
        var url = normalizeUrl(item.url);
        var existing = findByUrl(url);
        var cleaned = {
          id: item.id || newId(), url: url, sharedUrl: item.sharedUrl || url,
          platform: item.platform || detectPlatform(url),
          title: item.title || guessTitleFromUrl(url), author: item.author || '',
          description: item.description || '', pinnedComment: item.pinnedComment || '',
          category: item.category || 'Uncategorised', tags: Array.isArray(item.tags) ? item.tags.slice(0, 2) : [],
          summary: item.summary || makeSummary(item.title || '', item.description || ''),
          note: item.note || '', thumbnail: item.thumbnail || '',
          postedDate: item.postedDate || '', savedDate: item.savedDate || todayISO(), source: 'import'
        };
        if (existing) { Object.assign(existing, cleaned, { id: existing.id }); updated += 1; }
        else { links.unshift(cleaned); added += 1; }
      });
      saveLinks();
      renderAll();
      setStatus('Imported: ' + added + ' new, ' + updated + ' updated.', false);
    } catch (e) {
      setStatus('Could not import that file — it is not a valid Link Vault JSON export.', true);
    }
  };
  reader.readAsText(file);
}

/* ------------------------------------------------------------------ wiring */

function init() {
  $('addForm').addEventListener('submit', onAddSubmit);
  $('saveLinkBtn').addEventListener('click', onSaveReviewed);
  $('cancelAddBtn').addEventListener('click', onCancelAdd);
  $('searchInput').addEventListener('input', function (e) { state.query = e.target.value; renderGrid(); });

  $('categoryChips').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cat]');
    if (!btn) return;
    state.category = btn.getAttribute('data-cat');
    renderGrid();
  });
  $('platformChips').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-plat]');
    if (!btn) return;
    state.platform = btn.getAttribute('data-plat');
    renderGrid();
  });

  $('grid').addEventListener('click', function (e) {
    var det = e.target.closest('[data-details]');
    if (det) { openDetail(det.getAttribute('data-details')); return; }
    var del = e.target.closest('[data-delete]');
    if (del) {
      var id = del.getAttribute('data-delete');
      if (confirm('Delete this link from your vault?')) {
        links = links.filter(function (x) { return x.id !== id; });
        saveLinks();
        renderAll();
      }
    }
  });

  $('modalClose').addEventListener('click', closeModal);
  $('modal').addEventListener('click', function (e) { if (e.target === $('modal')) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  document.querySelectorAll('[data-goal]').forEach(function (btn) {
    btn.addEventListener('click', function () { runPlan(btn.getAttribute('data-goal')); });
  });
  $('customPlanBtn').addEventListener('click', function () { runPlan('custom', $('customKeyword').value); });
  $('customKeyword').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); runPlan('custom', $('customKeyword').value); }
  });

  $('planResults').addEventListener('change', function (e) {
    var box = e.target.closest('[data-plan]');
    if (!box) return;
    var key = box.getAttribute('data-plan');
    var id = box.getAttribute('data-link');
    planChecks[key] = planChecks[key] || {};
    if (box.checked) planChecks[key][id] = true; else delete planChecks[key][id];
    savePlanChecks();
    box.closest('.plan-item').classList.toggle('done', box.checked);
  });
  $('planResults').addEventListener('click', function (e) {
    var t = e.target.closest('[data-details]');
    if (t) openDetail(t.getAttribute('data-details'));
  });

  $('exportBtn').addEventListener('click', exportLinks);
  $('importFile').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) importLinks(e.target.files[0]);
    e.target.value = '';
  });

  if ('serviceWorker' in navigator && window.location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline support unavailable */ });
    });
  }

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
