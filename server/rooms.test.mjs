import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomsHandler } from './rooms.mjs';
import { createMemoryStore } from './memory-store.mjs';

const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLFsAAAAASUVORK5CYII=', 'base64'));
const profile = (name = 'Паук') => ({ name, heroId: 'miles', earth: '1610', power: 'Паутина', motto: 'Вперёд!', persona: {} });
class MemoryBucket {
  objects = new Map();
  async put(key, bytes, options) { this.objects.set(key, { bytes: bytes.slice(), options }); }
  async get(key) {
    const value = this.objects.get(key);
    return value ? { body: value.bytes.slice(), size: value.bytes.length, httpMetadata: value.options.httpMetadata } : null;
  }
  async delete(key) { this.objects.delete(key); }
}
function fixture({ withBucket = true } = {}) {
  const store = createMemoryStore(), bucket = withBucket ? new MemoryBucket() : undefined;
  const handler = createRoomsHandler({ store, bucket });
  async function call(method, path, body, token, headers = {}) {
    const requestHeaders = new Headers(headers);
    if (token) requestHeaders.set('authorization', 'Bearer ' + token);
    let payload = body;
    if (body !== undefined && !(body instanceof Uint8Array)) {
      payload = JSON.stringify(body);
      if (!requestHeaders.has('content-type')) requestHeaders.set('content-type', 'application/json');
    }
    const response = await handler(new Request('https://spider.test' + path, { method, headers: requestHeaders, body: payload }));
    const data = response.headers.get('content-type')?.includes('application/json')
      ? await response.clone().json() : new Uint8Array(await response.clone().arrayBuffer());
    return { response, status: response.status, data };
  }
  const create = async (name = 'Команда', member = profile('Владелец')) => {
    const result = await call('POST', '/api/rooms', { name, member });
    assert.equal(result.status, 201, JSON.stringify(result.data));
    return result.data;
  };
  const join = (room, name) => call('POST', '/api/rooms/join', { code: room.inviteCode, member: profile(name) });
  const action = (session, type, body = {}) => call('POST', '/api/rooms/' + session.room.id + '/actions', { type, ...body }, session.membership.token);
  return { store, bucket, handler, call, create, join, action };
}

test('creates private room, hashes bearer tokens, and joins a second identity', async () => {
  const f = fixture(), owner = await f.create();
  assert.match(owner.room.id, /^[a-f0-9]{32}$/);
  assert.match(owner.room.inviteCode, /^[a-f0-9]{40}$/);
  assert.match(owner.membership.token, /^[a-f0-9]{64}$/);
  assert.equal(owner.room.ownerId, owner.membership.memberId);
  assert.equal(owner.room.version, 1);
  assert(!JSON.stringify(owner.room).includes(owner.membership.token), 'room snapshots never include bearer credentials');
  assert.equal(await f.store.getMembership(owner.membership.token), null, 'store keys are hashes, not bearer tokens');
  const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(owner.membership.token))).toString('hex');
  assert.equal((await f.store.getMembership(digest)).memberId, owner.membership.memberId);
  const joined = await f.join(owner.room, 'Друг');
  assert.equal(joined.status, 201);
  assert.equal(joined.data.room.members.length, 2);
  assert.notEqual(joined.data.membership.token, owner.membership.token);
  const read = await f.call('GET', '/api/rooms/' + owner.room.id, undefined, joined.data.membership.token);
  assert.equal(read.status, 200);
  assert.equal(read.data.room.version, 2);
  assert.deepEqual(read.data.room.members.map(member => member.name), ['Владелец', 'Друг']);
});

test('rejects missing, invalid, and cross-room credentials', async () => {
  const f = fixture(), first = await f.create('Один'), second = await f.create('Два');
  const path = '/api/rooms/' + first.room.id;
  assert.equal((await f.call('GET', path)).status, 401);
  assert.equal((await f.call('GET', path, undefined, 'bad-token')).status, 401);
  assert.equal((await f.call('GET', path, undefined, 'f'.repeat(64))).status, 401);
  assert.equal((await f.call('GET', path, undefined, second.membership.token)).status, 403);
  assert.equal((await f.call('POST', path + '/actions', { type: 'room.rename', name: 'Взлом' }, second.membership.token)).status, 403);
  assert.equal((await f.store.getRoom(first.room.id)).name, 'Один');
});

