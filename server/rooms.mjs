const MAX_JSON = 32 * 1024;
const MAX_PHOTO = 400 * 1024;
const ID = /^[a-f0-9]{32}$/;
const TOKEN = /^[a-f0-9]{64}$/;
const INVITE = /^[a-f0-9]{40}$/;
const RESPONSES = new Set(['in', 'later', 'out']);
const MEMBER_FIELDS = ['name', 'heroId', 'earth', 'power', 'motto', 'persona'];

class HttpError extends Error {
  constructor(status, message, code = 'invalid_request') { super(message); this.status = status; this.code = code; }
}
const fail = (status, message, code) => { throw new HttpError(status, message, code); };
const now = () => new Date().toISOString();
const randomHex = bytes => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
const hash = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), byte => byte.toString(16).padStart(2, '0')).join('');

function object(value, label = 'Объект') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, label + ': неверный формат.');
  return value;
}
function text(value, maximum, label, { required = false, multiline = false } = {}) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') fail(400, label + ': ожидается текст.');
  const result = value.trim();
  const control = multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/ : /[\u0000-\u001f]/;
  if ((required && !result) || result.length > maximum || control.test(result)) fail(400, label + ': недопустимая длина или символы.');
  return result;
}
function identifier(value, label) {
  if (typeof value !== 'string' || !ID.test(value)) fail(400, label + ': неверный идентификатор.');
  return value;
}
function persona(value) {
  if (value === undefined) return {};
  object(value, 'Собственный герой');
  const allowed = new Set(['version', 'active', 'name', 'earth', 'power', 'motto', 'colors', 'eyes', 'emblem', 'pattern']);
  if (Object.keys(value).some(key => !allowed.has(key))) fail(400, 'Неизвестное поле собственного героя.');
  if (JSON.stringify(value).length > 4096) fail(400, 'Слишком много данных собственного героя.');
  const clean = {};
  if ('version' in value) { if (value.version !== 1) fail(400, 'Неизвестная версия собственного героя.'); clean.version = 1; }
  if ('active' in value) { if (typeof value.active !== 'boolean') fail(400, 'Неверный статус собственного героя.'); clean.active = value.active; }
  for (const [key, limit] of Object.entries({ name: 60, earth: 32, power: 160, motto: 180 })) {
    if (key in value) {
      clean[key] = text(value[key], limit, 'Собственный герой');
      if (/(?:https?:|data:|blob:|javascript:|\/\/)/i.test(clean[key])) fail(400, 'Ссылки в собственном герое не поддерживаются.');
    }
  }
  for (const [key, values] of Object.entries({ eyes: ['wide', 'narrow'], emblem: ['spider', 'star', 'bolt', 'web'], pattern: ['web', 'stripes', 'dots'] })) {
    if (key in value) { if (!values.includes(value[key])) fail(400, 'Неизвестный вариант собственного героя.'); clean[key] = value[key]; }
  }
  if ('colors' in value) {
    object(value.colors, 'Цвета героя');
    if (Object.keys(value.colors).some(key => !['primary', 'secondary', 'accent'].includes(key))) fail(400, 'Неизвестный цвет героя.');
    clean.colors = {};
    for (const [key, color] of Object.entries(value.colors)) {
      if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) fail(400, 'Цвет героя должен иметь формат #RRGGBB.');
      clean.colors[key] = color;
    }
  }
  return clean;
}
function memberProfile(value, existing) {
  object(value, 'Профиль участника');
  const clean = existing ? { ...existing } : {};
  const limits = { name: 40, heroId: 100, earth: 32, power: 160, motto: 180 };
  for (const key of MEMBER_FIELDS) {
    if (existing && !Object.hasOwn(value, key)) continue;
    if (key === 'persona') { clean.persona = persona(value.persona); continue; }
    clean[key] = text(value[key], limits[key], 'Профиль: ' + key, { required: ['name', 'heroId'].includes(key) });
    if (key === 'heroId' && !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(clean[key])) fail(400, 'Неверный идентификатор паука.');
    if (key === 'earth' && clean[key] && !/^[a-z0-9 -]{1,32}$/i.test(clean[key])) fail(400, 'Неверный номер вселенной.');
  }
  return clean;
}
async function readLimited(request, maximum) {
  const declared = Number(request.headers.get('content-length'));
  if (declared > maximum) fail(413, 'Файл или запрос слишком большой.', 'too_large');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) { await reader.cancel(); fail(413, 'Файл или запрос слишком большой.', 'too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
async function jsonBody(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') fail(415, 'Ожидается запрос JSON.', 'unsupported_media');
  const bytes = await readLimited(request, MAX_JSON);
  try { return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), 'Запрос'); }
  catch (error) { if (error instanceof HttpError) throw error; fail(400, 'Не удалось прочитать JSON.'); }
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: {
    'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
  } });
}
function sameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) fail(403, 'Запрос с другого сайта отклонён.', 'origin_mismatch');
}
function validatePhoto(bytes, contentType) {
  const prefix = (...values) => values.every((value, index) => bytes[index] === value);
  let valid = false;
  if (contentType === 'image/jpeg') valid = bytes.length > 12 && prefix(0xff, 0xd8, 0xff) && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (contentType === 'image/png') valid = bytes.length > 32 && prefix(137, 80, 78, 71, 13, 10, 26, 10) && new TextDecoder().decode(bytes.slice(12, 16)) === 'IHDR';
  if (contentType === 'image/webp') valid = bytes.length > 20 && new TextDecoder().decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP';
  if (!valid) fail(415, 'Нужна фотография JPEG, PNG или WebP.', 'invalid_photo');
}

