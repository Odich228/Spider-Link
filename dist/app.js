const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const heroes=[{name:'Майлз Моралес',earth:'1610',trait:'Творчество, смелость и свой собственный путь.',power:'Биоэлектричество и невидимость',color:'#ff3b50'},{name:'Гвен Стейси',earth:'65',trait:'Независимость, интуиция и чувство ритма.',power:'Акробатика и паучье чутьё',color:'#ee8cdd'},{name:'Питер Паркер',earth:'616',trait:'Ответственность, доброта и шутки в трудный момент.',power:'Паутина и невероятная сила',color:'#ff5445'},{name:'Хоби Браун',earth:'138',trait:'Свобода, бунтарский дух и никаких навязанных правил.',power:'Изобретательность и звуковые атаки',color:'#c6ed67'},{name:'Мигель О’Хара',earth:'928',trait:'Стратегия, решительность и взгляд в будущее.',power:'Когти и усиленные чувства',color:'#7d9eff'},{name:'Павитр Прабхакар',earth:'50101',trait:'Лёгкость, оптимизм и забота о своих.',power:'Ловкость и управление паутиной',color:'#ffd174'}];
const heroAssets=[{"id":"miles","url":"https://cdn.marvel.com/content/2x/329291._sx1280_ql80_ttd_.jpg","source":"https://www.marvel.com/articles/comics/the-best-costumes-in-the-spider-verse-part-1","caption":"Marvel / комиксный костюм","file":"assets/miles.jpg"},{"id":"gwen","url":"https://storage.googleapis.com/images.pricecharting.com/4e3bccd18a1a90ee0b191f8ba22fa306428a75ca6334fb72562cea8fa0ae3297/1600.jpg","source":"https://www.pricecharting.com/game/comic-books-spider-gwen/spider-gwen-1-2015","caption":"Spider-Gwen 2015 1 comic cover","file":"assets/gwen.jpg"},{"id":"peter","url":"https://s3.amazonaws.com/comicgeeks/comics/covers/large-6270822.jpg","source":"https://s3.amazonaws.com/comicgeeks/comics/covers/large-6270822.jpg","caption":"Amazing Spider-Man Peter Parker comic cover","file":"assets/peter.jpg"},{"id":"hobie","url":"https://bigtimecollectibles.com/cdn/shop/products/75960620853100131.jpg?v=1703549637","caption":"SPIDER-PUNK: ARMS RACE 1 OLIVIER COIPEL VARIANT - 02/28/24","source":"https://bigtimecollectibles.com/products/75960620853100131","file":"assets/hobie.jpg"},{"id":"miguel","url":"https://cdn.marvel.com/content/1x/sm20992019001_cov.jpg","source":"https://www.marvel.com/articles/comics/marvel-goes-back-to-the-future-this-december-with-2099-one-shot-comics","caption":"Spider-Man 2099 (2019) #1","file":"assets/miguel.jpg"},{"id":"pavitr","url":"https://cdn.marvel.com/content/2x/edge_of_spider-verse_2022_3.jpg","source":"https://www.marvel.com/articles/comics/meet-pavitr-prabhakar-aka-spider-man-india","caption":"Edge of Spider-Verse (2022) #3","file":"assets/pavitr.jpg"},{"id":"noir","url":"https://comicbookquest.com/cdn/shop/products/spider-man-noir1__83548.1641850681.1280.1280.jpg?v=1698319409&width=1946","caption":"Spider-Man Noir comic cover","file":"assets/noir.jpg"},{"id":"ham","url":"https://cdn.marvel.com/u/prod/marvel/i/mg/c/30/5d123d6f9eab2/detail.jpg","caption":"Spider-Ham comic cover","source":"https://www.marvel.com/comics/issue/77275/peter_porker_the_spectacular_spider-ham_1985_16","file":"assets/ham.jpg"},{"id":"peni","url":"https://parigibooks.cdn.bibliopolis.com/pictures/35778.jpg?auto=webp&fit=bounds&height=1000&v=1672071797&width=768","caption":"Edge of Spider-Verse (2014) #5","source":"https://www.marvel.com/comics/guides/169/spider-verse-spider-people","file":"assets/peni.jpg"},{"id":"superior","url":"https://cdn.kanobu.ru/articles/pics/c9ed3bc2-e6ff-4539-822a-a70dd2bc789f.jpg","caption":"Superior Spider-Man — комиксная иллюстрация","source":"https://kanobu.ru/news/tajna-lichnosti-sovershennogo-cheloveka-pauka-raskryita-kto-eto-sdelal-416812/","file":"assets/superior.jpg"},{"id":"ben","url":"https://cdn.mos.cms.futurecdn.net/uZsWceQ8MoPEcbvRMe6XJL.jpg","source":"https://www.gamesradar.com/big-eyes-knobbly-rubber-and-embarrassing-hoodies-how-spider-mans-costume-has-evolved-over-55-years/2/","caption":"Scarlet Spider — классический костюм 1994 года","file":"assets/ben.jpg"},{"id":"kaine","url":"https://s.hdnux.com/photos/07/66/63/2059473/4/1200x0.jpg","caption":"Scarlet Spider 2012 1 Kaine cover","file":"assets/kaine.jpg"},{"id":"mayday","url":"https://i.pinimg.com/736x/5c/f0/c8/5cf0c82288fdda2794a2c722bb575881.jpg","caption":"Spider-Girl Mayday Parker comic cover","source":"https://www.pinterest.com/pin/1st-part-of-an-amazing-spider-girl-two-parter-where-she-goes-back-in-time-and-meets-her-dad-my-fav-issue-spider-g--485192559844779994/","file":"assets/mayday.jpg"},{"id":"uk","url":"https://cdn.marvel.com/content/2x/spider-uk.jpg","source":"https://www.marvel.com/articles/comics/spider-geddon-war-report-a-spotlight-on-the-fallen-spider-heroes","caption":"Spider-Geddon War Report: A Spotlight on the Fallen Spider-Heroes | Marvel","file":"assets/uk.jpg"},{"id":"lady","url":"https://www.looper.com/img/gallery/who-is-across-the-spider-verses-steampunk-spider-woman-and-what-can-she-do/lady-spider-is-an-inventor-and-a-vigilante-1685649160.jpg","caption":"Lady Spider Maybelle Reilly comic","source":"https://www.looper.com/1302841/across-the-spider-verse-steampunk-spider-woman/","file":"assets/lady.jpg"},{"id":"rex","url":"https://www.laughingplace.com/uploads/2022/08/comic-review-edge-of-spider-verse-1-is-a-wild-ride-featuring-some-crazy-spider-characters-2.jpeg","caption":"Spider Rex comic","source":"https://www.laughingplace.com/w/articles/2022/08/03/comic-review-edge-of-spider-verse-1-is-a-wild-ride-featuring-some-crazy-spider-characters/","file":"assets/rex.jpg"},{"id":"1602","url":"https://spiderfan.org/images/title/comics/spiderman_1602/002.jpg","source":"https://spiderfan.org/title/comics/spiderman_1602.html","caption":"Spider-Man 1602 comic","file":"assets/1602.jpg"},{"id":"manga","url":"https://cdn.shopify.com/s/files/1/0261/7085/1416/products/IMG_4328_b09d929c-c233-41a9-8d2b-77fd5e1f39b8_1024x1024.jpg?v=1667887077","source":"https://theunrealitystore.co.uk/products/marvel-mangaverse-spider-man-1-vfn-condition","caption":"Spider-Man Mangaverse comic","file":"assets/manga.jpg"},{"id":"silk","url":"https://www.bookxcess.com/cdn/shop/products/silk-the-life-and-times-of-cindy-moon-vol-0-9780785197041-16969627730069.jpg?v=1648788493","caption":"Silk Cindy Moon comic cover","file":"assets/silk.jpg"},{"id":"jessica","url":"https://s3.amazonaws.com/comicgeeks/comics/covers/large-7839529.jpg","source":"https://leagueofcomicgeeks.com/character/1636/jessica-drew","caption":"Spider-Woman Jessica Drew comic cover","file":"assets/jessica.jpg"},{"id":"anya","url":"https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1649772190i/52723575.jpg","caption":"Spider Girl Anya Corazon comic cover","file":"assets/anya.jpg"},{"id":"julia","url":"https://cdn.marvel.com/u/prod/marvel/i/mg/3/70/5d377291082db/background.jpg","source":"https://www.marvel.com/comics/issue/59023/spider-woman_1993_2","caption":"Spider Woman Julia Carpenter comic cover","file":"assets/julia.jpg"}];
const extraHeroes=[{"name": "Питер Паркер — Нуар", "earth": "90214", "trait": "Сдержанность, наблюдательность и поиск правды.", "power": "Паучьи способности и навыки детектива", "color": "#a5fbf4", "id": "noir", "alias": "Spider-Man Noir"}, {"name": "Питер Поркер", "earth": "8311", "trait": "Юмор и находчивость даже в самой странной ситуации.", "power": "Паучьи способности и мультяшная физика", "color": "#a5fbf4", "id": "ham", "alias": "Spider-Ham"}, {"name": "Пени Паркер / SP//dr", "earth": "14512", "trait": "Любопытство, инженерия и доверие напарнику.", "power": "Управление мехом SP//dr", "color": "#a5fbf4", "id": "peni", "alias": "Peni Parker"}, {"name": "Отто Октавиус", "earth": "616", "trait": "Амбиции, интеллект и технологичный подход.", "power": "Механические конечности и паучьи способности", "color": "#a5fbf4", "id": "superior", "alias": "Superior Spider-Man"}, {"name": "Бен Рейли", "earth": "616", "trait": "Поиск своего места и желание начать заново.", "power": "Паучьи способности и ударная паутина", "color": "#a5fbf4", "id": "ben", "alias": "Scarlet Spider"}, {"name": "Каин Паркер", "earth": "616", "trait": "Решительность и непростой путь к героизму.", "power": "Сила, органическая паутина и жала", "color": "#a5fbf4", "id": "kaine", "alias": "Scarlet Spider / Kaine"}, {"name": "Мэй «Мэйдэй» Паркер", "earth": "982", "trait": "Смелость, наследие и забота о близких.", "power": "Паучьи способности и управление прилипанием", "color": "#a5fbf4", "id": "mayday", "alias": "Spider-Girl"}, {"name": "Билли Брэддок", "earth": "833", "trait": "Командный дух и ответственность за мультивселенную.", "power": "Паучьи способности и путешествия между мирами", "color": "#a5fbf4", "id": "uk", "alias": "Spider-UK"}, {"name": "Мэйбелль Рейли", "earth": "803", "trait": "Изобретательность и любовь к свободе.", "power": "Механические паучьи лапы и веб-шутеры", "color": "#a5fbf4", "id": "lady", "alias": "Lady Spider"}, {"name": "Птер Птаркер", "earth": "66", "trait": "Первобытная энергия и невероятные приключения.", "power": "Сила тираннозавра и паутина", "color": "#a5fbf4", "id": "rex", "alias": "Spider-Rex"}, {"name": "Питер Паркуа", "earth": "311", "trait": "Любознательность и смелость в мире XVII века.", "power": "Паучья сила и ловкость", "color": "#a5fbf4", "id": "1602", "alias": "Spider-Man 1602"}, {"name": "Питер Паркер — Мангавселенная", "earth": "2301", "trait": "Дисциплина, традиции и мастерство.", "power": "Боевые искусства и паучьи способности", "color": "#a5fbf4", "id": "manga", "alias": "Mangaverse Spider-Man"}, {"name": "Синди Мун", "earth": "616", "trait": "Чуткость, стойкость и возвращение к обычной жизни.", "power": "Органическая паутина и острое паучье чутьё", "color": "#a5fbf4", "id": "silk", "alias": "Silk"}, {"name": "Джессика Дрю", "earth": "616", "trait": "Независимость, опыт и уверенность.", "power": "Биоэлектрические разряды и планирование", "color": "#a5fbf4", "id": "jessica", "alias": "Spider-Woman"}, {"name": "Аня Коразон", "earth": "616", "trait": "Настойчивость и готовность защищать других.", "power": "Паучьи способности; в ранних историях — мистическая броня", "color": "#a5fbf4", "id": "anya", "alias": "Araña / Spider-Girl"}, {"name": "Джулия Карпентер", "earth": "616", "trait": "Спокойствие, выдержка и сильная воля.", "power": "Псионическая паутина и паучьи способности", "color": "#a5fbf4", "id": "julia", "alias": "Spider-Woman / Arachne"}];
heroes.push(...extraHeroes);
heroes.forEach((h,i)=>{h.id=h.id||['miles','gwen','peter','hobie','miguel','pavitr'][i];const a=heroAssets.find(a=>a.id===h.id);Object.assign(h,{image:a.file,source:a.source||a.url,credit:a.caption,alias:h.alias||['Spider-Man / Miles Morales','Ghost-Spider / Spider-Gwen','Spider-Man / Peter Parker','Spider-Punk / Hobie Brown','Spider-Man 2099 / Miguel O’Hara','Spider-Man India / Pavitr Prabhakar'][i]});});
let catalogQuery='';

