const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const heroes = spiderCatalog;
const quizProfiles = Object.fromEntries(heroes.map(h => [h.id, h.quizProfile]));
const groups = {'alternate':'Другие вселенные','legacy':'Наследники маски','spider-women':'Героини','unusual':'Необычные пауки'};
let catalogQuery = '', catalogGroup = '', catalogUniverse = '', catalogSort = 'original', favoritesOnly = false, catalogPage = 0;
const pageSize = 24;
let catalogFiltersOpen = false;
function recommendHero(responses) {
  const counts = Array(6).fill(0);
  responses.forEach(answer => { if(Number.isInteger(answer) && answer >= 0 && answer < 6) counts[answer]++; });
  let bestIndex = 0, bestDistance = Infinity;
  heroes.forEach((hero, index) => {
    const distance = quizProfiles[hero.id].reduce((sum, count, category) => sum + (count - counts[category]) ** 2, 0);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return bestIndex;
}
function matchesHero(hero, query = catalogQuery) {
  const normalize = value => String(value || '').toLocaleLowerCase('ru-RU').replaceAll('ё','е');
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const haystack = normalize([hero.name,hero.alias,hero.earth,'Earth-'+hero.earth,hero.power].join(' '));
  return words.every(word => haystack.includes(word));
}
function catalogMatches() {
  const indices = heroes.map((_,i)=>i).filter(i=>matchesHero(heroes[i]) && (!catalogGroup || heroes[i].group===catalogGroup) && (!catalogUniverse || heroes[i].earth===catalogUniverse) && (!favoritesOnly || state.favorites.includes(heroes[i].id)));
  if(catalogSort==='name') indices.sort((a,b)=>heroes[a].name.localeCompare(heroes[b].name,'ru'));
  if(catalogSort==='earth') indices.sort((a,b)=>heroes[a].earth.localeCompare(heroes[b].earth,undefined,{numeric:true}) || a-b);
  return indices;
}
function filterCatalog() {
  const matches = catalogMatches(), pages = Math.ceil(matches.length/pageSize);
  catalogPage = Math.max(0,Math.min(catalogPage,pages-1));
  const start = catalogPage*pageSize, visible = matches.slice(start,start+pageSize);
  const cards = $('#heroCards');
  if(!cards) return;
  cards.innerHTML = visible.map(characterCard).join('');
  $('#catalogCount').textContent = matches.length ? 'Показано '+(start+1)+'–'+(start+visible.length)+' из '+matches.length+' · Всего '+heroes.length : 'Ничего не найдено · Всего '+heroes.length;
  $('#noHeroes').hidden = matches.length !== 0;
  $('#catalogPagination').innerHTML = pages>1 ? '<button class="btn secondary" data-page="'+(catalogPage-1)+'" '+(catalogPage===0?'disabled':'')+'>← Назад</button><span>Страница '+(catalogPage+1)+' из '+pages+'</span><button class="btn secondary" data-page="'+(catalogPage+1)+'" '+(catalogPage===pages-1?'disabled':'')+'>Дальше →</button>' : '';
  const favoriteToggle = $('#favoritesOnly');
  if(favoriteToggle) {favoriteToggle.setAttribute('aria-pressed',String(favoritesOnly));favoriteToggle.textContent = '★ Избранное · '+state.favorites.length;}
}
const questions=[['Друг в беде, но план почти сорвался. Ты…',['Импровизирую. Придумаем по дороге.','Доверюсь чутью и прикрою друга.','Сначала вытащу его, потом разберусь.','Нарушу план. Друзья важнее правил.','Найду самый безопасный выход.','Подбодрю всех — вместе справимся.']],['Идеальный вечер после спасения города?',['Рисовать под любимый плейлист.','Репетиция с группой.','Пицца и разговор с близкими.','Подпольный концерт.','Тишина и работа над новым устройством.','Прогулка с друзьями и вкусный чай.']],['Твоя сильная сторона в команде?',['Свежие идеи.','Умение чувствовать момент.','На меня можно положиться.','Не боюсь спорить с системой.','Умею видеть картину целиком.','Могу объединить очень разных людей.']],['Если получишь новую способность…',['Придумаю ей неожиданное применение.','Потренируюсь без лишних свидетелей.','Подумаю, кому смогу помочь.','Использую её по своим правилам.','Изучу все риски и ограничения.','Покажу друзьям — они оценят.']],['Что сложнее всего?',['Перестать сравнивать себя с другими.','Открыто говорить о чувствах.','Находить время для себя.','Мириться с чужими ограничениями.','Отпускать контроль.','Признать, что иногда мне тоже грустно.']],['Ваш штаб остался без света. Что делать?',['Сделаем из этого приключение.','Соберёмся поближе и поговорим.','Проверю, всем ли нужна помощь.','Устроим акустический концерт.','Найду неисправность.','Достану настолки и позову всех.']],['Какой след ты хочешь оставить?',['Показать, что каждый может стать героем.','Помочь другим быть собой.','Сделать чью-то жизнь лучше.','Дать людям смелость менять правила.','Защитить будущее.','Подарить людям больше радости.']]];
const missions=[{title:'По ту сторону экрана',tag:'КИНОВЕЧЕР',desc:'Соберитесь на просмотр любимого фильма о пауках. После титров каждый выбирает лучший момент.',reward:'Билет в мультивселенную',icon:'▣'},{title:'Обложка нашего выпуска',tag:'ФОТОМИССИЯ',desc:'Сделайте общее фото в супергеройских позах. Придумайте название вашему первому выпуску.',reward:'Объектив хроникёра',icon:'◉'},{title:'За пределами маршрута',tag:'ИССЛЕДОВАНИЕ',desc:'Найдите новое место для встречи. Пусть каждый предложит одну точку, а маршрут выберет жребий.',reward:'Неоновая паутина',icon:'✳'},{title:'Новый злодей в городе',tag:'ТВОРЧЕСКАЯ МИССИЯ',desc:'Придумайте злодея из вашей общей шутки: его имя, слабость и план захвата мира.',reward:'Досье антагониста',icon:'◈'}];
let state={name:'',hero:0,earth:'1610',power:heroes[0].power,motto:'Любой может надеть маску.',team:'Мой Пауковерс',status:'На связи',active:[],done:[],notes:{},events:[],favorites:[],heroId:heroes[0].id};try{state=sanitizeState(JSON.parse(localStorage.getItem('spider-link-v1')||'{}'))}catch{}

function sanitizeState(value) {
  if(!value || typeof value!=='object' || Array.isArray(value)) return {...state};
  const clean = {...state};
  for(const key of ['name','earth','power','motto','team','status']) if(typeof value[key]==='string') clean[key]=value[key].slice(0,key==='power'||key==='motto'?90:40);
  let index = typeof value.heroId==='string' ? heroes.findIndex(h=>h.id===value.heroId) : value.hero;
  if(!Number.isInteger(index) || index<0 || index>=heroes.length) index=0;
  clean.hero=index; clean.heroId=heroes[index].id;
  const missionIds = list => Array.isArray(list) ? [...new Set(list.filter(i=>Number.isInteger(i)&&i>=0&&i<missions.length))] : [];
  clean.done=missionIds(value.done); clean.active=missionIds(value.active).filter(i=>!clean.done.includes(i));
  clean.favorites=Array.isArray(value.favorites)?[...new Set(value.favorites.filter(id=>heroes.some(h=>h.id===id)))]:[];
  clean.notes={}; for(let i=0;i<missions.length;i++) if(typeof value.notes?.[i]==='string') clean.notes[i]=value.notes[i].slice(0,600);
  clean.events=Array.isArray(value.events)?value.events.filter(e=>e&&typeof e.text==='string'&&typeof e.date==='string').slice(0,12).map(e=>({text:e.text.slice(0,200),date:e.date.slice(0,32)})):[];
  return clean;
}

let view='hq',step=0,answers=[],toastTimer;const mask=()=>'<div class="mask"><span class="eye left"></span><span class="eye right"></span></div>';
function heroArt(i=state.hero){const h=heroes[i];return `<img class="comic-art" src="${esc(h.image)}" alt="${esc(h.name)} — комиксный облик" loading="lazy">`;}
function save(){state.heroId=heroes[state.hero].id;try{localStorage.setItem('spider-link-v1',JSON.stringify(state))}catch{toast('Не удалось сохранить: проверь свободное место и настройки браузера.')}updateTop()}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4500)}
function event(t){state.events.unshift({text:t,date:new Date().toLocaleDateString('ru-RU')});state.events=state.events.slice(0,12);save()}
function activeProfile(){
  if(window.SpiderExtras?.heroForProfile){const p=window.SpiderExtras.heroForProfile();return {...p,name:p.active?p.name:(p.displayName||state.name||p.name)};}
  const h=heroes[state.hero];return {...h,name:state.name||h.name,earth:state.earth||h.earth,power:state.power||h.power,motto:state.motto,active:false};
}
function updateTop(){const profile=activeProfile();$('#topName').textContent=profile.name||'Новый паук';$('#topEarth').textContent=profile.earth||'?'}
function capturePassportDraft(){if(view!=='passport')return;const form=$('#passportForm');if(!form)return;const data=new FormData(form);for(const key of ['name','earth','power','motto','status'])state[key]=String(data.get(key)||'').trim();}
function go(v){if(view==='passport'&&v!==view){capturePassportDraft();save();}view=v;document.querySelectorAll('aside nav button').forEach(b=>{b.classList.toggle('active',b.dataset.view===v);if(b.dataset.view===v)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});render();window.scrollTo({top:0,behavior:'smooth'})}
function missionCard(m,i){const done=state.done.includes(i),active=state.active.includes(i);return `<article class="mission ${done?'done':''}"><span class="tag">${m.icon} ${m.tag} / 0${i+1}</span><h3>${m.title}</h3><p>${m.desc}</p><div class="mission-bottom"><span>✧ ${m.reward}</span><button class="link" data-mission="${i}">${done?'Итоги ↗':active?'Завершить ↗':'Принять →'}</button></div></article>`}
function hq(){return `<div class="intro"><div><h2>Твой штаб. Твои правила.</h2><p>С возвращением в мультивселенную${state.name?', '+esc(state.name):''}.</p></div><span class="pill">◉ ЛИЧНЫЙ РЕЖИМ</span></div><section class="hero"><div class="hero-copy"><span class="eyebrow">ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ</span><h1>ОДНА МАСКА.<br>МИЛЛИОН<br><em>ВОЗМОЖНОСТЕЙ.</em></h1><p>Найди своего паука. Собери свою историю.<br>Каждая вселенная начинается с тебя.</p><div class="hero-actions"><button class="btn" data-view="quiz">Найти своего паука <span>↗</span></button><button class="btn secondary" data-view="team">Собрать свою команду ↗</button><button class="link" data-view="catalog">Все пауки · ${heroes.length} ↗</button></div></div><div class="hero-art"><div class="portal"></div>${mask()}<span class="art-label">WHAT'S UP, DANGER?</span></div><span class="serial">DIMENSIONAL GATEWAY / EARTH-${esc(state.earth)}</span></section><div class="stats"><div class="stat"><b>${state.name?'01':'00'}</b><span>ГЕРОЕВ<br>В ЛИЧНОМ ШТАБЕ</span></div><div class="stat"><b>0${state.active.length}</b><span>АКТИВНЫХ<br>МИССИЙ</span></div><div class="stat"><b>0${state.done.length}</b><span>ТРОФЕЕВ<br>В КОЛЛЕКЦИИ</span></div></div><div class="grid"><section><div class="section-title"><h2>Твоя вселенная</h2><button class="link" data-view="team">Открыть общий штаб ↗</button></div><div class="map"><button class="node" data-view="passport"><span style="color:var(--red);font-size:28px">◢◣</span><strong>${esc(state.name||'ТВОЙ СИГНАЛ')}</strong><small>EARTH-${esc(state.earth)} / ${esc(state.status)}</small></button><span class="map-note">${state.name?'01 СИГНАЛ ОБНАРУЖЕН':'ОЖИДАНИЕ ИДЕНТИФИКАЦИИ'}</span></div><p class="notice">Это твой личный сигнал. В общем штабе можно пригласить друзей, объявить сбор и сохранить совместные приключения.</p></section><section><div class="section-title"><h2>Пора на вылазку</h2><button class="link" data-view="missions">Все миссии ↗</button></div>${missionCard(missions[state.active[0]??0],state.active[0]??0)}</section></div><section style="margin-top:28px"><div class="section-title"><h2>Хроники штаба</h2><span class="eyebrow">LIVE FEED</span></div>${state.events.length?state.events.slice(0,4).map(e=>`<div class="empty" style="margin-top:8px;padding:14px"><span class="red">${esc(e.date)} / </span>${esc(e.text)}</div>`).join(''):'<div class="empty">● Канал открыт. Создай паспорт — и здесь появится первая запись твоей истории.</div>'}</section>`}
function quiz(){if(step>=questions.length){const idx=recommendHero(answers);return `<section class="page"><span class="eyebrow">СИГНАЛ РАСПОЗНАН</span><h1 style="margin-top:22px">Твой паук —<br><span class="red">${heroes[idx].name}</span></h1><p>${heroes[idx].trait}</p><p>Ближайший образ по твоим ответам среди ${heroes.length} героев. Это игровой тест — персонажа всегда можно изменить.</p><div class="hero-art" style="max-width:380px"><div class="portal"></div>${heroArt(idx)}</div><button class="btn" data-result="${idx}">Принять сигнал →</button> <button class="btn secondary" data-action="restart">Пройти ещё раз</button></section>`}return `<section class="page"><span class="eyebrow">ТЕСТ / ИДЕНТИФИКАЦИЯ ПАУКА</span><h1 style="margin-top:22px">Кто под маской?</h1><p>Семь вопросов, ${heroes.length} возможных героев. Выбирай то, что ближе тебе.</p><div class="quizbox"><span class="question-num">ВОПРОС 0${step+1} / 07</span><div class="progress"><div style="width:${step/7*100}%"></div></div><h2>${questions[step][0]}</h2><div class="answers">${questions[step][1].map((a,i)=>`<button data-answer="${i}"><span class="red">0${i+1} / </span>${a}</button>`).join('')}</div>${step?'<button class="link" style="margin-top:20px" data-action="back">← Предыдущий вопрос</button>':''}</div></section>`}
function characterCard(i) {
  const h=heroes[i], favorite=state.favorites.includes(h.id);
  return `<article class="catalog-entry" data-index="${i}"><button class="character ${i===state.hero?'selected':''}" data-hero="${i}" aria-label="Выбрать: ${esc(h.name)}"><span class="eyebrow" style="color:${h.color}">EARTH-${esc(h.earth||'?')}${i===state.hero?' / ВЫБРАН':''}</span>${heroArt(i)}<h3>${esc(h.name)}</h3><small>${esc(h.alias)}</small><span class="hero-category">${esc(groups[h.group]||'Паучья вселенная')}</span></button><div class="card-actions"><button class="favorite-button" data-favorite="${i}" aria-pressed="${favorite}" aria-label="${favorite?'Убрать из избранного':'В избранное'}: ${esc(h.name)}">${favorite?'★':'☆'}</button><button class="details-button" data-details="${i}">Досье ↗</button><button class="compare-button" data-compare="${i}" aria-label="Сравнить: ${esc(h.name)}">⇄</button></div></article>`;
}
function catalog() {
  const universes=[...new Set(heroes.map(h=>h.earth).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  return `<section class="page"><span class="eyebrow">АРХИВ МУЛЬТИВСЕЛЕННОЙ / ${heroes.length} СИГНАЛОВ</span><h1 style="margin-top:22px">Найди свою<br><span class="red">версию героя.</span></h1><p>От знакомых лиц до самых необычных пауков. У каждого — свой мир, история и комиксный облик.</p><div id="catalogToolbar" class="catalog-toolbar ${catalogFiltersOpen?'filters-open':''}"><label class="catalog-search">Поиск по мультивселенной<input id="catalogSearch" type="search" value="${esc(catalogQuery)}" placeholder="Имя, псевдоним, способность или Earth…"></label><button class="filter-toggle" data-action="filters" aria-expanded="${catalogFiltersOpen}" aria-controls="catalogFilters">Фильтры и сортировка <span>⌄</span></button><div id="catalogFilters" class="catalog-controls"><label>Герои<select id="catalogGroup"><option value="">Все категории</option>${Object.entries(groups).map(([id,title])=>`<option value="${id}" ${id===catalogGroup?'selected':''}>${title}</option>`).join('')}</select></label><label>Вселенная<select id="catalogUniverse"><option value="">Все вселенные</option>${universes.map(earth=>`<option value="${esc(earth)}" ${earth===catalogUniverse?'selected':''}>Earth-${esc(earth)}</option>`).join('')}</select></label><label>Порядок<select id="catalogSort">${[['original','По каталогу'],['name','По имени'],['earth','По вселенной']].map(([id,title])=>`<option value="${id}" ${id===catalogSort?'selected':''}>${title}</option>`).join('')}</select></label></div></div><div class="catalog-meta"><p id="catalogCount" class="catalog-count" role="status" aria-live="polite"></p><button id="favoritesOnly" class="btn secondary" data-action="favorites" aria-pressed="${favoritesOnly}">★ Избранное · ${state.favorites.length}</button><button class="link" data-action="resetFilters">Сбросить фильтры</button></div><div class="cards catalog-grid" id="heroCards"></div><div id="noHeroes" class="empty" hidden>Сигнал не найден. Измени запрос или сбрось фильтры.</div><nav id="catalogPagination" class="catalog-pagination" aria-label="Страницы каталога"></nav><p class="notice">${heroes.length} персонажей с комиксными изображениями. Все доступны в тесте и вручную. Подборка расширяется: это ещё не полный список пауков Marvel. Источники — в досье каждого героя.</p></section>`;
}
function heroDetail(i) {
  const h=heroes[i];
  if(!h) return;
  modal(`<div class="hero-detail"><div class="detail-art">${heroArt(i)}</div><div class="detail-copy"><span class="eyebrow">ЛИЧНОЕ ДЕЛО / ${esc(h.id.toUpperCase())}</span><h2>${esc(h.name)}</h2><p class="red">${esc(h.alias)}</p><dl class="detail-facts"><dt>Вселенная</dt><dd>${h.earth?'Earth-'+esc(h.earth):'Не подтверждена'}</dd><dt>Особенности</dt><dd>${esc(h.power)}</dd><dt>История</dt><dd>${esc(h.trait)}</dd>${h.firstAppearance?`<dt>Первое появление</dt><dd>${esc(h.firstAppearance)}</dd>`:''}</dl><button class="btn" data-hero="${i}">Выбрать этого героя →</button><button class="btn secondary" data-compare="${i}">Сравнить с другим героем ⇄</button><div class="detail-sources"><a class="art-source" href="${esc(h.source)}" target="_blank" rel="noopener noreferrer">Источник ↗</a>${h.imageSource&&h.imageSource!==h.source?`<a class="art-source" href="${esc(h.imageSource)}" target="_blank" rel="noopener noreferrer">Комиксное изображение ↗</a>`:''}</div><small class="muted">${esc(h.credit||'Marvel Comics · фанатский каталог')}</small></div></div>`);
}
function passport() {
  const h=heroes[state.hero];
  return `<section class="page"><span class="eyebrow">ПАУЧИЙ ПАСПОРТ / ЛИЧНОЕ ДЕЛО</span><h1 style="margin-top:22px">Под маской — ты.</h1><p>Выбери героя и добавь то, что делает твою версию особенной.</p><div class="profile-tools"><button class="btn secondary" data-view="sona">Создать своего паука ✳</button><button class="btn secondary" data-view="team">Моя команда ↗</button>${activeProfile().active?'<span class="notice">На обложке и в профиле команды используется твой Spider-Sona.</span>':''}</div><div class="passport-summary">${heroArt()}<div><span class="eyebrow">ТВОЙ ПАУК / EARTH-${esc(h.earth||'?')}</span><h2>${esc(h.name)}</h2><p>${esc(h.alias)}</p><p>${esc(h.trait)}</p><button class="btn secondary" data-view="catalog">Сменить героя · ${heroes.length} в каталоге ↗</button> <button class="link" data-details="${state.hero}">Досье ↗</button></div></div><form id="passportForm" class="form"><label>Имя героя<input name="name" maxlength="32" required value="${esc(state.name)}" placeholder="Как тебя звать в мультивселенной?"></label><label>Номер вселенной<input name="earth" maxlength="12" pattern="[A-Za-z0-9 -]+" required value="${esc(state.earth)}" placeholder="Номер твоей вселенной"></label><label>Суперспособность<input name="power" maxlength="80" value="${esc(state.power)}" required></label><label>Статус<select name="status">${['На связи','Спасаю город','Отдыхаю после миссии'].map(s=>`<option ${s===state.status?'selected':''}>${s}</option>`).join('')}</select></label><label class="wide">Фраза героя<input name="motto" maxlength="90" value="${esc(state.motto)}"></label><button class="btn" type="submit">Сохранить паспорт ↗</button></form><h2>Твои трофеи</h2><div class="trophies">${state.done.length?state.done.map(i=>`<span class="trophy">${missions[i].icon} ${missions[i].reward}</span>`).join(''):'<span class="muted">Первый трофей ждёт тебя в миссиях.</span>'}</div><div class="profile-tools"><button class="btn secondary" data-action="exportProfile">Сохранить копию профиля ↓</button><label class="btn secondary">Загрузить копию профиля<input id="importProfile" type="file" accept="application/json,.json" hidden></label></div><p class="notice">Копия сохраняет паспорт, избранное, миссии и трофеи. Её можно перенести в другой браузер. Вход в команду сохраняется отдельно на этом устройстве. Копия профиля не содержит ключ доступа к комнате.</p></section>`;
}
function selectHero(i) {
  if(!Number.isInteger(i)||!heroes[i]) return;
  const form=view==='passport'?$('#passportForm'):null;
  if(form) {const data=new FormData(form);for(const key of ['name','motto','status']) state[key]=String(data.get(key)||'');}
  window.SpiderExtras?.deactivatePersona?.();state.hero=i;state.heroId=heroes[i].id;state.earth=heroes[i].earth;state.power=heroes[i].power;
  save(); if($('#modal').open) $('#modal').close(); go('passport'); toast('Герой выбран: '+heroes[i].name);
}
function exportProfile() {
  capturePassportDraft(); save();
  const blob=new Blob([JSON.stringify({app:'SPIDER-LINK',version:1,profile:state,sona:window.SpiderExtras?.persona?.()||null},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='spider-link-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Копия профиля готова');
}

function missionPage(){return `<section class="page"><span class="eyebrow">ДОСКА ЗАДАНИЙ / ВЫХОД В ГОРОД</span><h1 style="margin-top:22px">Маленькие миссии.<br>Большие истории.</h1><p>Выполняйте задания с друзьями, а здесь сохраняй свои итоги и собирай трофеи.</p><div class="mission-grid">${missions.map(missionCard).join('')}</div><p class="notice">Здесь хранятся личные итоги. Совместные задания, фотографии и выпуски комикса находятся в штабе команды.</p></section>`}
function coverPage(){
  const p=activeProfile(),label=p.active?'Spider-Sona':heroes[state.hero].name;
  return `<section class="page"><span class="eyebrow">ТВОЙ ПЕРВЫЙ ВЫПУСК</span><h1 style="margin-top:22px">Ты на обложке.</h1><div class="cover-layout"><div class="cover"><small>SPIDER-LINK PRESENTS / ISSUE 001</small><h2>YOUR FRIENDLY<br>MULTIVERSE</h2><img class="comic-art" src="${esc(p.image)}" alt="${esc(label)}"><strong>${esc(p.name||'НОВЫЙ ПАУК')}</strong><small>EARTH-${esc(p.earth)} · ${esc(label)}</small><small style="text-align:center">${esc(p.motto)}</small></div><div><h2>Каждому герою —<br>своя история.</h2><p>Сохрани личную обложку или собери общий постер команды в штабе.</p><button class="btn" data-action="download">Скачать обложку PNG ↓</button><br><br><button class="btn secondary" data-view="passport">Изменить паспорт ↗</button> <button class="btn secondary" data-view="team">Постер команды ↗</button><p class="notice">Фанатский проект для личного использования.</p></div></div></section>`;
}
function render(){$('#content').innerHTML=`<div class="reveal">${({hq,quiz,passport,catalog,missions:missionPage,cover:coverPage,team:()=>window.SpiderTeam?.render()||'<p>Штаб загружается…</p>',sona:()=>window.SpiderExtras?.renderSona()||'<p>Редактор загружается…</p>',compare:()=>window.SpiderExtras?.renderCompare()||'<p>Сравнение загружается…</p>'}[view]||hq)()}</div>`;updateTop();if(view==='catalog')filterCatalog();window.SpiderTeam?.onView?.(view);window.SpiderExtras?.onView?.(view)}
function modal(html){$('#modalContent').innerHTML=html;$('#modal').showModal()}
async function download(){
  const p=activeProfile(),c=document.createElement('canvas');c.width=900;c.height=1200;const g=c.getContext('2d');
  const grad=g.createLinearGradient(0,0,900,1200);grad.addColorStop(0,p.color||'#5e2b52');grad.addColorStop(1,'#101522');g.fillStyle=grad;g.fillRect(0,0,900,1200);
  g.strokeStyle='#eee3ce';g.lineWidth=18;g.strokeRect(9,9,882,1182);g.strokeStyle='#ff3b5040';g.lineWidth=2;
  for(let i=0;i<40;i++){g.beginPath();g.moveTo(450,650);g.lineTo(450+1500*Math.cos(i),650+1500*Math.sin(i));g.stroke();}
  g.textAlign='center';g.fillStyle='#eee3ce';g.font='18px sans-serif';g.fillText('SPIDER-LINK PRESENTS / ISSUE 001',450,70);g.font='bold 72px sans-serif';g.fillText('YOUR FRIENDLY',450,175,800);g.fillText('MULTIVERSE',450,255,800);
  try{const im=new Image();im.src=p.image;await im.decode();g.fillStyle='#171321';g.fillRect(145,300,610,565);const r=Math.min(610/im.width,565/im.height);g.drawImage(im,450-im.width*r/2,582-im.height*r/2,im.width*r,im.height*r);}catch{toast('Изображение ещё не загрузилось. Попробуй ещё раз.');return;}
  g.fillStyle='#eee3ce';g.font='bold 46px sans-serif';g.fillText(p.name||'НОВЫЙ ПАУК',450,930,800);g.font='22px sans-serif';g.fillText('EARTH-'+p.earth+' / '+(p.active?'Spider-Sona':heroes[state.hero].name),450,990,800);g.font='21px sans-serif';g.fillText(p.motto||'',450,1060,780);g.font='14px monospace';g.fillText('ONE TEAM. INFINITE UNIVERSES. / FAN PROJECT',450,1140);
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob){toast('Не удалось собрать обложку');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.download='spider-link-cover.png';a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Обложка готова к сохранению');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(b.dataset.view){go(b.dataset.view);return;}
  if(b.hasAttribute('data-answer')){const answer=Number(b.dataset.answer);if(step>=questions.length||!Number.isInteger(answer)||answer<0||answer>5)return;answers[step]=answer;step++;render();return;}
  if(b.hasAttribute('data-result')){selectHero(Number(b.dataset.result));return;}
  if(b.hasAttribute('data-hero')){selectHero(Number(b.dataset.hero));return;}
  if(b.hasAttribute('data-compare')){if($('#modal').open)$('#modal').close();window.SpiderExtras?.compareWith(Number(b.dataset.compare));return;}
  if(b.hasAttribute('data-details')){heroDetail(Number(b.dataset.details));return;}
  if(b.hasAttribute('data-favorite')){const h=heroes[Number(b.dataset.favorite)];if(!h)return;state.favorites=state.favorites.includes(h.id)?state.favorites.filter(id=>id!==h.id):[...state.favorites,h.id];save();filterCatalog();return;}
  if(b.hasAttribute('data-page')){catalogPage=Number(b.dataset.page);filterCatalog();$('#catalogSearch')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const action=b.dataset.action;
  if(action==='restart'){step=0;answers=[];render();}
  if(action==='back'&&step>0){step--;answers.pop();render();}
  if(action==='download')download();
  if(action==='filters'){catalogFiltersOpen=!catalogFiltersOpen;$('#catalogToolbar').classList.toggle('filters-open',catalogFiltersOpen);b.setAttribute('aria-expanded',String(catalogFiltersOpen));}
  if(action==='favorites'){favoritesOnly=!favoritesOnly;catalogPage=0;filterCatalog();}
  if(action==='resetFilters'){catalogQuery='';catalogGroup='';catalogUniverse='';favoritesOnly=false;catalogSort='original';catalogPage=0;render();}
  if(action==='exportProfile')exportProfile();
  if(action==='team')modal(`<span class="eyebrow">ЛИЧНЫЙ ШТАБ</span><h2 style="margin-top:20px">Название вашей вселенной</h2><form id="teamForm" class="form" style="display:block"><label>Название<input name="team" required maxlength="40" value="${esc(state.team)}"></label><button class="btn" style="margin-top:20px">Сохранить →</button></form><p class="notice">Название сохраняется на этом устройстве. Приглашения и общий штаб пока не подключены.</p>`);
  if(b.hasAttribute('data-mission')){
    const i=Number(b.dataset.mission);if(!missions[i])return;
    if(!state.active.includes(i)&&!state.done.includes(i)){state.active.push(i);event('Принята миссия «'+missions[i].title+'»');render();toast('Миссия принята. Пора собрать друзей!');}
    else modal(`<span class="eyebrow">${state.done.includes(i)?'АРХИВ МИССИИ':'ОТЧЁТ О МИССИИ'}</span><h2 style="margin-top:20px">${missions[i].title}</h2><form id="missionForm" data-id="${i}"><label>Что произошло? Сохрани лучший момент.<textarea name="note" required maxlength="600">${esc(state.notes[i]||'')}</textarea></label><button class="btn" style="margin-top:20px">${state.done.includes(i)?'Обновить заметку':'Завершить и получить трофей'} ↗</button></form>`);
  }
  if(b.classList.contains('close'))$('#modal').close();
});
document.addEventListener('submit',e=>{
  const form=e.target;if(!['passportForm','teamForm','missionForm'].includes(form.id))return;
  e.preventDefault();const data=new FormData(form);
  if(form.id==='passportForm'){
    for(const key of ['name','earth','power','motto','status'])state[key]=String(data.get(key)||'').trim();
    if(!state.name){toast('Добавь имя героя');return;}
    event('Сигнал подтверждён: '+state.name+' / EARTH-'+state.earth);go('cover');toast('Паспорт сохранён. Добро пожаловать в Пауковерс!');
  }
  if(form.id==='teamForm'){state.team=String(data.get('team')||'').trim();save();$('#modal').close();render();}
  if(form.id==='missionForm'){
    const i=Number(form.dataset.id);if(!missions[i])return;state.notes[i]=String(data.get('note')||'').trim().slice(0,600);if(!state.notes[i])return;
    if(!state.done.includes(i)){state.done.push(i);state.active=state.active.filter(n=>n!==i);event('Миссия завершена: '+missions[i].title);}
    save();$('#modal').close();render();toast('Итоги сохранены. Трофей в паспорте!');
  }
});
document.addEventListener('input',e=>{if(e.target.id==='catalogSearch'){catalogQuery=e.target.value;catalogPage=0;filterCatalog();}});
document.addEventListener('change',async e=>{
  const input=e.target;
  if(input.id==='catalogGroup'){catalogGroup=input.value;catalogPage=0;filterCatalog();}
  if(input.id==='catalogUniverse'){catalogUniverse=input.value;catalogPage=0;filterCatalog();}
  if(input.id==='catalogSort'){catalogSort=input.value;catalogPage=0;filterCatalog();}
  if(input.id==='importProfile'){
    const file=input.files?.[0];if(!file)return;
    try{
      if(file.size>262144)throw new Error('Копия профиля слишком большая');
      const copy=JSON.parse(await file.text());
      if(copy.app!=='SPIDER-LINK'||copy.version!==1||!copy.profile||typeof copy.profile!=='object'||Array.isArray(copy.profile))throw new Error('Нужен файл копии SPIDER-LINK');
      const id=copy.profile.heroId;
      if(typeof id!=='string'||!heroes.some(h=>h.id===id))throw new Error('Героя из копии пока нет в этом каталоге');
      if(copy.sona&&window.SpiderExtras?.restorePersona)window.SpiderExtras.restorePersona(copy.sona);state=sanitizeState(copy.profile);save();go('passport');toast('Профиль восстановлен вместе с избранным и миссиями');
    }catch(error){toast(error instanceof SyntaxError?'Не удалось прочитать копию профиля':error.message);}
  }
});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))$('#modal').close();});
setInterval(()=>$('#clock').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),1000);
render();
