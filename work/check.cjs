const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
const storageKey = 'spider-link-v1';

// This fixture runs real render/event handlers. Rendering replaces the card
// objects, so tests catch filters that are lost when innerHTML changes.
function launch(stored = {}) {
  const handlers = {}, elements = {};
  let cards = [];
  const decode = text => text.replace(/&(amp|lt|gt|quot|#39);/g,
    (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[entity]));
  function el(selector) {
    if (elements[selector]) return elements[selector];
    let html = '';
    const element = {
      textContent: '', style: {}, dataset: {}, values: {}, hidden: false,
      classList: { toggle() {} }, addEventListener() {},
      showModal() { this.open = true; }, close() { this.open = false; },
    };
    Object.defineProperty(element, 'innerHTML', {
      get: () => html,
      set(value) {
        html = value;
        if (selector !== '#content') return;
        cards = [...html.matchAll(/<article class="catalog-entry" data-index="(\d+)"/g)]
          .map(match => ({ dataset: { index: match[1] }, hidden: false }));
        if (!cards.length) return;
        el('#catalogCount').textContent = '';
        el('#noHeroes').hidden = true;
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
    console, setTimeout: () => 1, clearTimeout() {}, setInterval() {},
    localStorage: { getItem: key => stored[key], setItem: (key, value) => { stored[key] = value; } },
    document: {
      querySelector: el,
      querySelectorAll: selector => selector === '.catalog-entry' ? cards : [],
      addEventListener: (name, handler) => { handlers[name] = handler; },
    },
    window: { scrollTo() {} },
    FormData: class {
      constructor(form) { this.values = form.values; }
      get(key) { return this.values[key] ?? null; }
    },
  };
  vm.createContext(ctx);
  vm.runInContext(app, ctx, { filename: 'dist/app.js' });
  const run = source => vm.runInContext(source, ctx);
  function click(dataset) {
    const button = {
      dataset, classList: { contains: () => false },
      hasAttribute: attribute => Object.hasOwn(dataset,
        attribute.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())),
    };
    handlers.click({ target: { closest: () => button } });
  }
  const submit = (id, values, dataset = {}) =>
    handlers.submit({ preventDefault() {}, target: { id, values, dataset } });
  const search = query => handlers.input({ target: { id: 'catalogSearch', value: query } });
  return { run, click, submit, search, el, stored, cards: () => cards };
}

const fixture = launch();
const { run, click, submit, search, el, stored } = fixture;
const heroes = JSON.parse(run('JSON.stringify(heroes)'));
const profiles = JSON.parse(run('JSON.stringify(quizProfiles)'));
const recommend = run('recommendHero');
const matches = run('matchesHero');
assert.equal(heroes.length, 22, 'the delivered catalog must contain all 22 heroes');
assert.equal(new Set(heroes.map(hero => hero.id)).size, 22, 'unique hero identities');
assert.deepEqual(heroes.slice(0, 6).map(hero => hero.id),
  ['miles', 'gwen', 'peter', 'hobie', 'miguel', 'pavitr'], 'stable legacy passport indices');

function jpegDimensions(bytes) {
  assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff', 'JPEG header');
  assert.equal(bytes.subarray(-2).toString('hex'), 'ffd9', 'complete JPEG trailer');
  for (let offset = 2; offset < bytes.length - 9;) {
    assert.equal(bytes[offset++], 0xff, 'valid JPEG segment');
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    const length = bytes.readUInt16BE(offset);
    assert(length >= 2 && offset + length <= bytes.length, 'complete JPEG segment');
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker))
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    assert.notEqual(marker, 0xda, 'JPEG dimensions declared before image scan');
    offset += length;
  }
  assert.fail('JPEG has no image dimensions');
}
const imageHashes = new Set();
for (const hero of heroes) {
  assert.match(hero.image, /^assets\/[a-z0-9]+\.jpg$/, `${hero.id}: local illustration`);
  const bytes = fs.readFileSync(path.join(root, 'dist', hero.image));
  const size = jpegDimensions(bytes);
  assert(size.width >= 100 && size.height >= 100, `${hero.id}: usable illustration dimensions`);
  imageHashes.add(createHash('sha256').update(bytes).digest('hex'));
}
assert.equal(imageHashes.size, 22, '22 distinct comic illustrations');
assert(el('#content').innerHTML.includes('МИЛЛИОН'));
run("go('passport')");
assert.equal(fixture.cards().length, 22, 'render all hero cards');
assert.equal(el('#catalogCount').textContent, 'Показано 22 из 22');
assert.equal(el('#noHeroes').hidden, true);

const profileKeys = new Set();
const responsesFor = counts => counts.flatMap((count, category) => Array(count).fill(category));
for (const [index, hero] of heroes.entries()) {
  const profile = profiles[hero.id];
  assert.equal(profile.length, 6, `${hero.id}: six personality categories`);
  assert(profile.every(count => Number.isInteger(count) && count >= 0), `${hero.id}: valid counts`);
  assert.equal(profile.reduce((sum, count) => sum + count, 0), 7, `${hero.id}: seven-answer profile`);
  const key = profile.join(',');
  assert(!profileKeys.has(key), `${hero.id}: distinct profile`);
  profileKeys.add(key);
  const responses = responsesFor(profile);
  assert.equal(recommend(responses), index, `${hero.id}: exact profile recommends own hero`);
  run("go('quiz')");
  click({ action: 'restart' });
  for (const answer of responses) click({ answer: String(answer) });
  assert(el('#content').innerHTML.includes(`data-result="${index}"`), `${hero.id}: reachable through quiz buttons`);
  assert(el('#content').innerHTML.includes(`src="${hero.image}"`), `${hero.id}: quiz illustration`);
}
for (let index = 0; index < 6; index++)
  assert.equal(recommend(Array(7).fill(index)), index, 'preserve original six all-same-answer results');
const reachable = new Set();
let combinations = 0;
function enumerateCounts(prefix, remaining) {
  if (prefix.length === 5) {
    const result = recommend(responsesFor([...prefix, remaining]));
    assert(Number.isInteger(result) && result >= 0 && result < heroes.length, 'valid result for every pattern');
    reachable.add(result);
    combinations++;
    return;
  }
  for (let count = 0; count <= remaining; count++) enumerateCounts([...prefix, count], remaining - count);
}
enumerateCounts([], 7);
assert.equal(combinations, 792, 'every possible seven-answer count pattern');
assert.equal(reachable.size, 22, 'all 22 quiz results reachable');

run("go('quiz')");
click({ action: 'restart' });
for (let index = 0; index < 7; index++) click({ answer: '1' });
assert(el('#content').innerHTML.includes('Гвен Стейси'));
click({ result: '1' });
assert.equal(run('state.earth'), '65');
submit('passportForm', { name: 'Тестовый герой', earth: '65', power: 'Паутина', motto: 'Вперёд!', status: 'На связи' });
assert(el('#content').innerHTML.includes('Тестовый герой'));
assert.equal(JSON.parse(stored[storageKey]).name, 'Тестовый герой');

const noirIndex = heroes.findIndex(hero => hero.id === 'noir');
const kaineIndex = heroes.findIndex(hero => hero.id === 'kaine');
assert(matches(heroes[noirIndex], 'пИтЕр   НУАР'), 'Cyrillic, case and multiword search');
assert(matches(heroes[kaineIndex], 'Scarlet Kaine'), 'multiword English alias');
assert(matches(heroes[noirIndex], 'Earth-90214'), 'prefixed earth number');
assert(matches(heroes[noirIndex], '90214'), 'bare earth number');
assert(!matches(heroes[noirIndex], 'Нуар 616'), 'all words match the same hero');
assert(matches({ name: 'Ёжик', alias: '', earth: '1' }, 'ежик'), 'ё and е search equivalence');
run("go('passport')");
search('kaine');
const visible = () => fixture.cards().filter(card => !card.hidden).map(card => Number(card.dataset.index));
assert.deepEqual(visible(), [kaineIndex]);
assert.equal(el('#catalogCount').textContent, 'Показано 1 из 22');
click({ hero: String(kaineIndex) });
assert.equal(run('state.hero'), kaineIndex);
assert.equal(run('state.name'), 'Тестовый герой', 'hero selection preserves passport draft');
assert.equal(run('catalogQuery'), 'kaine');
assert.equal(el('#catalogCount').textContent, 'Показано 1 из 22', 'render reapplies search');
assert.deepEqual(visible(), [kaineIndex]);
search('unfindable-spider');
assert.equal(visible().length, 0);
assert.equal(el('#catalogCount').textContent, 'Показано 0 из 22');
assert.equal(el('#noHeroes').hidden, false, 'empty-search feedback visible');
search('');
assert.equal(visible().length, 22);
assert.equal(el('#noHeroes').hidden, true, 'empty-search feedback hidden after clearing');

for (const [index, hero] of heroes.entries()) {
  run("go('passport')");
  click({ hero: String(index) });
  assert.equal(run('state.hero'), index, `${hero.id}: selectable card`);
  assert.equal(run('state.earth'), hero.earth);
  assert.equal(run('state.power'), hero.power);
  assert.equal(JSON.parse(stored[storageKey]).hero, index, `${hero.id}: saved selection`);
  run("go('cover')");
  assert(el('#content').innerHTML.includes(`src="${hero.image}"`), `${hero.id}: cover illustration`);
  assert(el('#content').innerHTML.includes(hero.name), `${hero.id}: cover name`);
}
const reloaded = launch({ ...stored });
assert.equal(reloaded.run('state.hero'), 21, 'reload last hero beyond original six');
assert.equal(reloaded.run('state.name'), 'Тестовый герой', 'reload passport details');
reloaded.run("go('cover')");
assert(reloaded.el('#content').innerHTML.includes('assets/julia.jpg'));

click({ mission: '0' });
assert.equal(run('state.active.length'), 1);
click({ mission: '0' });
assert(el('#modalContent').innerHTML.includes('ОТЧЁТ'));
submit('missionForm', { note: 'Посмотрели фильм' }, { id: '0' });
assert.equal(run('state.done.length'), 1);
assert.equal(run('state.active.length'), 0);
run("go('passport')");
assert(el('#content').innerHTML.includes('Билет в мультивселенную'));
run("go('hq')");
assert(el('#content').innerHTML.includes('Миссия завершена'));
assert.equal(run("esc('<img>')"), '&lt;img&gt;');
submit('passportForm', { name: '<img src=x>', earth: '65', power: 'Паутина', motto: '"<b>" &', status: 'На связи' });
assert(el('#content').innerHTML.includes('&lt;img src=x&gt;'), 'escape user cover name');
assert(!el('#content').innerHTML.includes('<img src=x>'), 'user name never becomes HTML');

console.log('PASS: 22 unique heroes and JPEGs; 22 rendered/selectable/persisted covers; all 22 quiz results across 792 patterns; search and rerender; reload; passport; missions; trophies; chronicles; escaping');