test('only owner renames and rotates invite; old invite stops working', async () => {
  const f = fixture(), owner = await f.create();
  const friend = (await f.join(owner.room, 'Друг')).data;
  assert.equal((await f.action(friend, 'room.rename', { name: 'Чужое имя' })).status, 403);
  assert.equal((await f.action(friend, 'room.invite.rotate')).status, 403);
  const renamed = await f.action(owner, 'room.rename', { name: 'Новый штаб' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.data.room.name, 'Новый штаб');
  const rotated = await f.action(owner, 'room.invite.rotate');
  assert.equal(rotated.status, 200);
  assert.notEqual(rotated.data.room.inviteCode, owner.room.inviteCode);
  assert.equal((await f.join(owner.room, 'Опоздавший')).status, 404);
  assert.equal((await f.join(rotated.data.room, 'Новый друг')).status, 201);
  assert.equal((await f.call('GET', '/api/rooms/' + owner.room.id, undefined, friend.membership.token)).status, 200, 'rotation preserves existing memberships');
});

test('updates only acting member and validates custom persona without arbitrary URLs', async () => {
  const f = fixture(), owner = await f.create(), friend = (await f.join(owner.room, 'Друг')).data;
  const persona = { version: 1, active: true, name: 'Мой паук', earth: '616 Beta', power: 'Ловкость', motto: 'Смелее',
    colors: { primary: '#aa2233', secondary: '#151515', accent: '#88ffee' }, eyes: 'narrow', emblem: 'bolt', pattern: 'stripes' };
  const result = await f.action(friend, 'profile.update', { member: { id: owner.membership.memberId, name: 'Герой', heroId: 'peter-palmer', earth: '616 Beta', persona } });
  assert.equal(result.status, 200);
  assert.equal(result.data.room.members[0].name, 'Владелец');
  assert.equal(result.data.room.members[1].name, 'Герой');
  assert.equal(result.data.room.members[1].id, friend.membership.memberId);
  assert.deepEqual(result.data.room.members[1].persona, persona);
  assert.equal((await f.action(friend, 'profile.update', { member: { persona: { name: 'https://evil.example/image' } } })).status, 400);
  assert.equal((await f.action(friend, 'profile.update', { member: { persona: { colors: { primary: 'url(https://evil.example)' } } } })).status, 400);
  assert.equal((await f.action(friend, 'profile.update', { member: { persona: { avatar: 'https://evil.example' } } })).status, 400);
});

test('shared rally supports RSVP changes from two identities', async () => {
  const f = fixture(), owner = await f.create(), friend = (await f.join(owner.room, 'Друг')).data;
  const created = await f.action(friend, 'rally.create', { title: 'Киновечер', description: 'Встреча у портала', when: '2026-11-03T20:00:00+03:00' });
  assert.equal(created.status, 200);
  const rally = created.data.room.rallies[0];
  assert.equal(rally.createdBy, friend.membership.memberId);
  assert.equal(rally.responses[friend.membership.memberId], 'in');
  assert.equal((await f.action(owner, 'rally.respond', { rallyId: rally.id, response: 'later' })).status, 200);
  const replied = await f.action(friend, 'rally.respond', { rallyId: rally.id, response: 'out' });
  assert.equal(replied.data.room.rallies[0].responses[owner.membership.memberId], 'later');
  assert.equal(replied.data.room.rallies[0].responses[friend.membership.memberId], 'out');
  assert.equal((await f.action(owner, 'rally.respond', { rallyId: rally.id, response: 'maybe' })).status, 400);
  assert.equal((await f.action(owner, 'rally.create', { title: 'Неверная дата', when: 'tomorrow-ish' })).status, 400);
});

test('participants can complete shared mission and everyone reads report with local photo', async () => {
  const f = fixture(), owner = await f.create(), friend = (await f.join(owner.room, 'Друг')).data;
  const created = await f.action(owner, 'mission.create', { title: 'Общее фото', description: 'Собраться вместе' });
  assert.equal(created.status, 200);
  const mission = created.data.room.missions[0];
  assert.deepEqual(mission.participants, [owner.membership.memberId]);
  assert.equal((await f.action(friend, 'mission.complete', { missionId: mission.id, title: 'Наш выпуск', text: 'Готово' })).status, 403);
  assert.equal((await f.action(friend, 'mission.join', { missionId: mission.id, joined: true })).status, 200);
  const uploaded = await f.call('POST', '/api/rooms/' + owner.room.id + '/photos', PNG, friend.membership.token, { 'content-type': 'image/png' });
  assert.equal(uploaded.status, 201);
  const photoId = uploaded.data.photo.id;
  const completed = await f.action(friend, 'mission.complete', { missionId: mission.id, title: 'Наш выпуск', text: 'Все пришли!', photos: [{ id: photoId, caption: 'Команда' }] });
  assert.equal(completed.status, 200);
  const done = completed.data.room.missions[0];
  assert.equal(done.status, 'done');
  assert(Number.isFinite(Date.parse(done.completedAt)));
  assert.deepEqual(done.report, { title: 'Наш выпуск', text: 'Все пришли!', photos: [{ id: photoId, caption: 'Команда' }] });
  const read = await f.call('GET', '/api/rooms/' + owner.room.id, undefined, owner.membership.token);
  assert.deepEqual(read.data.room.missions[0].report, done.report);
  const image = await f.call('GET', '/api/rooms/' + owner.room.id + '/photos/' + photoId, undefined, owner.membership.token);
  assert.equal(image.status, 200);
  assert.equal(image.response.headers.get('content-type'), 'image/png');
  assert.deepEqual(image.data, PNG);
  assert.equal((await f.action(owner, 'mission.complete', { missionId: mission.id, text: 'Переписать' })).status, 409);
  assert.equal((await f.action(owner, 'mission.join', { missionId: mission.id, joined: false })).status, 409);
});

test('photo retrieval and report references are isolated between rooms', async () => {
  const f = fixture(), first = await f.create('Один'), second = await f.create('Два');
  const upload = await f.call('POST', '/api/rooms/' + first.room.id + '/photos', PNG, first.membership.token, { 'content-type': 'image/png' });
  const id = upload.data.photo.id;
  assert.equal((await f.call('GET', '/api/rooms/' + first.room.id + '/photos/' + id)).status, 401);
  assert.equal((await f.call('GET', '/api/rooms/' + first.room.id + '/photos/' + id, undefined, second.membership.token)).status, 403);
  assert.equal((await f.call('GET', '/api/rooms/' + second.room.id + '/photos/' + id, undefined, second.membership.token)).status, 404);
  const created = await f.action(second, 'mission.create', { title: 'Другая миссия' });
  const missionId = created.data.room.missions[0].id;
  assert.equal((await f.action(second, 'mission.complete', { missionId, text: 'Чужой снимок', photos: [{ id }] })).status, 400);
  assert.equal((await f.store.getRoom(second.room.id)).missions[0].status, 'active');
});

test('concurrent joins and updates preserve every successful change', async () => {
  const f = fixture(), owner = await f.create();
  const joins = await Promise.all(Array.from({ length: 12 }, (_, index) => f.join(owner.room, 'Друг ' + index)));
  assert(joins.every(result => result.status === 201));
  const sessions = joins.map(result => result.data);
  const rallies = await Promise.all(sessions.map((session, index) => f.action(session, 'rally.create', { title: 'Сбор ' + index })));
  assert(rallies.every(result => result.status === 200));
  const final = await f.store.getRoom(owner.room.id);
  assert.equal(final.members.length, 13);
  assert.equal(final.rallies.length, 12);
  assert.equal(new Set(final.members.map(member => member.id)).size, 13);
  assert.equal(new Set(final.rallies.map(rally => rally.title)).size, 12);
  assert.equal(final.version, 25);
  const reads = await Promise.all(sessions.map(session => f.call('GET', '/api/rooms/' + owner.room.id, undefined, session.membership.token)));
  assert(reads.every(result => result.status === 200 && result.data.room.members.length === 13));
});

test('room member limit holds under concurrent joins', async () => {
  const f = fixture(), owner = await f.create();
  const joins = await Promise.all(Array.from({ length: 36 }, (_, index) => f.join(owner.room, 'Герой ' + index)));
  assert.equal(joins.filter(result => result.status === 201).length, 31);
  assert.equal(joins.filter(result => result.status === 409).length, 5);
  assert.equal((await f.store.getRoom(owner.room.id)).members.length, 32);
});

test('mission, rally, field, and report photo limits are enforced', async () => {
  const f = fixture(), owner = await f.create();
  assert.equal((await f.action(owner, 'mission.create', { title: 'x'.repeat(121) })).status, 400);
  assert.equal((await f.action(owner, 'rally.create', { title: 'test', description: 'x'.repeat(1201) })).status, 400);
  assert.equal((await f.call('POST', '/api/rooms', { name: 'test', member: profile('x'.repeat(41)) })).status, 400);
  assert.equal((await f.action(owner, 'profile.update', { member: { heroId: '../private' } })).status, 400);
  for (let index = 0; index < 20; index++) assert.equal((await f.action(owner, 'mission.create', { title: 'Миссия ' + index })).status, 200);
  assert.equal((await f.action(owner, 'mission.create', { title: 'Лишняя' })).status, 409);
  const room = await f.store.getRoom(owner.room.id), missionId = room.missions[0].id;
  assert.equal((await f.action(owner, 'mission.complete', { missionId, text: 'Отчёт', photos: Array(4).fill({ id: 'f'.repeat(32) }) })).status, 400);
  assert.equal((await f.action(owner, 'mission.complete', { missionId, text: 'x'.repeat(4001) })).status, 400);
  for (let index = 0; index < 50; index++) assert.equal((await f.action(owner, 'rally.create', { title: 'Сбор ' + index })).status, 200);
  assert.equal((await f.action(owner, 'rally.create', { title: 'Лишний' })).status, 409);
  const seeded = await f.store.getRoom(owner.room.id);
  seeded.missions = Array.from({ length: 100 }, (_, index) => ({ id: String(index), status: 'done' }));
  const oldVersion = seeded.version; seeded.version++;
  assert.equal(await f.store.commitRoom(seeded, oldVersion), true);
  assert.equal((await f.action(owner, 'mission.create', { title: 'Сверх 100' })).status, 409);
});

test('invalid identifiers and unsupported actions never change a room', async () => {
  const f = fixture(), owner = await f.create();
  for (const body of [
    { type: 'rally.respond', rallyId: '__proto__', response: 'in' },
    { type: 'mission.join', missionId: '../../etc/passwd', joined: true },
    { type: 'mission.complete', missionId: 'bad', text: 'report' },
    { type: 'nonexistent.action' },
  ]) assert.equal((await f.call('POST', '/api/rooms/' + owner.room.id + '/actions', body, owner.membership.token)).status, 400);
  assert.equal((await f.store.getRoom(owner.room.id)).version, 1);
  assert.equal((await f.call('POST', '/api/rooms/join', { code: 'bad', member: profile() })).status, 400);
});

test('request bounds, media checks, and same-origin enforcement', async () => {
  const f = fixture(), owner = await f.create();
  assert.equal((await f.call('POST', '/api/rooms', { name: 'x', member: profile() }, undefined, { origin: 'https://other.test' })).status, 403);
  assert.equal((await f.call('POST', '/api/rooms', { name: 'x', member: profile() }, undefined, { origin: 'https://spider.test' })).status, 201);
  assert.equal((await f.call('POST', '/api/rooms', { name: 'x', member: profile() }, undefined, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await f.call('POST', '/api/rooms', { padding: 'x'.repeat(33000) })).status, 413);
  const malformed = await f.handler(new Request('https://spider.test/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' }));
  assert.equal(malformed.status, 400);
  const path = '/api/rooms/' + owner.room.id + '/photos';
  assert.equal((await f.call('POST', path, new Uint8Array(400 * 1024 + 1), owner.membership.token, { 'content-type': 'image/png' })).status, 413);
  assert.equal((await f.call('POST', path, new TextEncoder().encode('<svg></svg>'), owner.membership.token, { 'content-type': 'image/svg+xml' })).status, 415);
  assert.equal((await f.call('POST', path, new TextEncoder().encode('not a photo'), owner.membership.token, { 'content-type': 'image/png' })).status, 415);
  assert.equal((await f.call('DELETE', '/api/rooms/' + owner.room.id, undefined, owner.membership.token)).status, 405);
  assert.equal((await f.call('GET', '/api/unknown')).status, 404);
});

test('health reports optional photo storage and missing bucket fails clearly', async () => {
  const f = fixture({ withBucket: false }), owner = await f.create();
  assert.deepEqual((await f.call('GET', '/api/health')).data, { ok: true, rooms: true, photos: false });
  const upload = await f.call('POST', '/api/rooms/' + owner.room.id + '/photos', PNG, owner.membership.token, { 'content-type': 'image/png' });
  assert.equal(upload.status, 503);
  assert.equal(upload.data.code, 'photos_unavailable');
});
