import json,urllib.request,base64,re
from pathlib import Path
a=json.loads(Path('work/assets-final.json').read_text())
for x in a:
 f=Path('dist/assets')/(x['id']+'.jpg')
 if x['id'] in ['hobie','ben','superior']:
  try:f.write_bytes(urllib.request.urlopen(x['url'],timeout=25).read())
  except Exception as e:print(x['id'],e)
 x['file']='assets/'+x['id']+'.jpg'
extra=[
('Питер Паркер — Нуар','90214','Сдержанность, наблюдательность и поиск правды.','Паучьи способности и навыки детектива','noir','Spider-Man Noir'),
('Питер Поркер','8311','Юмор и находчивость даже в самой странной ситуации.','Паучьи способности и мультяшная физика','ham','Spider-Ham'),
('Пени Паркер / SP//dr','14512','Любопытство, инженерия и доверие напарнику.','Управление мехом SP//dr','peni','Peni Parker'),
('Отто Октавиус','616','Амбиции, интеллект и технологичный подход.','Механические конечности и паучьи способности','superior','Superior Spider-Man'),
('Бен Рейли','616','Поиск своего места и желание начать заново.','Паучьи способности и ударная паутина','ben','Scarlet Spider'),
('Каин Паркер','616','Решительность и непростой путь к героизму.','Сила, органическая паутина и жала','kaine','Scarlet Spider / Kaine'),
('Мэй «Мэйдэй» Паркер','982','Смелость, наследие и забота о близких.','Паучьи способности и управление прилипанием','mayday','Spider-Girl'),
('Билли Брэддок','833','Командный дух и ответственность за мультивселенную.','Паучьи способности и путешествия между мирами','uk','Spider-UK'),
('Мэйбелль Рейли','803','Изобретательность и любовь к свободе.','Механические паучьи лапы и веб-шутеры','lady','Lady Spider'),
('Птер Птаркер','66','Первобытная энергия и невероятные приключения.','Сила тираннозавра и паутина','rex','Spider-Rex'),
('Питер Паркуа','311','Любознательность и смелость в мире XVII века.','Паучья сила и ловкость','1602','Spider-Man 1602'),
('Питер Паркер — Мангавселенная','2301','Дисциплина, традиции и мастерство.','Боевые искусства и паучьи способности','manga','Mangaverse Spider-Man'),
('Синди Мун','616','Чуткость, стойкость и возвращение к обычной жизни.','Органическая паутина и острое паучье чутьё','silk','Silk'),
('Джессика Дрю','616','Независимость, опыт и уверенность.','Биоэлектрические разряды и планирование','jessica','Spider-Woman'),
('Аня Коразон','616','Настойчивость и готовность защищать других.','Паучьи способности; в ранних историях — мистическая броня','anya','Araña / Spider-Girl'),
('Джулия Карпентер','616','Спокойствие, выдержка и сильная воля.','Псионическая паутина и паучьи способности','julia','Spider-Woman / Arachne')]
p=Path('dist/app.js');s=p.read_text(encoding='utf-8');start=s.index('const heroes=');end=s.index('\nconst questions=',start)
# Retain the first six indices so existing saved passports keep their identity.
old=s[start:end];raw=old[len('const heroes='):-1]
# Existing literals are JavaScript; append via source, then attach metadata separately.
more=[dict(name=n,earth=e,trait=t,power=p,color='#a5fbf4',id=i,alias=alias) for n,e,t,p,i,alias in extra]
insert='\nconst heroAssets='+json.dumps(a,ensure_ascii=False)+';\n'
insert+='const extraHeroes='+json.dumps(more,ensure_ascii=False)+';\nheroes.push(...extraHeroes);\n'
insert+="heroes.forEach((h,i)=>{h.id=h.id||['miles','gwen','peter','hobie','miguel','pavitr'][i];const a=heroAssets.find(a=>a.id===h.id);Object.assign(h,{image:a.file,source:a.source||a.url,credit:a.caption,alias:h.alias||['Spider-Man / Miles Morales','Ghost-Spider / Spider-Gwen','Spider-Man / Peter Parker','Spider-Punk / Hobie Brown','Spider-Man 2099 / Miguel O’Hara','Spider-Man India / Pavitr Prabhakar'][i]});});\nlet catalogQuery='';\n"
s=s[:end]+insert+s[end:]
s=s.replace("const mask=()=>'<div", "const mask=()=>'<div")
# Keep a geometric mask for the portal; use actual comic art wherever a hero is represented.
anchor='function save()'
s=s.replace(anchor,"function heroArt(i=state.hero){const h=heroes[i];return `<img class=\"comic-art\" src=\"${esc(h.image)}\" alt=\"${esc(h.name)} — комиксный облик\" loading=\"lazy\">`;}\n"+anchor)
s=s.replace("const scores=heroes.map((_,i)=>answers.filter(a=>a===i).length)","const scores=heroes.slice(0,6).map((_,i)=>answers.filter(a=>a===i).length)")
s=s.replace('max-width:380px\"><div class="portal"></div>${mask()}', 'max-width:380px\"><div class="portal"></div>${heroArt(idx)}')
s=s.replace('<div class="cards">${heroes.map((h,i)=>`<button class="character', '<label class="catalog-search">Найти паука<input id="catalogSearch" type="search" value="${esc(catalogQuery)}" placeholder="Имя, псевдоним или вселенная…"></label><p class="notice">22 комиксные версии. Это расширяемый каталог, а не полный список всех пауков Marvel. Тест подбирает одного из первых шести героев; вручную доступен весь каталог.</p><div class="cards" id="heroCards">${heroes.map((h,i)=>`<article class="catalog-entry" data-search="${esc((h.name+\' \'+h.alias+\' \'+h.earth).toLowerCase())}"><button class="character')
s=s.replace('${mask()}<h3>${h.name}</h3><p>${h.trait}</p></button>', '${heroArt(i)}<h3>${h.name}</h3><small>${esc(h.alias)}</small><p>${h.trait}</p></button><a class="art-source" href="${esc(h.source)}" target="_blank" rel="noopener noreferrer">Источник комиксного изображения ↗</a></article>')
s=s.replace('YOUR FRIENDLY<br>MULTIVERSE</h2>${mask()}', 'YOUR FRIENDLY<br>MULTIVERSE</h2>${heroArt()}')
# Selection should preserve draft passport fields.
s=s.replace("if(b.hasAttribute('data-hero')){state.hero=", "if(b.hasAttribute('data-hero')){const f=$('#passportForm');if(f){const d=new FormData(f);for(const k of ['name','motto','status'])state[k]=String(d.get(k)||'');}state.hero=")
# The download must use the selected illustration, not the generic mask.
s=s.replace('function download(){','async function download(){')
s=s.replace("g.restore();g.fillStyle='#eee3ce';g.font='bold 48px sans-serif';", "g.restore();try{const im=new Image();im.src=heroes[state.hero].image;await im.decode();g.fillStyle='#171321';g.fillRect(145,315,610,560);const r=Math.min(610/im.width,560/im.height);g.drawImage(im,450-im.width*r/2,595-im.height*r/2,im.width*r,im.height*r);}catch{toast('Не удалось загрузить изображение. Попробуй открыть обложку ещё раз.');return;}g.fillStyle='#eee3ce';g.font='bold 48px sans-serif';")
s+='\ndocument.addEventListener("input",e=>{if(e.target.id!=="catalogSearch")return;catalogQuery=e.target.value;const q=catalogQuery.trim().toLowerCase();let count=0;document.querySelectorAll(".catalog-entry").forEach(c=>{c.hidden=!c.dataset.search.includes(q);if(!c.hidden)count++});let n=$("#noHeroes");if(!n){n=document.createElement("p");n.id="noHeroes";$("#heroCards").after(n)}n.textContent=count?"":"Ничего не найдено. Попробуй другое имя или номер вселенной.";});\n'
p.write_text(s,encoding='utf-8')
with Path('dist/style.css').open('a',encoding='utf-8') as f:f.write('''\n.catalog-entry{min-width:0;border:1px solid var(--line);background:var(--panel)}.catalog-entry[hidden]{display:none}.catalog-entry .character{width:100%;height:calc(100% - 35px);border:0;display:block}.catalog-entry .character.selected{box-shadow:inset 0 0 0 2px var(--red)}.comic-art{display:block;width:100%;height:235px;object-fit:contain;background:#101016;margin:16px auto}.character small{color:var(--cyan);font-size:10px}.art-source{display:block;font-size:9px;color:var(--muted);padding:10px 16px}.catalog-search{max-width:560px;margin:24px 0}.cover .comic-art{height:52%;width:90%;position:relative;z-index:1;margin:5px auto 15px}.cover h2{font-size:30px;margin:12px 0}.cover strong{font-size:20px}.cover small{font-size:10px;margin-top:8px}.hero-art>.comic-art{height:270px;width:210px;z-index:1}.catalog-entry .character p{margin-bottom:0}@media(max-width:760px){.cards{grid-template-columns:1fr}.comic-art{height:310px}.cover .comic-art{height:48%}}\n''')
Path('work/assets-final.json').write_text(json.dumps(a,ensure_ascii=False,indent=2),encoding='utf-8')
print('Expanded to',6+len(extra),'heroes')
