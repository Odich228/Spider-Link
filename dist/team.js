(() => {
  if (window.SpiderTeam) return;
  const storageKey = 'spider-link-team-v1';
  let membership = null, room = null, error = '', busy = false, dirty = false;
  let pollTimer = null, polling = false, active = false, inviteDraft = '', updated = '';
  const photoUrls = new Map(), photoRequests = new Map(), uploads = new Map();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && ['roomId', 'memberId', 'token'].every(k => typeof saved[k] === 'string' && saved[k])) membership = saved;
  } catch {}

  const html = value => esc(value);
  const root = () => document.getElementById('teamRoot');
  const owner = () => !!room && membership?.memberId === room.ownerId;
  const memberName = id => room?.members.find(m => m.id === id)?.name || 'Участник';
  const supported = () => /^https?:$/.test(location.protocol);
  const date = value => {
    const d = new Date(value);
    return value && !Number.isNaN(d.valueOf()) ? d.toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Время не указано';
  };
  function heroFor(member) {
    try { if (window.SpiderExtras?.heroForProfile) return window.SpiderExtras.heroForProfile(member); } catch {}
    return heroes.find(h => h.id === member?.heroId) || heroes[0];
  }
  function art(member, className = '') {
    const h = heroFor(member);
    return `<img class="team-art ${html(className)}" src="${html(h.image)}" alt="${html(h.name)}" loading="lazy">`;
  }
  function profile(name) {
    const hero = heroes[state.hero] || heroes[0];
    const configured = window.SpiderExtras?.persona?.() || state.persona;
    const persona = configured && typeof configured === 'object' ? JSON.parse(JSON.stringify(configured)) : {};
    const custom = persona?.active;
    return {
      name: String(name || (custom ? persona.name : state.name) || state.name || hero.name).trim().slice(0, 40),
      heroId: hero.id,
      earth: String((custom ? persona.earth : state.earth) || state.earth || hero.earth),
      power: String((custom ? persona.power : state.power) || state.power || hero.power).slice(0, 160),
      motto: String((custom ? persona.motto : state.motto) || state.motto || '').slice(0, 180),
      persona
    };
  }
  function persist(next) {
    membership = next;
    try {
      if (next) localStorage.setItem(storageKey, JSON.stringify({ roomId: next.roomId, memberId: next.memberId, token: next.token }));
      else localStorage.removeItem(storageKey);
    } catch {
      if (next) toast('Браузер не разрешил сохранить ключ штаба. Подключение работает до закрытия страницы.');
    }
  }
  function clearPhotos() {
    photoUrls.forEach(url => URL.revokeObjectURL(url));
    photoUrls.clear(); photoRequests.clear(); uploads.clear();
  }
  function status(message, failed = false) {
    const target = document.getElementById('team-status');
    if (target) { target.textContent = message; target.classList.toggle('team-error', failed); }
    const refresh = document.querySelector('[data-team-action="refresh"]');
    if (refresh) refresh.textContent = dirty ? 'Показать обновления ↻' : 'Обновить ↻';
  }
  function hasDraft() {
    const focused = document.activeElement;
    return dirty || !!focused?.closest('#teamRoot input, #teamRoot textarea, #teamRoot select') || !!document.querySelector('#modal[open] form[id^="team-"]');
  }
  function refresh(force = false) {
    const target = root();
    if (!target) return;
    if (!force && hasDraft()) { status('Есть обновления команды. Твой черновик сохранён на экране.'); return; }
    if (force) dirty = false;
    const scroll = window.scrollY;
    target.outerHTML = render();
    hydratePhotos();
    window.scrollTo({ top: scroll, behavior: 'instant' });
  }
  function applyRoom(next, force = false) {
    if (!next || !Array.isArray(next.members)) throw new Error('Сервер вернул неполные данные штаба.');
    const changed = !room || room.version !== next.version;
    room = next; error = ''; updated = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (force || changed) refresh(force);
    else status(`Сигнал стабилен · обновлено ${updated}`);
  }
  async function api(path, options = {}) {
    if (!supported()) throw new Error('Общий штаб работает на сервере сайта. Открой сайт по его адресу, чтобы подключиться к друзьям.');
    const headers = { ...options.headers };
    if (membership?.token) headers.Authorization = `Bearer ${membership.token}`;
    if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';
    let response;
    try { response = await fetch(path, { ...options, headers, cache: 'no-store', signal: AbortSignal.timeout(25000) }); }
    catch { throw new Error('Связь со штабом прервалась. Проверь интернет и попробуй ещё раз.'); }
    if (options.binary && response.ok) return response.blob();
    let result;
    try { result = await response.json(); }
    catch { throw new Error('Сервер команд по этому адресу не подключён. Открой полную серверную версию сайта.'); }
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'Не удалось выполнить действие. Попробуй ещё раз.');
    return result;
  }
  const roomPath = suffix => `/api/rooms/${encodeURIComponent(membership.roomId)}${suffix || ''}`;
  async function pull(force = false) {
    if (!membership || polling || !supported()) return;
    polling = true;
    try { const result = await api(roomPath()); applyRoom(result.room, force); }
    catch (e) { error = e.message; status(error, true); if (!room) refresh(false); }
    finally { polling = false; }
  }
  async function perform(task) {
    if (busy) return;
    busy = true; status('Передаём сигнал…');
    const buttons = [...document.querySelectorAll('#teamRoot button, #modal form[id^="team-"] button')];
    const disabled = buttons.map(button => button.disabled);
    buttons.forEach(button => button.disabled = true);
    try { await task(); error = ''; }
    catch (e) { error = e.message || 'Не удалось выполнить действие.'; status(error, true); toast(error); }
    finally { busy = false; buttons.forEach((button, i) => { if (button.isConnected) button.disabled = disabled[i]; }); }
  }
  async function action(payload) {
    const result = await api(roomPath('/actions'), { method: 'POST', body: JSON.stringify(payload) });
    if (result.room) applyRoom(result.room, true);
    else await pull(true);
  }
  function normalizeCode(value) {
    let code = String(value || '').trim();
    if (code.includes('#join=')) code = code.split('#join=')[1].split('&')[0];
    try { code = decodeURIComponent(code); } catch {}
    return code.trim();
  }
  function inviteUrl() { return room ? `${location.origin}/#join=${encodeURIComponent(room.inviteCode)}` : ''; }
  async function copyInvite() {
    const link = inviteUrl();
    try { await navigator.clipboard.writeText(link); toast('Приглашение скопировано. Отправь ссылку друзьям.'); }
    catch {
      modal(`<span class="eyebrow">ПРИГЛАШЕНИЕ В ШТАБ</span><h2>${html(room.name)}</h2><label>Скопируй ссылку<input readonly value="${html(link)}" id="team-copy-link"></label><p class="notice">Ссылка даёт доступ к команде. Делись ею с друзьями.</p>`);
      const input = document.getElementById('team-copy-link'); input?.select();
    }
  }
  function invitePanel() {
    return `<div class="team-invite"><div><span class="eyebrow">ПОРТАЛ ДЛЯ ДРУЗЕЙ</span><p>Код команды: <strong>${html(room.inviteCode)}</strong></p></div><button class="btn secondary" data-team-action="invite">Скопировать приглашение ↗</button></div>`;
  }
  function incomingInvite() {
    if (!inviteDraft || !membership) return '';
    return `<form id="team-join" class="team-panel team-form team-incoming"><span class="eyebrow">НОВОЕ ПРИГЛАШЕНИЕ</span><h2>Перейти в другой штаб</h2><p class="team-help">У тебя уже есть подключение. По этому приглашению можно переключиться на команду друзей.</p><label>Код приглашения<input name="inviteCode" required maxlength="500" value="${html(inviteDraft)}"></label><label>Твой позывной<input name="memberName" required maxlength="40" value="${html(profile().name)}"></label><button class="btn">Подключиться по приглашению →</button><button type="button" class="link" data-team-action="dismiss-invite">Остаться в текущем штабе</button></form>`;
  }
  function welcome() {
    const p = profile();
    return `<div class="team-welcome"><div class="team-signal-art">${art(p)}<span>ТВОЙ СИГНАЛ / EARTH-${html(p.earth)}</span></div><div><h2>Один портал.<br>Вся ваша команда.</h2><p>Создай общий штаб или подключись по приглашению. Миссии, сборы и хроники будут доступны друзьям с разных устройств.</p><p class="notice">В команду передаётся выбранный паспорт. Его можно обновить после подключения.</p></div></div>
      ${!supported() ? '<p class="team-alert">Этот переносимый HTML работает в личном режиме. Общий штаб доступен в серверной версии сайта по её адресу.</p>' : ''}
      <div class="team-columns"><form id="team-create" class="team-panel team-form"><span class="eyebrow">НОВЫЙ ШТАБ</span><h2>Собрать свой Пауковерс</h2><label>Название команды<input name="roomName" required maxlength="80" placeholder="Ночной дозор мультивселенной"></label><label>Твой позывной<input name="memberName" required maxlength="40" value="${html(p.name)}"></label><button class="btn" ${!supported() ? 'disabled' : ''}>Открыть портал →</button></form>
      <form id="team-join" class="team-panel team-form"><span class="eyebrow">ПРИГЛАШЕНИЕ ПОЛУЧЕНО</span><h2>Подключиться к друзьям</h2><label>Код или ссылка-приглашение<input name="inviteCode" required maxlength="500" value="${html(inviteDraft)}" placeholder="Вставь код или ссылку" autocomplete="off"></label><label>Твой позывной<input name="memberName" required maxlength="40" value="${html(p.name)}"></label><button class="btn secondary" ${!supported() ? 'disabled' : ''}>Принять сигнал →</button></form></div>`;
  }
  function layout() {
    return room.members.map((member, i, list) => {
      if (list.length === 1) return { member, x: 50, y: 48 };
      const angle = -Math.PI / 2 + Math.PI * 2 * i / list.length;
      return { member, x: 50 + 36 * Math.cos(angle), y: 49 + 35 * Math.sin(angle) };
    });
  }
  function map() {
    const nodes = layout(), byId = new Map(nodes.map(node => [node.member.id, node]));
    const edges = new Map();
    room.missions.filter(m => m.status === 'done').forEach(mission => {
      const participants = [...new Set(mission.participants || [])].filter(id => byId.has(id));
      participants.forEach((a, i) => participants.slice(i + 1).forEach(b => {
        const key = [a, b].sort().join('|'); edges.set(key, (edges.get(key) || 0) + 1);
      }));
    });
    const lines = [...edges].map(([key, count]) => {
      const [a, b] = key.split('|').map(id => byId.get(id));
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke-width="${Math.min(.2 + count * .12, 1)}"><title>${html(a.member.name)} + ${html(b.member.name)}: ${count} совместных миссий</title></line>`;
    }).join('');
    return `<section class="team-panel"><div class="section-title"><h2>Карта вашей мультивселенной</h2><span class="eyebrow">${room.members.length} СИГНАЛОВ</span></div><div class="team-map" style="--team-map-height:${room.members.length > 12 ? '680px' : '500px'}"><svg class="team-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${nodes.map(({ member, x, y }) => `<button class="team-map-node ${member.id === membership.memberId ? 'team-self' : ''}" style="left:${x}%;top:${y}%" data-team-member="${html(member.id)}" aria-label="Открыть паспорт и историю: ${html(member.name)}">${art(member)}<strong>${html(member.name)}</strong><small>EARTH-${html(member.earth)}</small></button>`).join('')}</div><p class="team-help">Нажми на героя, чтобы открыть паспорт и общие приключения. Линии появляются после совместных завершённых миссий.</p></section>`;
  }
  function rallies() {
    const responses = [['in', 'В деле'], ['later', 'Буду позже'], ['out', 'Сегодня без меня']];
    const list = [...room.rallies].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return `<section class="team-panel"><div class="section-title"><h2>Паучий сбор</h2><button class="link" data-team-action="rally-new">Объявить сбор +</button></div>${list.length ? list.slice(0, 8).map(rally => `<article class="team-rally"><span class="eyebrow">${html(date(rally.when))}</span><h3>${html(rally.title)}</h3><p>${html(rally.description)}</p><div class="team-rsvp">${responses.map(([value, label]) => `<button data-team-rally="${html(rally.id)}" data-team-response="${value}" aria-pressed="${rally.responses?.[membership.memberId] === value}">${label} <b>${Object.values(rally.responses || {}).filter(response => response === value).length}</b></button>`).join('')}</div><details><summary>Ответы участников</summary><ul>${room.members.map(member => `<li>${html(member.name)} — ${html(responses.find(([value]) => value === rally.responses?.[member.id])?.[1] || 'пока не ответил(а)')}</li>`).join('')}</ul></details></article>`).join('') : '<p class="empty">Назначьте встречу, киновечер или вылазку. Каждый участник сможет ответить на сбор.</p>'}</section>`;
  }
  function missions() {
    const activeMissions = room.missions.filter(mission => mission.status !== 'done');
    return `<section class="team-panel"><div class="section-title"><h2>Миссии команды</h2><button class="link" data-team-action="mission-new">Новая миссия +</button></div><div class="team-missions">${activeMissions.length ? activeMissions.map(mission => {
      const joined = mission.participants.includes(membership.memberId);
      return `<article class="team-mission"><span class="eyebrow">${joined ? 'ТЫ В КОМАНДЕ МИССИИ' : 'НАБОР УЧАСТНИКОВ'}</span><h3>${html(mission.title)}</h3><p>${html(mission.description)}</p><p class="team-help">Участники: ${html(mission.participants.map(memberName).join(', ') || 'пока никого')}</p><div class="team-actions"><button class="btn secondary" data-team-mission-join="${html(mission.id)}" data-team-joined="${!joined}">${joined ? 'Отказаться от участия' : 'Я участвую →'}</button><button class="link" data-team-mission-complete="${html(mission.id)}" ${!joined ? 'disabled title="Сначала присоединись к миссии"' : ''}>Добавить итоги ↗</button></div></article>`;
    }).join('') : '<p class="empty">Придумайте первую миссию. Завершённые задания станут выпусками вашей общей истории.</p>'}</div></section>`;
  }
  function photo(photo, className = '') {
    return `<figure class="team-photo ${html(className)}"><img data-team-photo="${html(photo.id)}" alt="${html(photo.caption || 'Момент командной миссии')}" loading="lazy"><figcaption>${html(photo.caption || '')}</figcaption></figure>`;
  }
  function chronicles() {
    const issues = room.missions.filter(m => m.status === 'done').sort((a, b) => String(a.completedAt).localeCompare(String(b.completedAt)));
    return `<section class="team-panel"><div class="section-title"><h2>Хроники вашей команды</h2><span class="eyebrow">${issues.length} ВЫПУСКОВ</span></div><div class="team-issues">${issues.length ? issues.map((mission, i) => ({ mission, number: i + 1 })).reverse().map(({ mission, number }) => `<article class="team-issue"><span class="team-issue-number">ISSUE ${String(number).padStart(3, '0')}</span><div class="team-issue-art">${mission.report?.photos?.[0] ? photo(mission.report.photos[0]) : art(room.members.find(m => m.id === mission.participants[0]) || room.members[0])}</div><div class="team-issue-copy"><small>${html(date(mission.completedAt))}</small><h3>${html(mission.report?.title || mission.title)}</h3><p>${html((mission.report?.text || '').slice(0, 170))}${(mission.report?.text?.length || 0) > 170 ? '…' : ''}</p><button class="link" data-team-issue="${html(mission.id)}">Открыть выпуск ↗</button></div></article>`).join('') : '<p class="empty">После первой завершённой миссии здесь появится первый выпуск: название, участники, история и фотографии.</p>'}</div></section>`;
  }
  function render() {
    const heading = room?.name || 'Ваш общий Пауковерс';
    return `<section class="page team-page" id="teamRoot"><span class="eyebrow">SPIDER-LINK / КОМАНДНЫЙ КАНАЛ</span><div class="team-title"><h1>${html(heading)}</h1>${membership ? '<button class="link" data-team-action="refresh">Обновить ↻</button>' : ''}</div><p id="team-status" class="team-status ${error ? 'team-error' : ''}" role="status" aria-live="polite">${html(error || (room ? `Сигнал стабилен${updated ? ' · обновлено ' + updated : ''}` : membership ? 'Подключаемся к штабу…' : 'Выбери: создать команду или войти по приглашению.'))}</p>${incomingInvite()}${membership && !room ? `<div class="empty">${html(error || 'Загружаем участников и миссии команды.')}<div class="team-actions"><button class="btn secondary" data-team-action="refresh">Попробовать ещё раз</button><button class="link" data-team-action="disconnect">Отключить это устройство</button></div></div>` : !room ? welcome() : `<div class="team-topbar"><p>Ваши профили, встречи и миссии доступны всей команде.</p><div class="team-actions"><button class="btn" data-team-action="poster">Обложка команды ↓</button><button class="btn secondary" data-team-action="profile">Передать мой паспорт ↗</button></div></div>${invitePanel()}${map()}<div class="team-columns">${rallies()}${missions()}</div>${chronicles()}<div class="team-settings"><h2>Настройки подключения</h2>${owner() ? '<div class="team-actions"><button class="link" data-team-action="rename">Переименовать штаб</button><button class="link" data-team-action="rotate">Обновить приглашение</button></div><p class="team-help">После обновления приглашения старая ссылка перестанет работать. Подключённые участники сохранят доступ.</p>' : ''}<button class="link" data-team-action="disconnect">Отключить этот браузер от штаба</button><p class="team-help">Это удалит ключ доступа с этого устройства. Паспорт и история команды останутся на сервере.</p></div>`}</section>`;
  }
  function openRally() {
    modal(`<span class="eyebrow">ПАУЧИЙ ПОЗЫВ</span><h2>Объявить сбор</h2><form id="team-rally" class="team-form"><label>Название<input name="title" required maxlength="100" placeholder="Киновечер в штабе"></label><label>Дата и время встречи<input name="when" type="datetime-local" required></label><label>Место и детали<textarea name="description" required maxlength="1000" placeholder="Где встречаемся и что берём с собой"></textarea></label><button class="btn">Отправить сигнал команде →</button></form>`);
  }
  function openMission() {
    modal(`<span class="eyebrow">ДОСКА ОБЩИХ ЗАДАНИЙ</span><h2>Новая миссия</h2><form id="team-mission" class="team-form"><label>Название<input name="title" required maxlength="100" placeholder="Найти новую точку на карте"></label><label>Что предстоит сделать<textarea name="description" required maxlength="1600" placeholder="Опиши задание для вашей компании"></textarea></label><button class="btn">Добавить миссию →</button></form>`);
  }
  function openReport(id) {
    const mission = room.missions.find(m => m.id === id);
    if (!mission) return;
    modal(`<span class="eyebrow">СЛЕДУЮЩИЙ ВЫПУСК КОМИКСА</span><h2>${html(mission.title)}</h2><form id="team-report" data-mission-id="${html(id)}" class="team-form"><label>Название выпуска<input name="title" required maxlength="100" value="${html(mission.title)}"></label><label>Как всё прошло<textarea name="text" required maxlength="4000" placeholder="Сохрани лучший момент вашей миссии"></textarea></label><label>До трёх фотографий<input id="team-report-files" name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p class="team-help">Снимки будут уменьшены перед отправкой и доступны участникам штаба.</p><div id="team-report-previews"></div><button class="btn">Завершить миссию и выпустить комикс ↗</button></form>`);
  }
  function openIssue(id) {
    const mission = room.missions.find(m => m.id === id);
    if (!mission) return;
    modal(`<div class="team-issue-detail"><span class="eyebrow">ХРОНИКИ / ${html(date(mission.completedAt))}</span><h2>${html(mission.report?.title || mission.title)}</h2><p class="team-help">Герои выпуска: ${html(mission.participants.map(memberName).join(', '))}</p><p class="team-report-text">${html(mission.report?.text || '')}</p>${(mission.report?.photos || []).map(item => photo(item)).join('')}</div>`);
    hydratePhotos();
  }
  function openMember(id) {
    const member = room.members.find(m => m.id === id);
    if (!member) return;
    const history = room.missions.filter(m => m.status === 'done' && m.participants.includes(id));
    modal(`<div class="team-member-detail">${art(member)}<span class="eyebrow">EARTH-${html(member.earth)}</span><h2>${html(member.name)}</h2><p>${html(heroFor(member).name)}</p><p>${html(member.power)}</p><blockquote>${html(member.motto || 'Любой может надеть маску.')}</blockquote><h3>Общие приключения</h3>${history.length ? history.map(m => `<button class="team-history-item" data-team-issue="${html(m.id)}"><strong>${html(m.report?.title || m.title)}</strong><small>${html(m.participants.map(memberName).join(', '))}</small></button>`).join('') : '<p class="team-help">Первая совместная миссия ещё впереди.</p>'}</div>`);
  }
  async function hydratePhotos() {
    if (!membership) return;
    const expectedRoom = membership.roomId;
    const nodes = [...document.querySelectorAll('[data-team-photo]')];
    for (const node of nodes) {
      const id = node.dataset.teamPhoto, key = `${expectedRoom}/${id}`;
      if (!id) continue;
      if (photoUrls.has(key)) { node.src = photoUrls.get(key); continue; }
      if (!photoRequests.has(key)) {
        photoRequests.set(key, api(roomPath(`/photos/${encodeURIComponent(id)}`), { binary: true }).then(blob => {
          if (membership?.roomId !== expectedRoom) return null;
          const url = URL.createObjectURL(blob); photoUrls.set(key, url); return url;
        }).catch(() => null).finally(() => photoRequests.delete(key)));
      }
      const url = await photoRequests.get(key);
      if (url && node.isConnected) node.src = url;
      else if (node.isConnected) node.alt = 'Снимок пока недоступен. Обнови страницу штаба.';
    }
  }
  async function compressPhoto(file) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Для отчёта подходят фотографии JPEG, PNG или WebP.');
    if (file.size > 20 * 1024 * 1024) throw new Error('Один снимок не должен превышать 20 МБ.');
    const url = URL.createObjectURL(file), image = new Image();
    try {
      image.src = url; await image.decode();
      let scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      for (let shrink = 0; shrink < 4; shrink++) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [.86, .72, .58, .44]) {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
          if (blob && blob.size <= 350000) return blob;
        }
        scale *= .72;
      }
      throw new Error('Не удалось уменьшить снимок. Выбери другую фотографию.');
    } catch (e) { if (e.name === 'EncodingError') throw new Error('Не удалось прочитать фотографию. Выбери другой файл.'); throw e; }
    finally { URL.revokeObjectURL(url); }
  }
  function showSelectedPhotos(input) {
    const target = document.getElementById('team-report-previews');
    if (!target) return;
    const files = [...input.files];
    if (files.length > 3) { input.value = ''; target.textContent = 'Можно добавить не больше трёх фотографий.'; toast('Выбери до трёх снимков.'); return; }
    target.innerHTML = files.map((file, i) => `<label>${html(file.name)}<input name="caption-${i}" maxlength="160" placeholder="Подпись к снимку ${i + 1}"></label>`).join('');
  }
  async function submitReport(form, data) {
    const files = [...(form.querySelector('input[type="file"]')?.files || [])];
    if (files.length > 3) throw new Error('Добавь не больше трёх фотографий.');
    const photos = [];
    for (let i = 0; i < files.length; i++) {
      status(`Отправляем снимок ${i + 1} из ${files.length}…`);
      const file = files[i], key = `${membership.roomId}/${form.dataset.missionId}/${file.name}/${file.size}/${file.lastModified}`;
      let id = uploads.get(key);
      if (!id) {
        const blob = await compressPhoto(file);
        const result = await api(roomPath('/photos'), { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob });
        id = result.photo?.id;
        if (!id) throw new Error('Сервер не подтвердил сохранение снимка.');
        uploads.set(key, id);
      }
      photos.push({ id, caption: String(data.get(`caption-${i}`) || '').trim() });
    }
    await action({ type: 'mission.complete', missionId: form.dataset.missionId, title: String(data.get('title')).trim(), text: String(data.get('text')).trim(), photos });
    document.getElementById('modal').close(); dirty = false; toast('Новый выпуск появился в хрониках команды.');
  }
  function onView(next) {
    active = next === 'team';
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    if (active) {
      dirty = false; hydratePhotos();
      if (membership) {
        pull(); pollTimer = setInterval(() => { if (!document.hidden && !busy) pull(); }, 6000);
      }
    }
  }
  document.addEventListener('visibilitychange', () => { if (active && !document.hidden) pull(); });
  document.addEventListener('online', () => { if (active) pull(); });
  document.addEventListener('input', event => { if (event.target.closest('form[id^="team-"]')) dirty = true; });
  document.addEventListener('change', event => {
    if (event.target.closest('form[id^="team-"]')) dirty = true;
    if (event.target.id === 'team-report-files') showSelectedPhotos(event.target);
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.teamMember) { openMember(button.dataset.teamMember); return; }
    if (button.dataset.teamIssue) { openIssue(button.dataset.teamIssue); return; }
    if (button.dataset.teamMissionComplete) { openReport(button.dataset.teamMissionComplete); return; }
    if (button.dataset.teamRally) { perform(() => action({ type: 'rally.respond', rallyId: button.dataset.teamRally, response: button.dataset.teamResponse })); return; }
    if (button.dataset.teamMissionJoin) { perform(() => action({ type: 'mission.join', missionId: button.dataset.teamMissionJoin, joined: button.dataset.teamJoined === 'true' })); return; }
    const command = button.dataset.teamAction;
    if (!command) return;
    if (command === 'refresh') { dirty = false; perform(() => pull(true)); }
    if (command === 'invite') copyInvite();
    if (command === 'rally-new') openRally();
    if (command === 'mission-new') openMission();
    if (command === 'dismiss-invite') { inviteDraft = ''; if (location.hash.startsWith('#join=')) history.replaceState(null, '', location.pathname + location.search); refresh(true); }
    if (command === 'profile') perform(async () => { await action({ type: 'profile.update', member: profile() }); toast('Паспорт передан в общий штаб.'); });
    if (command === 'disconnect') {
      persist(null); room = null; dirty = false; error = ''; clearPhotos(); onView('team'); refresh(true); toast('Этот браузер отключён от команды.');
    }
    if (command === 'rename') modal(`<span class="eyebrow">НАЗВАНИЕ ВАШЕЙ ВСЕЛЕННОЙ</span><h2>Имя штаба</h2><form id="team-rename" class="team-form"><label>Название<input name="name" required maxlength="80" value="${html(room.name)}"></label><button class="btn">Сохранить →</button></form>`);
    if (command === 'rotate') perform(async () => { await action({ type: 'room.invite.rotate' }); toast('Приглашение обновлено. Скопируй новую ссылку.'); });
    if (command === 'poster') perform(async () => {
      if (!window.SpiderExtras?.downloadTeamPoster) throw new Error('Обложка команды пока недоступна. Обнови страницу сайта.');
      await window.SpiderExtras.downloadTeamPoster(posterMembers(), room.name);
    });
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form.id?.startsWith('team-')) return;
    event.preventDefault();
    const data = new FormData(form);
    perform(async () => {
      if (form.id === 'team-create' || form.id === 'team-join') {
        const create = form.id === 'team-create';
        const result = await api(create ? '/api/rooms' : '/api/rooms/join', { method: 'POST', body: JSON.stringify({ ...(create ? { name: String(data.get('roomName')).trim() } : { code: normalizeCode(data.get('inviteCode')) }), member: profile(data.get('memberName')) }) });
        if (!result.membership?.token || !result.room) throw new Error('Сервер не подтвердил подключение к штабу.');
        clearPhotos(); persist(result.membership); dirty = false; inviteDraft = ''; applyRoom(result.room, true); onView('team');
        if (location.hash.startsWith('#join=')) history.replaceState(null, '', location.pathname + location.search);
        toast(create ? 'Портал открыт. Пригласи друзей в команду.' : 'Новый сигнал подтверждён. Ты в штабе!');
      }
      if (form.id === 'team-rally') {
        const when = new Date(String(data.get('when')));
        if (Number.isNaN(when.valueOf())) throw new Error('Укажи дату и время сбора.');
        await action({ type: 'rally.create', title: String(data.get('title')).trim(), description: String(data.get('description')).trim(), when: when.toISOString() });
        document.getElementById('modal').close(); dirty = false; toast('Команда получила паучий позыв.');
      }
      if (form.id === 'team-mission') {
        await action({ type: 'mission.create', title: String(data.get('title')).trim(), description: String(data.get('description')).trim() });
        document.getElementById('modal').close(); dirty = false; toast('Миссия добавлена в общий штаб.');
      }
      if (form.id === 'team-report') await submitReport(form, data);
      if (form.id === 'team-rename') {
        await action({ type: 'room.rename', name: String(data.get('name')).trim() });
        document.getElementById('modal').close(); dirty = false;
      }
    });
  });
  function posterMembers() {
    return (room?.members || []).map(({ name, heroId, earth, power, motto, persona }) => ({ name, heroId, earth, power, motto, persona }));
  }
  function ready() {
    if (location.hash.startsWith('#join=')) {
      inviteDraft = normalizeCode(location.hash.slice(6));
      queueMicrotask(() => go('team'));
    }
  }
  window.SpiderTeam = { render, onView, bind: hydratePhotos, profile, snapshot: () => room, posterMembers, ready };
  ready();
})();