// The six answer columns represent creativity, intuition, responsibility,
// independence, strategy and optimism. Each hero has a seven-answer profile.
// Preserve hero order: existing passports store the numeric hero index.
const quizProfiles = {
  "1602": [
    2,
    1,
    3,
    0,
    1,
    0
  ],
  "miles": [
    7,
    0,
    0,
    0,
    0,
    0
  ],
  "gwen": [
    0,
    7,
    0,
    0,
    0,
    0
  ],
  "peter": [
    0,
    0,
    7,
    0,
    0,
    0
  ],
  "hobie": [
    0,
    0,
    0,
    7,
    0,
    0
  ],
  "miguel": [
    0,
    0,
    0,
    0,
    7,
    0
  ],
  "pavitr": [
    0,
    0,
    0,
    0,
    0,
    7
  ],
  "noir": [
    0,
    1,
    2,
    0,
    4,
    0
  ],
  "ham": [
    2,
    0,
    0,
    1,
    0,
    4
  ],
  "peni": [
    4,
    0,
    1,
    0,
    2,
    0
  ],
  "superior": [
    1,
    0,
    0,
    1,
    5,
    0
  ],
  "ben": [
    1,
    1,
    4,
    0,
    0,
    1
  ],
  "kaine": [
    0,
    0,
    3,
    3,
    1,
    0
  ],
  "mayday": [
    0,
    1,
    3,
    0,
    0,
    3
  ],
  "uk": [
    0,
    0,
    4,
    0,
    3,
    0
  ],
  "lady": [
    3,
    0,
    0,
    3,
    1,
    0
  ],
  "rex": [
    0,
    0,
    1,
    3,
    0,
    3
  ],
  "manga": [
    0,
    2,
    2,
    0,
    3,
    0
  ],
  "silk": [
    1,
    4,
    1,
    0,
    1,
    0
  ],
  "jessica": [
    0,
    2,
    2,
    1,
    2,
    0
  ],
  "anya": [
    1,
    0,
    3,
    2,
    0,
    1
  ],
  "julia": [
    0,
    3,
    2,
    0,
    2,
    0
  ]
};
function recommendHero(responses) {
  const counts = Array(6).fill(0);
  responses.forEach(answer => counts[answer]++);
  let bestIndex = 0, bestDistance = Infinity;
  heroes.forEach((hero, index) => {
    const distance = quizProfiles[hero.id].reduce((sum, count, category) =>
      sum + (count - counts[category]) ** 2, 0);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return bestIndex;
}
function matchesHero(hero, query = catalogQuery) {
  const normalize = value => value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
  const words = normalize(query).trim().split(/\s+/).filter(Boolean);
  const haystack = normalize(hero.name + ' ' + hero.alias + ' ' + hero.earth + ' Earth-' + hero.earth);
  return words.every(word => haystack.includes(word));
}
function filterCatalog() {
  const cards = document.querySelectorAll('.catalog-entry');
  let count = 0;
  cards.forEach(card => {
    card.hidden = !matchesHero(heroes[Number(card.dataset.index)]);
    if (!card.hidden) count++;
  });
  const counter = $('#catalogCount');
  if (counter) counter.textContent = 'Показано ' + count + ' из ' + heroes.length;
  const empty = $('#noHeroes');
  if (empty) empty.hidden = count !== 0;
}

const questions=[['Друг в беде, но план почти сорвался. Ты…',['Импровизирую. Придумаем по дороге.','Доверюсь чутью и прикрою друга.','Сначала вытащу его, потом разберусь.','Нарушу план. Друзья важнее правил.','Найду самый безопасный выход.','Подбодрю всех — вместе справимся.']],['Идеальный вечер после спасения города?',['Рисовать под любимый плейлист.','Репетиция с группой.','Пицца и разговор с близкими.','Подпольный концерт.','Тишина и работа над новым устройством.','Прогулка с друзьями и вкусный чай.']],['Твоя сильная сторона в команде?',['Свежие идеи.','Умение чувствовать момент.','На меня можно положиться.','Не боюсь спорить с системой.','Умею видеть картину целиком.','Могу объединить очень разных людей.']],['Если получишь новую способность…',['Придумаю ей неожиданное применение.','Потренируюсь без лишних свидетелей.','Подумаю, кому смогу помочь.','Использую её по своим правилам.','Изучу все риски и ограничения.','Покажу друзьям — они оценят.']],['Что сложнее всего?',['Перестать сравнивать себя с другими.','Открыто говорить о чувствах.','Находить время для себя.','Мириться с чужими ограничениями.','Отпускать контроль.','Признать, что иногда мне тоже грустно.']],['Ваш штаб остался без света. Что делать?',['Сделаем из этого приключение.','Соберёмся поближе и поговорим.','Проверю, всем ли нужна помощь.','Устроим акустический концерт.','Найду неисправность.','Достану настолки и позову всех.']],['Какой след ты хочешь оставить?',['Показать, что каждый может стать героем.','Помочь другим быть собой.','Сделать чью-то жизнь лучше.','Дать людям смелость менять правила.','Защитить будущее.','Подарить людям больше радости.']]];
const missions=[{title:'По ту сторону экрана',tag:'КИНОВЕЧЕР',desc:'Соберитесь на просмотр любимого фильма о пауках. После титров каждый выбирает лучший момент.',reward:'Билет в мультивселенную',icon:'▣'},{title:'Обложка нашего выпуска',tag:'ФОТОМИССИЯ',desc:'Сделайте общее фото в супергеройских позах. Придумайте название вашему первому выпуску.',reward:'Объектив хроникёра',icon:'◉'},{title:'За пределами маршрута',tag:'ИССЛЕДОВАНИЕ',desc:'Найдите новое место для встречи. Пусть каждый предложит одну точку, а маршрут выберет жребий.',reward:'Неоновая паутина',icon:'✳'},{title:'Новый злодей в городе',tag:'ТВОРЧЕСКАЯ МИССИЯ',desc:'Придумайте злодея из вашей общей шутки: его имя, слабость и план захвата мира.',reward:'Досье антагониста',icon:'◈'}];
let state={name:'',hero:0,earth:'1610',power:heroes[0].power,motto:'Любой может надеть маску.',team:'Мой Пауковерс',status:'На связи',active:[],done:[],notes:{},events:[]};try{state={...state,...JSON.parse(localStorage.getItem('spider-link-v1')||'{}')}}catch{}
let view='hq',step=0,answers=[],toastTimer;const mask=()=>'<div class="mask"><span class="eye left"></span><span class="eye right"></span></div>';
function heroArt(i=state.hero){const h=heroes[i];return `<img class="comic-art" src="${esc(h.image)}" alt="${esc(h.name)} — комиксный облик" loading="lazy">`;}
function save(){try{localStorage.setItem('spider-link-v1',JSON.stringify(state))}catch{toast('Не удалось сохранить: проверь свободное место и настройки браузера.')}updateTop()}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4500)}
function event(t){state.events.unshift({text:t,date:new Date().toLocaleDateString('ru-RU')});state.events=state.events.slice(0,12);save()}
function updateTop(){$('#topName').textContent=state.name||'Новый паук';$('#topEarth').textContent=state.earth}
function go(v){view=v;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));render();window.scrollTo({top:0,behavior:'smooth'})}
function missionCard(m,i){const done=state.done.includes(i),active=state.active.includes(i);return `<article class="mission ${done?'done':''}"><span class="tag">${m.icon} ${m.tag} / 0${i+1}</span><h3>${m.title}</h3><p>${m.desc}</p><div class="mission-bottom"><span>✧ ${m.reward}</span><button class="link" data-mission="${i}">${done?'Итоги ↗':active?'Завершить ↗':'Принять →'}</button></div></article>`}
function hq(){return `<div class="intro"><div><h2>Твой штаб. Твои правила.</h2><p>С возвращением в мультивселенную${state.name?', '+esc(state.name):''}.</p></div><span class="pill">◉ ЛИЧНЫЙ РЕЖИМ</span></div><section class="hero"><div class="hero-copy"><span class="eyebrow">ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ</span><h1>ОДНА МАСКА.<br>МИЛЛИОН<br><em>ВОЗМОЖНОСТЕЙ.</em></h1><p>Найди своего паука. Собери свою историю.<br>Каждая вселенная начинается с тебя.</p><div class="hero-actions"><button class="btn" data-view="quiz">Найти своего паука <span>↗</span></button><button class="btn secondary" data-view="passport">Все пауки · ${heroes.length} ↗</button></div></div><div class="hero-art"><div class="portal"></div>${mask()}<span class="art-label">WHAT'S UP, DANGER?</span></div><span class="serial">DIMENSIONAL GATEWAY / EARTH-${esc(state.earth)}</span></section><div class="stats"><div class="stat"><b>${state.name?'01':'00'}</b><span>ГЕРОЕВ<br>В ЛИЧНОМ ШТАБЕ</span></div><div class="stat"><b>0${state.active.length}</b><span>АКТИВНЫХ<br>МИССИЙ</span></div><div class="stat"><b>0${state.done.length}</b><span>ТРОФЕЕВ<br>В КОЛЛЕКЦИИ</span></div></div><div class="grid"><section><div class="section-title"><h2>Твоя вселенная</h2><button class="link" data-action="team">${esc(state.team)} ↗</button></div><div class="map"><button class="node" data-view="passport"><span style="color:var(--red);font-size:28px">◢◣</span><strong>${esc(state.name||'ТВОЙ СИГНАЛ')}</strong><small>EARTH-${esc(state.earth)} / ${esc(state.status)}</small></button><span class="map-note">${state.name?'01 СИГНАЛ ОБНАРУЖЕН':'ОЖИДАНИЕ ИДЕНТИФИКАЦИИ'}</span></div><p class="notice">Сейчас это личный штаб: профиль и миссии сохраняются в этом браузере. Совместные комнаты и приглашения появятся после подключения сервера.</p></section><section><div class="section-title"><h2>Пора на вылазку</h2><button class="link" data-view="missions">Все миссии ↗</button></div>${missionCard(missions[state.active[0]??0],state.active[0]??0)}</section></div><section style="margin-top:28px"><div class="section-title"><h2>Хроники штаба</h2><span class="eyebrow">LIVE FEED</span></div>${state.events.length?state.events.slice(0,4).map(e=>`<div class="empty" style="margin-top:8px;padding:14px"><span class="red">${esc(e.date)} / </span>${esc(e.text)}</div>`).join(''):'<div class="empty">● Канал открыт. Создай паспорт — и здесь появится первая запись твоей истории.</div>'}</section>`}
function quiz(){if(step>=questions.length){const idx=recommendHero(answers);return `<section class="page"><span class="eyebrow">СИГНАЛ РАСПОЗНАН</span><h1 style="margin-top:22px">Твой паук —<br><span class="red">${heroes[idx].name}</span></h1><p>${heroes[idx].trait}</p><p>Ближайший образ по твоим ответам среди ${heroes.length} героев. Это игровой тест — персонажа всегда можно изменить.</p><div class="hero-art" style="max-width:380px"><div class="portal"></div>${heroArt(idx)}</div><button class="btn" data-result="${idx}">Принять сигнал →</button> <button class="btn secondary" data-action="restart">Пройти ещё раз</button></section>`}return `<section class="page"><span class="eyebrow">ТЕСТ / ИДЕНТИФИКАЦИЯ ПАУКА</span><h1 style="margin-top:22px">Кто под маской?</h1><p>Семь вопросов, ${heroes.length} возможных героев. Выбирай то, что ближе тебе.</p><div class="quizbox"><span class="question-num">ВОПРОС 0${step+1} / 07</span><div class="progress"><div style="width:${step/7*100}%"></div></div><h2>${questions[step][0]}</h2><div class="answers">${questions[step][1].map((a,i)=>`<button data-answer="${i}"><span class="red">0${i+1} / </span>${a}</button>`).join('')}</div>${step?'<button class="link" style="margin-top:20px" data-action="back">← Предыдущий вопрос</button>':''}</div></section>`}
function passport(){return `<section class="page"><span class="eyebrow">ПАУЧИЙ ПАСПОРТ / ЛИЧНОЕ ДЕЛО</span><h1 style="margin-top:22px">Под маской — ты.</h1><p>Выбери героя и добавь то, что делает твою версию особенной.</p><label class="catalog-search">Найти паука<input id="catalogSearch" type="search" value="${esc(catalogQuery)}" placeholder="Имя, псевдоним или вселенная…"></label><p class="notice">${heroes.length} героя с комиксными изображениями. Каждый доступен в тесте и для выбора вручную. Каталог можно расширять — это пока не все пауки Marvel.</p><p id="catalogCount" class="catalog-count" role="status" aria-live="polite"></p><div class="cards" id="heroCards">${heroes.map((h,i)=>`<article class="catalog-entry" data-index="${i}" data-search="${esc((h.name+' '+h.alias+' '+h.earth).toLowerCase())}"><button class="character ${i===state.hero?'selected':''}" data-hero="${i}"><span class="eyebrow" style="color:${h.color}">EARTH-${h.earth} ${i===state.hero?' / ВЫБРАН':''}</span>${heroArt(i)}<h3>${h.name}</h3><small>${esc(h.alias)}</small><p>${h.trait}</p></button><a class="art-source" href="${esc(h.source)}" target="_blank" rel="noopener noreferrer">Источник комиксного изображения ↗</a></article>`).join('')}</div><p id="noHeroes" class="notice" hidden>Ничего не найдено. Попробуй другое имя или номер вселенной.</p><form id="passportForm" class="form"><label>Имя героя<input name="name" maxlength="32" required value="${esc(state.name)}" placeholder="Как тебя звать в мультивселенной?"></label><label>Номер вселенной<input name="earth" maxlength="12" pattern="[A-Za-z0-9-]+" required value="${esc(state.earth)}"></label><label>Суперспособность<input name="power" maxlength="80" value="${esc(state.power)}" required></label><label>Статус<select name="status">${['На связи','Спасаю город','Отдыхаю после миссии'].map(s=>`<option ${s===state.status?'selected':''}>${s}</option>`).join('')}</select></label><label class="wide">Фраза героя<input name="motto" maxlength="90" value="${esc(state.motto)}"></label><button class="btn" type="submit">Сохранить паспорт ↗</button></form><h2>Твои трофеи</h2><div class="trophies">${state.done.length?state.done.map(i=>`<span class="trophy">${missions[i].icon} ${missions[i].reward}</span>`).join(''):'<span class="muted">Первый трофей ждёт тебя в миссиях.</span>'}</div></section>`}
function missionPage(){return `<section class="page"><span class="eyebrow">ДОСКА ЗАДАНИЙ / ВЫХОД В ГОРОД</span><h1 style="margin-top:22px">Маленькие миссии.<br>Большие истории.</h1><p>Выполняйте задания с друзьями, а здесь сохраняй свои итоги и собирай трофеи.</p><div class="mission-grid">${missions.map(missionCard).join('')}</div><p class="notice">Отметки и заметки видны только в твоём браузере. Общего прогресса между устройствами пока нет.</p></section>`}
function coverPage(){return `<section class="page"><span class="eyebrow">ТВОЙ ПЕРВЫЙ ВЫПУСК</span><h1 style="margin-top:22px">Ты на обложке.</h1><div class="cover-layout"><div class="cover"><small>SPIDER-LINK PRESENTS / ISSUE 001</small><h2>YOUR FRIENDLY<br>MULTIVERSE</h2>${heroArt()}<strong>${esc(state.name||'НОВЫЙ ПАУК')}</strong><small>EARTH-${esc(state.earth)} · ${esc(heroes[state.hero].name)}</small><small style="text-align:center">${esc(state.motto)}</small></div><div><h2>Каждому герою —<br>своя история.</h2><p>Паспорт становится обложкой комикса. Сохрани её как картинку и покажи друзьям.</p><button class="btn" data-action="download">Скачать обложку PNG ↓</button><br><br><button class="btn secondary" data-view="passport">Изменить паспорт ↗</button><p class="notice">Для личного использования. Фанатский проект по мотивам Spider-Verse.</p></div></div></section>`}
function render(){$('#content').innerHTML=`<div class="reveal">${({hq,quiz,passport,missions:missionPage,cover:coverPage}[view]||hq)()}</div>`;updateTop();if(view==='passport')filterCatalog()}
function modal(html){$('#modalContent').innerHTML=html;$('#modal').showModal()}
async function download(){const c=document.createElement('canvas');c.width=900;c.height=1200;const g=c.getContext('2d');g.fillStyle='#eee3ce';g.fillRect(0,0,900,1200);const grad=g.createLinearGradient(0,0,900,1200);grad.addColorStop(0,'#5e2b52');grad.addColorStop(1,'#101522');g.fillStyle=grad;g.fillRect(18,18,864,1164);g.strokeStyle='#ff3b5030';for(let i=0;i<40;i++){g.beginPath();g.moveTo(450,730);g.lineTo(450+1500*Math.cos(i),730+1500*Math.sin(i));g.stroke()}g.textAlign='center';g.fillStyle='#eee3ce';g.font='18px sans-serif';g.fillText('SPIDER-LINK PRESENTS / ISSUE 001',450,75);g.fillStyle='#ff3b50';g.font='bold 76px sans-serif';g.fillText('YOUR FRIENDLY',450,190);g.fillText('MULTIVERSE',450,275);g.save();g.translate(450,610);g.rotate(-.12);g.fillStyle='#171321';g.strokeStyle='#ff3b50';g.lineWidth=6;g.beginPath();g.ellipse(0,0,173,230,0,0,7);g.fill();g.stroke();g.lineWidth=2;for(let y=-160;y<190;y+=45){g.beginPath();g.ellipse(0,y,160-Math.abs(y)*.18,45,0,0,7);g.stroke()}for(let x=-130;x<=130;x+=65){g.beginPath();g.moveTo(x,-190);g.lineTo(-x,190);g.stroke()}g.fillStyle='#f8f2df';g.strokeStyle='#060812';g.lineWidth=12;[-1,1].forEach(d=>{g.beginPath();g.moveTo(d*140,-65);g.lineTo(d*20,5);g.quadraticCurveTo(d*100,90,d*140,-65);g.fill();g.stroke()});g.restore();try{const im=new Image();im.src=heroes[state.hero].image;await im.decode();g.fillStyle='#171321';g.fillRect(145,315,610,560);const r=Math.min(610/im.width,560/im.height);g.drawImage(im,450-im.width*r/2,595-im.height*r/2,im.width*r,im.height*r);}catch{toast('Не удалось загрузить изображение. Попробуй открыть обложку ещё раз.');return;}g.fillStyle='#eee3ce';g.font='bold 48px sans-serif';g.fillText(state.name||'НОВЫЙ ПАУК',450,940,800);g.font='23px sans-serif';g.fillText(`EARTH-${state.earth} / ${heroes[state.hero].name}`,450,1000,800);g.font='21px sans-serif';g.fillText(state.motto,450,1070,780);g.font='14px monospace';g.fillText('ONE TEAM. INFINITE UNIVERSES. / FAN PROJECT',450,1140);const a=document.createElement('a');a.download='spider-link-cover.png';a.href=c.toDataURL('image/png');a.click();toast('Обложка готова к сохранению')}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.view){go(b.dataset.view);return}if(b.hasAttribute('data-answer')){answers[step]=Number(b.dataset.answer);step++;render()}if(b.hasAttribute('data-result')){state.hero=Number(b.dataset.result);state.earth=heroes[state.hero].earth;state.power=heroes[state.hero].power;save();go('passport');toast('Сигнал принят. Осталось придумать имя!')}if(b.hasAttribute('data-hero')){const f=$('#passportForm');if(f){const d=new FormData(f);for(const k of ['name','motto','status'])state[k]=String(d.get(k)||'');}state.hero=Number(b.dataset.hero);state.earth=heroes[state.hero].earth;state.power=heroes[state.hero].power;save();render()}if(b.dataset.action==='restart'){step=0;answers=[];render()}if(b.dataset.action==='back'){step--;answers.pop();render()}if(b.dataset.action==='download')download();if(b.dataset.action==='team')modal(`<span class="eyebrow">ЛИЧНЫЙ ШТАБ</span><h2 style="margin-top:20px">Название вашей вселенной</h2><form id="teamForm" class="form" style="display:block"><label>Название<input name="team" required maxlength="40" value="${esc(state.team)}"></label><button class="btn" style="margin-top:20px">Сохранить →</button></form><p class="notice">Это название сохраняется на этом устройстве. Приглашения и общий штаб пока не подключены.</p>`);if(b.hasAttribute('data-mission')){const i=Number(b.dataset.mission);if(!state.active.includes(i)&&!state.done.includes(i)){state.active.push(i);event('Принята миссия «'+missions[i].title+'»');render();toast('Миссия принята. Пора собрать друзей!')}else modal(`<span class="eyebrow">${state.done.includes(i)?'АРХИВ МИССИИ':'ОТЧЁТ О МИССИИ'}</span><h2 style="margin-top:20px">${missions[i].title}</h2><form id="missionForm" data-id="${i}"><label>Что произошло? Сохрани лучший момент.<textarea name="note" required maxlength="600">${esc(state.notes[i]||'')}</textarea></label><button class="btn" style="margin-top:20px">${state.done.includes(i)?'Обновить заметку':'Завершить и получить трофей'} ↗</button></form>`)}if(b.classList.contains('close'))$('#modal').close()});
document.addEventListener('submit',e=>{e.preventDefault();const f=e.target,d=new FormData(f);if(f.id==='passportForm'){for(const key of ['name','earth','power','motto','status'])state[key]=String(d.get(key)||'').trim();if(!state.name){toast('Добавь имя героя');return}event('Сигнал подтверждён: '+state.name+' / EARTH-'+state.earth);go('cover');toast('Паспорт сохранён. Добро пожаловать в Пауковерс!')}if(f.id==='teamForm'){state.team=String(d.get('team')).trim();save();$('#modal').close();render()}if(f.id==='missionForm'){const i=Number(f.dataset.id);state.notes[i]=String(d.get('note')).trim();if(!state.notes[i])return;if(!state.done.includes(i)){state.done.push(i);state.active=state.active.filter(n=>n!==i);event('Миссия завершена: '+missions[i].title)}save();$('#modal').close();render();toast('Итоги сохранены. Трофей в паспорте!')}});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))$('#modal').close()});setInterval(()=>$('#clock').textContent=new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}),1000);render();

document.addEventListener('input', e => {
  if (e.target.id !== 'catalogSearch') return;
  catalogQuery = e.target.value;
  filterCatalog();
});
