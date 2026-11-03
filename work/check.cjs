const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const catalogSource = fs.readFileSync(path.join(root, 'dist/catalog.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
const storageKey = 'spider-link-v1';
const plain = value => JSON.parse(JSON.stringify(value));

// A small DOM fixture runs the real application and event handlers. Replacing
// the rendered card grid recreates its nodes, including when a filter changes.
function launch(stored = {}) {
  const handlers = {}, elements = {}, downloads = [], blobs = new Map();
  let cards = [];
  const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g,
    (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[entity]));
  function el(selector) {
    if (elements[selector]) return elements[selector];
    let html = '';
    const attributes = {};
    const element = {
      textContent: '', style: {}, dataset: {}, values: {}, hidden: false,
      classList: { toggle() {} }, addEventListener() {}, scrollIntoView() {},
      setAttribute(name, value) { attributes[name] = value; },
      getAttribute(name) { return attributes[name]; },
      showModal() { this.open = true; }, close() { this.open = false; },
    };
    Object.defineProperty(element, 'innerHTML', {
      get: () => html,
      set(value) {
        html = value;
        if (selector === '#heroCards') {
          cards = [...html.matchAll(/<article class="catalog-entry" data-index="(\d+)"/g)]
            .map(match => ({ dataset: { index: match[1] }, hidden: false }));
        }
        if (selector !== '#content') return;
        cards = [];
        if (!html.includes('id="passportForm"')) return;
        const values = {};
        for (const name of ['name', 'earth', 'power', 'motto']) {
          const input = html.match(new RegExp(`<input name="${name}"[^>]*>`));
          values[name] = decode(input?.[0].match(/value="([^"]*)"/)?.[1] || '');
        }
        values.status = decode(html.match(/<option selected>([^<]*)<\/option>/)?.[1] || '');
        el('#passportForm').values = values;
      },
    });
    return elements[selector] = element;
  }
  const ctx = {
    console, Blob, setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    URL: {
      createObjectURL(blob) { const url = 'blob:test-' + blobs.size; blobs.set(url, blob); return url; },
      revokeObjectURL(url) { blobs.delete(url); },
    },
    localStorage: { getItem: key => stored[key], setItem: (key, value) => { stored[key] = value; } },
    document: {
      querySelector: el,
      querySelectorAll: selector => selector === '.catalog-entry' ? cards : [],
      addEventListener: (name, handler) => { handlers[name] = handler; },
      createElement(tag) {
        assert.equal(tag, 'a', 'only backup links are created in this fixture');
        return { click() { downloads.push({ href: this.href, filename: this.download }); } };
      },
    },
    window: { scrollTo() {} },
    FormData: class {
      constructor(form) { this.values = form.values; }
      get(key) { return this.values[key] ?? null; }
    },
  };
  vm.createContext(ctx);
  vm.runInContext(catalogSource, ctx, { filename: 'dist/catalog.js' });
  vm.runInContext(appSource, ctx, { filename: 'dist/app.js' });
  const run = source => vm.runInContext(source, ctx);
  function click(dataset, disabled = false) {
    const button = {
      dataset, disabled, classList: { contains: () => false },
      hasAttribute: attribute => Object.hasOwn(dataset,
        attribute.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())),
    };
    return handlers.click({ target: { closest: () => button } });
  }
  const submit = (id, values, dataset = {}) =>
    handlers.submit({ preventDefault() {}, target: { id, values, dataset } });
  const search = query => handlers.input({ target: { id: 'catalogSearch', value: query } });
  const change = (id, value, files) => handlers.change({ target: { id, value, files } });
  return { run, click, submit, search, change, el, stored, downloads, blobs,
    cards: () => cards.map(card => Number(card.dataset.index)) };
}

function imageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