/** HTTP API shared by the local Node adapter and the Cloudflare Worker. */
export function createRoomsHandler({ store, bucket } = {}) {
  if (!store) throw new TypeError('A room store is required');

  async function authenticate(request, roomId) {
    const token = request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
    if (!token || !TOKEN.test(token)) fail(401, 'Войдите в этот штаб по приглашению.', 'unauthorized');
    const membership = await store.getMembership(await hash(token));
    if (!membership) fail(401, 'Ключ участника недействителен.', 'unauthorized');
    if (membership.roomId !== roomId) fail(403, 'Этот ключ относится к другому штабу.', 'forbidden');
    const room = await store.getRoom(roomId);
    if (!room) fail(404, 'Штаб не найден.', 'not_found');
    if (!room.members.some(member => member.id === membership.memberId)) fail(403, 'Участник не найден в этом штабе.', 'forbidden');
    return membership;
  }
  async function mutate(roomId, operation) {
    for (let attempt = 0; attempt < 64; attempt++) {
      const room = await store.getRoom(roomId);
      if (!room) fail(404, 'Штаб не найден.', 'not_found');
      const expected = room.version;
      const options = await operation(room) || {};
      room.version = expected + 1;
      room.updatedAt = now();
      if (await store.commitRoom(room, expected, options)) return room;
    }
    fail(409, 'Штаб активно обновляется. Повторите действие.', 'conflict');
  }
  async function newMembership(roomId, memberId) {
    const token = randomHex(32);
    return { public: { roomId, memberId, token }, record: { tokenHash: await hash(token), roomId, memberId, createdAt: now() } };
  }
  async function applyAction(room, actor, body) {
    const owner = () => { if (room.ownerId !== actor.memberId) fail(403, 'Это действие доступно владельцу штаба.', 'forbidden'); };
    const member = room.members.find(value => value.id === actor.memberId);
    if (!member) fail(403, 'Участник не найден.', 'forbidden');
    switch (body.type) {
      case 'profile.update': Object.assign(member, memberProfile(body.member, member)); break;
      case 'room.rename': owner(); room.name = text(body.name, 80, 'Название штаба', { required: true }); break;
      case 'room.invite.rotate': owner(); room.inviteCode = randomHex(20); break;
      case 'rally.create': {
        if (room.rallies.length >= 50) fail(409, 'В штабе уже 50 сборов.', 'limit_reached');
        const when = text(body.when, 80, 'Время сбора');
        if (when && !Number.isFinite(Date.parse(when))) fail(400, 'Неверное время сбора.');
        room.rallies.unshift({ id: randomHex(16), title: text(body.title, 120, 'Название сбора', { required: true }),
          description: text(body.description, 1200, 'Описание сбора', { multiline: true }), when,
          createdBy: member.id, createdAt: now(), responses: { [member.id]: 'in' } });
        break;
      }
      case 'rally.respond': {
        const rallyId = identifier(body.rallyId, 'Сбор');
        const rally = room.rallies.find(value => value.id === rallyId);
        if (!rally) fail(404, 'Сбор не найден.', 'not_found');
        if (!RESPONSES.has(body.response)) fail(400, 'Неизвестный ответ на сбор.');
        rally.responses[member.id] = body.response;
        break;
      }
      case 'mission.create': {
        if (room.missions.length >= 100 || room.missions.filter(value => value.status === 'active').length >= 20)
          fail(409, 'Достигнут лимит миссий штаба.', 'limit_reached');
        room.missions.unshift({ id: randomHex(16), title: text(body.title, 120, 'Название миссии', { required: true }),
          description: text(body.description, 1600, 'Описание миссии', { multiline: true }), participants: [member.id],
          status: 'active', createdBy: member.id, createdAt: now(), completedAt: null, report: null });
        break;
      }
      case 'mission.join': {
        const missionId = identifier(body.missionId, 'Миссия');
        const mission = room.missions.find(value => value.id === missionId);
        if (!mission) fail(404, 'Миссия не найдена.', 'not_found');
        if (mission.status !== 'active') fail(409, 'Миссия уже завершена.', 'conflict');
        if (typeof body.joined !== 'boolean') fail(400, 'Укажите участие в миссии.');
        mission.participants = mission.participants.filter(id => id !== member.id);
        if (body.joined) mission.participants.push(member.id);
        break;
      }
      case 'mission.complete': {
        const missionId = identifier(body.missionId, 'Миссия');
        const mission = room.missions.find(value => value.id === missionId);
        if (!mission) fail(404, 'Миссия не найдена.', 'not_found');
        if (mission.status !== 'active') fail(409, 'Миссия уже завершена.', 'conflict');
        if (!mission.participants.includes(member.id)) fail(403, 'Сначала присоединитесь к миссии.', 'forbidden');
        if (body.photos !== undefined && (!Array.isArray(body.photos) || body.photos.length > 3)) fail(400, 'К отчёту можно прикрепить до трёх фотографий.');
        const photos = [], seen = new Set();
        for (const value of body.photos || []) {
          object(value, 'Фотография');
          const id = identifier(value.id, 'Фотография');
          if (seen.has(id)) fail(400, 'Фотография указана дважды.');
          const photo = await store.getPhoto(id);
          if (!photo || photo.roomId !== room.id) fail(400, 'Фотография не принадлежит этому штабу.', 'invalid_photo');
          seen.add(id); photos.push({ id, caption: text(value.caption, 180, 'Подпись фотографии') });
        }
        mission.report = { title: text(body.title ?? mission.title, 120, 'Название отчёта', { required: true }),
          text: text(body.text, 4000, 'Итоги миссии', { required: true, multiline: true }), photos };
        mission.status = 'done'; mission.completedAt = now();
        break;
      }
      default: fail(400, 'Неизвестное действие.');
    }
  }

  return async function roomsHandler(request) {
    try {
      const url = new URL(request.url), pathname = url.pathname;
      if (request.method !== 'GET' && request.method !== 'HEAD') sameOrigin(request);
      if (pathname === '/api/health' && request.method === 'GET') return json({ ok: true, rooms: true, photos: Boolean(bucket) });
      if (pathname === '/api/rooms' && request.method === 'POST') {
        const body = await jsonBody(request), timestamp = now();
        const roomId = randomHex(16), memberId = randomHex(16);
        const member = { ...memberProfile(body.member), id: memberId, joinedAt: timestamp };
        const membership = await newMembership(roomId, memberId);
        const room = { id: roomId, name: text(body.name, 80, 'Название штаба', { required: true }), ownerId: memberId,
          inviteCode: randomHex(20), createdAt: timestamp, updatedAt: timestamp, version: 1, members: [member], rallies: [], missions: [] };
        await store.createRoom(room, membership.record);
        return json({ room, membership: membership.public }, 201);
      }
      if (pathname === '/api/rooms/join' && request.method === 'POST') {
        const body = await jsonBody(request);
        if (typeof body.code !== 'string' || !INVITE.test(body.code)) fail(400, 'Неверный код приглашения.');
        const initial = await store.findRoomByInviteCode(body.code);
        if (!initial) fail(404, 'Приглашение не найдено или уже заменено.', 'not_found');
        const memberId = randomHex(16), profile = memberProfile(body.member);
        const membership = await newMembership(initial.id, memberId);
        const room = await mutate(initial.id, current => {
          if (current.inviteCode !== body.code) fail(404, 'Это приглашение уже заменено.', 'not_found');
          if (current.members.length >= 32) fail(409, 'В штабе уже 32 участника.', 'limit_reached');
          current.members.push({ ...profile, id: memberId, joinedAt: now() });
          return { membership: membership.record };
        });
        return json({ room, membership: membership.public }, 201);
      }
      const match = pathname.match(/^\/api\/rooms\/([a-f0-9]{32})(?:\/(actions|photos)(?:\/([a-f0-9]{32}))?)?$/);
      if (!match) fail(404, 'Адрес API не найден.', 'not_found');
      const [, roomId, resource, photoId] = match;
      const actor = await authenticate(request, roomId);
      if (!resource && request.method === 'GET') return json({ room: await store.getRoom(roomId) });
      if (resource === 'actions' && !photoId && request.method === 'POST') {
        const body = await jsonBody(request);
        return json({ room: await mutate(roomId, room => applyAction(room, actor, body)) });
      }
      if (resource === 'photos' && !photoId && request.method === 'POST') {
        if (!bucket) fail(503, 'Хранилище фотографий ещё не подключено.', 'photos_unavailable');
        const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) fail(415, 'Поддерживаются фотографии JPEG, PNG и WebP.', 'invalid_photo');
        const bytes = await readLimited(request, MAX_PHOTO);
        validatePhoto(bytes, contentType);
        const id = randomHex(16), key = 'rooms/' + roomId + '/' + id;
        await bucket.put(key, bytes, { httpMetadata: { contentType } });
        try { await store.createPhoto({ id, roomId, key, contentType, size: bytes.byteLength, createdBy: actor.memberId, createdAt: now() }); }
        catch (error) { if (bucket.delete) await bucket.delete(key); throw error; }
        return json({ photo: { id } }, 201);
      }
      if (resource === 'photos' && photoId && request.method === 'GET') {
        if (!bucket) fail(503, 'Хранилище фотографий ещё не подключено.', 'photos_unavailable');
        const photo = await store.getPhoto(photoId);
        if (!photo || photo.roomId !== roomId) fail(404, 'Фотография не найдена.', 'not_found');
        const stored = await bucket.get(photo.key);
        if (!stored) fail(404, 'Фотография не найдена.', 'not_found');
        return new Response(stored.body, { headers: { 'content-type': photo.contentType, 'content-length': String(photo.size),
          'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
      }
      fail(405, 'Этот метод не поддерживается.', 'method_not_allowed');
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, code: error.code }, error.status);
      return json({ error: 'Не удалось выполнить запрос. Попробуйте ещё раз.', code: 'internal_error' }, 500);
    }
  };
}