async function main() {
  const fixture = launch();
  const { run, click, submit, search, change, el, stored } = fixture;
  const heroes = plain(run('heroes'));
  const profiles = plain(run('quizProfiles'));
  const recommend = run('recommendHero');
  const matches = run('matchesHero');
  const count = heroes.length;
  assert(count >= 22, 'retain the existing catalog while allowing expansion');
  assert.equal(new Set(heroes.map(hero => hero.id)).size, count, 'unique hero identities');
  assert.deepEqual(heroes.slice(0, 6).map(hero => hero.id),
    ['miles', 'gwen', 'peter', 'hobie', 'miguel', 'pavitr'], 'stable legacy passport indices');
  for (const hero of heroes) {
    assert.match(hero.id, /^[a-z0-9-]+$/, `${hero.id}: stable ASCII identity`);
    assert.match(hero.image, /^assets\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i, `${hero.id}: local illustration`);
    const image = fs.readFileSync(path.join(root, 'dist', hero.image));
    assert(image.length > 100, `${hero.id}: nonempty illustration`);
    assert(imageType(image), `${hero.id}: valid JPEG, PNG or WebP header`);
    assert.equal(new URL(hero.source).protocol, 'https:', `${hero.id}: source link`);
    if (hero.imageSource) assert.equal(new URL(hero.imageSource).protocol, 'https:', `${hero.id}: image source`);
    assert(hero.name && hero.alias && hero.power && hero.trait, `${hero.id}: useful character metadata`);
  }

  const responsesFor = counts => counts.flatMap((amount, category) => Array(amount).fill(category));
  const profileKeys = new Set();
  for (const [index, hero] of heroes.entries()) {
    const profile = profiles[hero.id];
    assert.equal(profile.length, 6, `${hero.id}: six answer categories`);
    assert(profile.every(amount => Number.isInteger(amount) && amount >= 0), `${hero.id}: valid profile counts`);
    assert.equal(profile.reduce((sum, amount) => sum + amount, 0), 7, `${hero.id}: seven-answer profile`);
    assert(!profileKeys.has(profile.join(',')), `${hero.id}: unique quiz result`);
    profileKeys.add(profile.join(','));
    const responses = responsesFor(profile);
    assert.equal(recommend(responses), index, `${hero.id}: exact profile recommends own hero`);
    run("go('quiz')"); click({ action: 'restart' });
    for (const answer of responses) click({ answer: String(answer) });
    assert(el('#content').innerHTML.includes(`data-result="${index}"`), `${hero.id}: result through actual quiz controls`);
    assert(el('#content').innerHTML.includes(`src="${hero.image}"`), `${hero.id}: quiz artwork`);
  }
  for (let index = 0; index < 6; index++)
    assert.equal(recommend(Array(7).fill(index)), index, 'original six consistent-answer results');
  const reachable = new Set();
  let combinations = 0;
  function enumerateCounts(prefix, remaining) {
    if (prefix.length === 5) {
      const result = recommend(responsesFor([...prefix, remaining]));
      assert(Number.isInteger(result) && result >= 0 && result < count, 'valid result for every pattern');
      reachable.add(result); combinations++; return;
    }
    for (let amount = 0; amount <= remaining; amount++) enumerateCounts([...prefix, amount], remaining - amount);
  }
  enumerateCounts([], 7);
  assert.equal(combinations, 792, 'all seven-answer count patterns');
  assert.equal(reachable.size, count, 'every catalog hero is reachable through the quiz');

  run("go('hq')");
  assert(el('#content').innerHTML.includes(`Все пауки · ${count}`));
  run("go('catalog')");
  assert.deepEqual(fixture.cards(), Array.from({ length: Math.min(24, count) }, (_, i) => i), 'first page of catalog');
  assert(el('#catalogCount').textContent.includes(`Всего ${count}`), 'catalog count is dynamic');
  assert.equal(el('#noHeroes').hidden, true);
  if (count > 24) {
    click({ page: '1' });
    assert.deepEqual(fixture.cards(), Array.from({ length: Math.min(24, count - 24) }, (_, i) => i + 24), 'second catalog page');
    assert(el('#catalogCount').textContent.includes('25–'), 'page counter follows pagination');
    click({ page: '9999' });
    assert.equal(fixture.cards().at(-1), count - 1, 'out-of-range pagination clamps to final page');
  }
  click({ action: 'resetFilters' });
  assert.equal(run('catalogPage'), 0);
  const noirIndex = heroes.findIndex(hero => hero.id === 'noir');
  const kaineIndex = heroes.findIndex(hero => hero.id === 'kaine');
  assert(matches(heroes[noirIndex], 'пИтЕр   НУАР'), 'Cyrillic, case and multiword search');
  assert(matches(heroes[kaineIndex], 'Scarlet Kaine'), 'English aliases');
  assert(matches(heroes[noirIndex], 'Earth-90214'), 'prefixed earth number');
  assert(matches(heroes[noirIndex], '90214'), 'bare earth number');
  assert(!matches(heroes[noirIndex], 'Нуар 616'), 'all words must match same hero');
  assert(matches({ name: 'Ёжик', alias: '', earth: '1' }, 'ежик'), 'ё and е equivalence');
  search('kaine');
  assert(plain(run('catalogMatches()')).includes(kaineIndex), 'search finds a known legacy hero');
  assert.equal(run('catalogPage'), 0, 'search resets page');
  assert(fixture.cards().includes(kaineIndex));
  run("go('passport'); go('catalog')");
  assert.equal(run('catalogQuery'), 'kaine', 'query survives navigation');
  assert(fixture.cards().includes(kaineIndex), 'return to catalog reapplies query');
  search('unfindable-spider-xyz');
  assert.equal(fixture.cards().length, 0);
  assert.equal(el('#noHeroes').hidden, false);
  click({ action: 'resetFilters' });
  assert.equal(el('#noHeroes').hidden, true);

  const group = heroes[kaineIndex].group;
  await change('catalogGroup', group);
  assert(plain(run('catalogMatches()')).every(i => heroes[i].group === group), 'category filter');
  await change('catalogUniverse', heroes[kaineIndex].earth);
  assert(plain(run('catalogMatches()')).every(i => heroes[i].group === group && heroes[i].earth === heroes[kaineIndex].earth), 'universe and category combine');
  assert(plain(run('catalogMatches()')).includes(kaineIndex));
  click({ action: 'resetFilters' });
  await change('catalogSort', 'name');
  const nameIndices = plain(run('catalogMatches()'));
  for (let i = 1; i < nameIndices.length; i++)
    assert(heroes[nameIndices[i - 1]].name.localeCompare(heroes[nameIndices[i]].name, 'ru') <= 0, 'alphabetical order');
  await change('catalogSort', 'earth');
  const earthIndices = plain(run('catalogMatches()'));
  for (let i = 1; i < earthIndices.length; i++)
    assert(heroes[earthIndices[i - 1]].earth.localeCompare(heroes[earthIndices[i]].earth, undefined, { numeric: true }) <= 0, 'numeric universe order');
  click({ action: 'resetFilters' });

  click({ favorite: String(count - 1) });
  assert.deepEqual(plain(run('state.favorites')), [heroes.at(-1).id], 'favorites use stable ids');
  assert.deepEqual(JSON.parse(stored[storageKey]).favorites, [heroes.at(-1).id], 'favorites persist');
  click({ action: 'favorites' });
  assert.deepEqual(fixture.cards(), [count - 1], 'favorites-only catalog');
  assert.equal(el('#favoritesOnly').getAttribute('aria-pressed'), 'true');
  click({ favorite: String(count - 1) });
  assert.equal(fixture.cards().length, 0, 'removing final favorite updates the filtered view');
  assert.equal(el('#noHeroes').hidden, false);
  click({ action: 'resetFilters' });

  for (const [index, hero] of heroes.entries()) {
    click({ details: String(index) });
    assert.equal(el('#modal').open, true);
    assert(el('#modalContent').innerHTML.includes(`src="${hero.image}"`), `${hero.id}: detail illustration`);
    assert(el('#modalContent').innerHTML.includes(run(`esc(${JSON.stringify(hero.source)})`)), `${hero.id}: detail source`);
    click({ hero: String(index) });
    assert.equal(run('view'), 'passport', 'selection opens compact passport');
    assert.equal(el('#modal').open, false, 'selection closes dossier');
    assert.equal(run('state.hero'), index, `${hero.id}: selectable`);
    assert.equal(run('state.heroId'), hero.id, `${hero.id}: stable selection identity`);
    assert.equal(run('state.earth'), hero.earth);
    assert.equal(run('state.power'), hero.power);
    assert.equal(JSON.parse(stored[storageKey]).heroId, hero.id);
    assert.equal(fixture.cards().length, 0, 'passport avoids huge catalog grid');
    assert(el('#content').innerHTML.includes('passport-summary'));
    run("go('cover')");
    assert(el('#content').innerHTML.includes(`src="${hero.image}"`), `${hero.id}: matching cover`);
    run("go('catalog')");
  }
  submit('passportForm', { name: 'Тестовый герой', earth: heroes.at(-1).earth || '999', power: 'Паутина', motto: 'Вперёд!', status: 'На связи' });
  assert(el('#content').innerHTML.includes('Тестовый герой'));
  const reloaded = launch({ ...stored });
  assert.equal(reloaded.run('state.hero'), count - 1, 'reload newest selected hero');
  assert.equal(reloaded.run('state.heroId'), heroes.at(-1).id);
  assert.equal(reloaded.run('state.name'), 'Тестовый герой');
  reloaded.run("go('cover')");
  assert(reloaded.el('#content').innerHTML.includes(heroes.at(-1).image));
  for (let index = 0; index < 22; index++) {
    const legacy = launch({ [storageKey]: JSON.stringify({ hero: index }) });
    assert.equal(legacy.run('state.hero'), index, 'legacy numeric passport index retained');
    assert.equal(legacy.run('state.heroId'), heroes[index].id);
  }

  const corrupt = {
    heroId: heroes.at(-1).id, hero: 99999, name: 'A'.repeat(80), earth: 42,
    power: 'B'.repeat(200), motto: 'C'.repeat(200), status: {}, team: [],
    done: [0, 0, 3, -1, 99, '1'], active: [0, 1, 1, 4, null, 3],
    favorites: [heroes[0].id, heroes[0].id, 'unknown', null],
    notes: { 0: 'D'.repeat(800), 1: {}, 99: 'invalid mission' },
    events: [{ text: 'E'.repeat(300), date: 'F'.repeat(60) }, { text: null, date: 'today' }],
  };
  const clean = plain(run(`sanitizeState(${JSON.stringify(corrupt)})`));
  assert.equal(clean.hero, count - 1, 'stable id takes precedence over stale numeric index');
  assert.equal(clean.heroId, heroes.at(-1).id);
  assert.equal(clean.name.length, 40);
  assert.equal(clean.power.length, 90); assert.equal(clean.motto.length, 90);
  assert.deepEqual(clean.done, [0, 3]); assert.deepEqual(clean.active, [1]);
  assert.deepEqual(clean.favorites, [heroes[0].id]);
  assert.equal(clean.notes[0].length, 600); assert.equal(Object.hasOwn(clean.notes, '99'), false);
  assert.equal(Object.hasOwn(clean.notes, '1'), false);
  assert.equal(clean.events.length, 1); assert.equal(clean.events[0].text.length, 200); assert.equal(clean.events[0].date.length, 32);
  assert.equal(run("sanitizeState({heroId:'not-in-catalog'}).hero"), 0, 'unknown identity falls back safely');
  const corruptReload = launch({ [storageKey]: JSON.stringify(corrupt) });
  assert.deepEqual(plain(corruptReload.run('state.done')), [0, 3], 'sanitize saved data at startup');
  assert.equal(launch({ [storageKey]: '{broken json' }).run('state.hero'), 0, 'malformed local storage recovers');

  click({ mission: '0' });
  assert.equal(run('state.active.length'), 1);
  click({ mission: '0' });
  assert(el('#modalContent').innerHTML.includes('ОТЧЁТ'));
  submit('missionForm', { note: 'Посмотрели фильм' }, { id: '0' });
  assert.equal(run('state.done.length'), 1); assert.equal(run('state.active.length'), 0);
  run("go('passport')");
  assert(el('#content').innerHTML.includes('Билет в мультивселенную'));
  run("go('hq')");
  assert(el('#content').innerHTML.includes('Миссия завершена'));
  assert.equal(run("esc('<img>')"), '&lt;img&gt;');
  submit('passportForm', { name: '<img src=x>', earth: '65', power: 'Паутина', motto: '"<b>" &', status: 'На связи' });
  assert(el('#content').innerHTML.includes('&lt;img src=x&gt;'));
  assert(!el('#content').innerHTML.includes('<img src=x>'), 'user details never become HTML');

  const backup = { app: 'SPIDER-LINK', version: 1, profile: {
    heroId: heroes.at(-1).id, name: 'Импортированный герой', earth: '42', power: 'Ловкость',
    favorites: [heroes[0].id], done: [0], active: [1], notes: { 0: 'Сохранённая миссия' }, events: [],
  } };
  const file = value => ({ size: Buffer.byteLength(value), text: async () => value });
  await change('importProfile', '', [file(JSON.stringify(backup))]);
  assert.equal(run('state.name'), 'Импортированный герой');
  assert.equal(run('state.heroId'), heroes.at(-1).id);
  assert.deepEqual(plain(run('state.favorites')), [heroes[0].id]);
  assert.deepEqual(plain(run('state.done')), [0]);
  assert.equal(run('view'), 'passport');
  const beforeBadImport = run('JSON.stringify(state)');
  for (const invalid of [file('{invalid'), file(JSON.stringify({ app: 'Other', version: 1, profile: {} })),
    file(JSON.stringify({ ...backup, profile: { heroId: 'missing' } })),
    { size: 262145, text: async () => JSON.stringify(backup) }]) {
    await change('importProfile', '', [invalid]);
    assert.equal(run('JSON.stringify(state)'), beforeBadImport, 'invalid backup leaves profile intact');
  }
  click({ action: 'exportProfile' });
  const download = fixture.downloads.at(-1);
  assert.equal(download.filename, 'spider-link-profile.json');
  const exported = JSON.parse(await fixture.blobs.get(download.href).text());
  assert.equal(exported.app, 'SPIDER-LINK'); assert.equal(exported.version, 1);
  assert.equal(exported.profile.heroId, heroes.at(-1).id);
  assert.deepEqual(exported.profile.favorites, [heroes[0].id]);
  assert.deepEqual(exported.profile.done, [0]);

  console.log(`PASS: ${count} sourced heroes and local images; all ${count} results across 792 quiz patterns; 24-card pagination, filters, favorites, dossiers, stable saves and covers; legacy migration, sanitization, backup import/export, missions and escaping`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
