(() => {
  'use strict';
  const storageKey = 'spider-link-sona-v1';
  const defaults = {version:1,active:false,name:'Новый паук',earth:'199999',power:'Ловкость и паучье чутьё',motto:'Моя вселенная. Мои правила.',colors:{primary:'#ff3b50',secondary:'#17192d',accent:'#a5fbf4'},eyes:'wide',emblem:'spider',pattern:'web'};
  const text = (value, fallback, length) => typeof value === 'string' ? value.replace(/\s+/g,' ').trim().slice(0,length) : fallback;
  const choose = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const hex = (value, fallback) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
  function sanitizePersona(value) {
    const item = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {version:1,active:item.active===true,name:text(item.name,defaults.name,32)||defaults.name,
      earth:text(item.earth,defaults.earth,12).replace(/[^A-Za-z0-9 -]/g,'')||defaults.earth,
      power:text(item.power,defaults.power,80)||defaults.power,motto:text(item.motto,defaults.motto,90),
      colors:{primary:hex(item.colors?.primary,defaults.colors.primary),secondary:hex(item.colors?.secondary,defaults.colors.secondary),accent:hex(item.colors?.accent,defaults.colors.accent)},
      eyes:choose(item.eyes,['wide','narrow'],'wide'),emblem:choose(item.emblem,['spider','star','bolt','web'],'spider'),pattern:choose(item.pattern,['web','stripes','dots'],'web')};
  }
  let current;
  try { current=sanitizePersona(JSON.parse(localStorage.getItem(storageKey)||'null')); } catch { current=sanitizePersona(null); }
  let draft=sanitizePersona(current);
  let comparison=[Number.isInteger(state.hero)?state.hero:0,heroes.length>1?1:0];
  const comparisonQueries=['',''];
  function persona() { return sanitizePersona(current); }
  function announce() { document.dispatchEvent(new CustomEvent('spider-sona-changed',{detail:persona()})); }
  function restorePersona(value) {
    current=sanitizePersona(value);draft=sanitizePersona(current);
    try {localStorage.setItem(storageKey,JSON.stringify(current));} catch {toast('Не удалось сохранить SpiderSona в этом браузере.');}
    announce();return persona();
  }
  function deactivatePersona() {
    const pending=sanitizePersona(draft), saved=restorePersona({...current,active:false});
    draft=sanitizePersona({...pending,active:false});return saved;
  }
  function svgFor(value) {
    const p=sanitizePersona(value),{primary,secondary,accent}=p.colors;
    const mask='M250 65 C143 65 99 140 115 252 C125 343 177 408 250 431 C323 408 375 343 385 252 C401 140 357 65 250 65Z';
    const web='<path d="M250 75V425M116 236H384M151 117L348 364M350 117L151 364M116 303L374 168M126 167L374 303"/><ellipse cx="250" cy="244" rx="55" ry="74"/><ellipse cx="250" cy="244" rx="102" ry="137"/><ellipse cx="250" cy="244" rx="151" ry="191"/>';
    const stripes=Array.from({length:9},(_,i)=>`<path d="M${-100+i*70} 60L${200+i*70} 450"/>`).join('');
    const dots=Array.from({length:9},(_,y)=>Array.from({length:8},(_,x)=>`<circle cx="${90+x*47+(y%2)*22}" cy="${70+y*44}" r="4" fill="${accent}" stroke="none"/>`).join('')).join('');
    const eyes=p.eyes==='wide'?'<path d="M137 194L232 245L215 294L158 275Z"/><path d="M363 194L268 245L285 294L342 275Z"/>':'<path d="M134 221L233 250L213 271L155 255Z"/><path d="M366 221L267 250L287 271L345 255Z"/>';
    const emblems={spider:'<ellipse cx="250" cy="507" rx="11" ry="19"/><circle cx="250" cy="483" r="8"/><path d="M242 492L218 478L212 460M258 492L282 478L288 460M240 501L212 494L197 482M260 501L288 494L303 482M240 512L213 522L205 540M260 512L287 522L295 540M242 522L228 540L228 554M258 522L272 540L272 554" fill="none" stroke-width="6"/>',star:'<path d="M250 469L262 494L290 498L270 518L275 546L250 533L225 546L230 518L210 498L238 494Z"/>',bolt:'<path d="M253 466L222 511H245L237 551L280 496H254L269 466Z"/>',web:'<g fill="none"><circle cx="250" cy="508" r="33"/><circle cx="250" cy="508" r="17"/><path d="M250 475V541M217 508H283M227 485L273 531M227 531L273 485"/></g>'};
    const pattern=p.pattern==='web'?web:p.pattern==='stripes'?stripes:dots;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 620"><defs><clipPath id="face"><path d="${mask}"/></clipPath><pattern id="back" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="${accent}" opacity=".16"/></pattern></defs><rect width="500" height="620" fill="${secondary}"/><rect width="500" height="620" fill="url(#back)"/><circle cx="250" cy="260" r="207" fill="none" stroke="${accent}" opacity=".28" stroke-width="2"/><circle cx="250" cy="260" r="222" fill="none" stroke="${primary}" opacity=".4" stroke-dasharray="5 11"/><path d="M35 620L80 504L178 453L200 394H300L322 453L420 504L465 620Z" fill="${primary}"/><path d="M35 620L80 504L178 453L205 493L181 620ZM465 620L420 504L322 453L295 493L319 620Z" fill="${secondary}"/><path d="${mask}" fill="${primary}" stroke="${accent}" stroke-width="5"/><g clip-path="url(#face)" fill="none" stroke="${accent}" stroke-width="${p.pattern==='stripes'?16:2}" opacity=".32">${pattern}</g><g fill="${accent}" stroke="${secondary}" stroke-width="12" stroke-linejoin="round">${eyes}</g><g fill="${accent}" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${emblems[p.emblem]}</g><path d="M195 394L250 431L305 394" fill="none" stroke="${secondary}" stroke-width="8"/></svg>`;
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function heroForProfile(member) {
    const personal=arguments.length===0;
    const outer=personal?state:(member&&typeof member==='object'?member:{});
    const profile=outer.profile&&typeof outer.profile==='object'?outer.profile:outer;
    const custom=personal?persona():sanitizePersona(outer.persona||profile.persona);
    if(custom.active) return {id:'spidersona',name:custom.name,displayName:profile.name||outer.displayName||custom.name,earth:custom.earth,power:custom.power,motto:custom.motto,image:svgFor(custom),color:custom.colors.primary,active:true,alias:'SpiderSona / авторский герой',persona:custom};
    let index=heroes.findIndex(h=>h.id===(profile.heroId||outer.heroId));
    if(index<0) index=Number.isInteger(profile.hero)&&heroes[profile.hero]?profile.hero:0;
    const h=heroes[index];
    return {id:h.id,name:h.name,displayName:profile.name||outer.displayName||h.name,earth:typeof profile.earth==='string'&&profile.earth?profile.earth:h.earth,power:typeof profile.power==='string'&&profile.power?profile.power:h.power,motto:typeof profile.motto==='string'?profile.motto:'',image:h.image,color:h.color||'#ff3b50',active:false,alias:h.alias,source:h.source};
  }
  const option=(value,label,selected)=>`<option value="${esc(value)}" ${value===selected?'selected':''}>${esc(label)}</option>`;
  function renderSona() {
    const p=draft;
    return `<section class="page"><span class="eyebrow">SPIDERSONA / АВТОРСКИЙ СИГНАЛ</span><h1 style="margin-top:22px">Твоя маска.<br><span class="red">Твоя история.</span></h1><p>Создай собственного паука: выбери цвета, рисунок костюма, линзы и эмблему. Сохранённый образ появится на личной обложке и командном постере.</p><div class="sona-layout"><div class="sona-preview"><div class="sona-preview-frame"><img id="sonaPreviewImage" src="${svgFor(p)}" alt="Предпросмотр твоего авторского паука"></div><span class="eyebrow" id="sonaPreviewEarth">EARTH-${esc(p.earth)}</span><h2 id="sonaPreviewName">${esc(p.name)}</h2><p id="sonaPreviewPower">${esc(p.power)}</p><p id="sonaActiveStatus" class="sona-status">${current.active?'● АВТОРСКИЙ ГЕРОЙ АКТИВЕН':'○ СЕЙЧАС ВЫБРАН ГЕРОЙ ИЗ КАТАЛОГА'}</p></div><form id="sonaForm" class="sona-form"><label>Имя героя<input name="name" required maxlength="32" value="${esc(p.name)}"></label><label>Номер твоей вселенной<input name="earth" required maxlength="12" pattern="[A-Za-z0-9 -]+" value="${esc(p.earth)}"></label><label class="sona-wide">Способности<input name="power" required maxlength="80" value="${esc(p.power)}"></label><label class="sona-wide">Фраза героя<input name="motto" maxlength="90" value="${esc(p.motto)}"></label><fieldset class="sona-wide sona-colors"><legend>Цвета костюма</legend>${[['primary','Основной'],['secondary','Тёмный'],['accent','Акцент']].map(([id,title])=>`<label>${title}<input type="color" name="${id}" value="${p.colors[id]}"></label>`).join('')}</fieldset><label>Линзы<select name="eyes">${option('wide','Широкие',p.eyes)}${option('narrow','Узкие',p.eyes)}</select></label><label>Эмблема<select name="emblem">${[['spider','Паук'],['star','Звезда'],['bolt','Молния'],['web','Паутина']].map(([id,title])=>option(id,title,p.emblem)).join('')}</select></label><label class="sona-wide">Рисунок костюма<select name="pattern">${[['web','Паутина'],['stripes','Диагональные полосы'],['dots','Комиксные точки']].map(([id,title])=>option(id,title,p.pattern)).join('')}</select></label><div class="sona-wide sona-actions"><button class="btn" type="submit">Сохранить и надеть маску ↗</button><button class="btn secondary" type="button" data-extras-action="canonical">Вернуться к герою каталога</button><button class="link" type="button" data-view="cover">Моя обложка ↗</button></div><p class="notice sona-wide">Предпросмотр меняется сразу. Кнопка «Сохранить и надеть маску» активирует образ. Это твой авторский дизайн, а не новый персонаж комиксного каталога.</p></form></div></section>`;
  }
  function readSonaForm(form) {
    const data=new FormData(form);
    return sanitizePersona({active:current.active,name:data.get('name'),earth:data.get('earth'),power:data.get('power'),motto:data.get('motto'),eyes:data.get('eyes'),emblem:data.get('emblem'),pattern:data.get('pattern'),colors:{primary:data.get('primary'),secondary:data.get('secondary'),accent:data.get('accent')}});
  }
  function updateSonaPreview() {
    const image=$('#sonaPreviewImage');if(!image)return;
    image.src=svgFor(draft);$('#sonaPreviewName').textContent=draft.name;$('#sonaPreviewEarth').textContent='EARTH-'+draft.earth;$('#sonaPreviewPower').textContent=draft.power;
    $('#sonaActiveStatus').textContent=current.active?'● АВТОРСКИЙ ГЕРОЙ АКТИВЕН':'○ СЕЙЧАС ВЫБРАН ГЕРОЙ ИЗ КАТАЛОГА';
  }
  function comparisonPanel(side) {
    const h=heroes[comparison[side]]||heroes[0];
    const appearance=h.firstAppearance||h.first_appearance||h.debut||'Не указано в источнике';
    return `<img class="compare-art" src="${esc(h.image)}" alt="${esc(h.name)} — комиксный облик"><span class="hero-category">EARTH-${esc(h.earth||'?')}</span><h2>${esc(h.name)}</h2><p class="compare-alias">${esc(h.alias)}</p><dl class="compare-facts"><dt>Способности</dt><dd>${esc(h.power)}</dd><dt>Характер</dt><dd>${esc(h.trait)}</dd><dt>Первое появление</dt><dd>${esc(typeof appearance==='string'?appearance:'Не указано в источнике')}</dd></dl><a class="art-source" href="${esc(h.source)}" target="_blank" rel="noopener noreferrer">Проверить источник ↗</a>`;
  }
  function comparisonOptions(side) {
    const query=comparisonQueries[side].trim().toLocaleLowerCase('ru').replaceAll('ё','е');
    const selected=comparison[side], matches=heroes.map((h,i)=>i).filter(i=>[heroes[i].name,heroes[i].alias,heroes[i].earth].join(' ').toLocaleLowerCase('ru').replaceAll('ё','е').includes(query));
    if(!matches.includes(selected))matches.unshift(selected);
    return matches.map(i=>option(String(i),heroes[i].name+' / Earth-'+(heroes[i].earth||'?'),String(selected))).join('');
  }
  function renderCompare() {
    return `<section class="page"><span class="eyebrow">ДВА СИГНАЛА / СРАВНЕНИЕ</span><h1 style="margin-top:22px">Две маски.<br><span class="red">Разные истории.</span></h1><p>Сравнивай комиксные образы, способности и вселенные. Здесь нет выдуманных рейтингов силы — только сведения из каталога и ссылки на источники.</p><div class="compare-grid">${[0,1].map(side=>`<section class="compare-column"><span class="eyebrow">СИГНАЛ 0${side+1}</span><label>Найти героя<input type="search" id="compareSearch${side}" value="${esc(comparisonQueries[side])}" placeholder="Имя, псевдоним или Earth…"></label><label>Герой<select id="compareSelect${side}">${comparisonOptions(side)}</select></label><div id="comparePanel${side}" class="compare-panel">${comparisonPanel(side)}</div></section>`).join('')}</div></section>`;
  }
  function compareWith(index) {if(!Number.isInteger(index)||!heroes[index])return;comparison=[Number.isInteger(state.hero)?state.hero:0,index];comparisonQueries[1]='';go('compare');}
  function onView(value) {if(value==='sona')updateSonaPreview();}
  function wrapLines(ctx,value,maxWidth,maxLines) {
    const words=String(value||'').trim().split(/\s+/),lines=[];let line='';
    for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width<=maxWidth||!line)line=next;else{lines.push(line);line=word;}if(lines.length===maxLines)break;}
    if(lines.length<maxLines&&line)lines.push(line);
    return lines.slice(0,maxLines).map((item,i)=>{let fitted=item;if(ctx.measureText(fitted).width>maxWidth){while(fitted&&ctx.measureText(fitted+'…').width>maxWidth)fitted=Array.from(fitted).slice(0,-1).join('');fitted+='…';}if(i===maxLines-1&&words.join(' ').length>lines.slice(0,maxLines).join(' ').length&&!fitted.endsWith('…')){while(fitted&&ctx.measureText(fitted+'…').width>maxWidth)fitted=Array.from(fitted).slice(0,-1).join('');fitted+='…';}return fitted;});
  }
  function loadArt(src) {return new Promise((resolve,reject)=>{const image=new Image();let settled=false;const timer=setTimeout(()=>finish(new Error('Тайм-аут изображения')),15000);function finish(error){if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else resolve(image);}image.onload=()=>finish();image.onerror=()=>finish(new Error('Ошибка изображения'));image.src=src;if(image.complete&&image.naturalWidth)finish();});}
  async function downloadTeamPoster(members,teamName) {
    try {
      if(!Array.isArray(members)||members.length<1||members.length>32)throw new Error('Для постера нужны от 1 до 32 участников.');
      if(members.some(member=>!member||typeof member!=='object'||Array.isArray(member)))throw new Error('В списке команды есть некорректный участник.');
      const profiles=members.map(member=>heroForProfile(member));
      const images=await Promise.all(profiles.map(async(profile,index)=>{try{return await loadArt(profile.image);}catch{throw new Error('Не удалось загрузить образ: '+(members[index].displayName||members[index].name||profile.displayName||profile.name)+'. Постер не сохранён.');}}));
      const width=1200,columns=Math.min(4,members.length),gap=22,margin=56,cardWidth=(width-margin*2-gap*(columns-1))/columns,artHeight=Math.min(380,Math.round(cardWidth*1.25)),cardHeight=artHeight+146,rows=Math.ceil(members.length/columns),height=244+rows*(cardHeight+gap)+80;
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Браузер не поддерживает создание постера.');
      ctx.fillStyle='#101016';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#ff3b5022';ctx.lineWidth=1;for(let x=-height;x<width;x+=44){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+height,height);ctx.stroke();}
      ctx.fillStyle='#a5fbf4';ctx.font='18px monospace';ctx.fillText('SPIDER-LINK / КОМАНДНАЯ ОБЛОЖКА',margin,58);ctx.fillStyle='#f5f3ee';ctx.font='bold 54px Arial';wrapLines(ctx,text(teamName,'НАШ ПАУКОВЕРС',48)||'НАШ ПАУКОВЕРС',width-margin*2,2).forEach((line,i)=>ctx.fillText(line,margin,126+i*58));
      ctx.fillStyle='#ff3b50';ctx.fillRect(margin,209,width-margin*2,5);
      members.forEach((member,i)=>{const profile=profiles[i],image=images[i],x=margin+(i%columns)*(cardWidth+gap),y=244+Math.floor(i/columns)*(cardHeight+gap);ctx.fillStyle='#1b1b25';ctx.fillRect(x,y,cardWidth,cardHeight);ctx.fillStyle=profile.color;ctx.fillRect(x,y,cardWidth,5);ctx.fillStyle='#12121a';ctx.fillRect(x+12,y+17,cardWidth-24,artHeight);const ratio=Math.min((cardWidth-32)/image.naturalWidth,(artHeight-16)/image.naturalHeight);ctx.drawImage(image,x+cardWidth/2-image.naturalWidth*ratio/2,y+17+artHeight/2-image.naturalHeight*ratio/2,image.naturalWidth*ratio,image.naturalHeight*ratio);ctx.fillStyle='#f5f3ee';ctx.font='bold 24px Arial';const label=text(member.displayName||member.name||member.profile?.name||profile.displayName||profile.name,profile.name,48);wrapLines(ctx,label,cardWidth-28,2).forEach((line,j)=>ctx.fillText(line,x+14,y+artHeight+49+j*28));ctx.fillStyle='#a5fbf4';ctx.font='14px monospace';wrapLines(ctx,'EARTH-'+(profile.earth||'?'),cardWidth-28,1).forEach(line=>ctx.fillText(line,x+14,y+artHeight+117));});
      ctx.fillStyle='#9292a2';ctx.font='16px monospace';ctx.fillText('ОДНА КОМАНДА. БЕСКОНЕЧНО ВСЕЛЕННЫХ. / FAN PROJECT',margin,height-34);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Не удалось собрать PNG-постер.');const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='spider-link-team-poster.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Командный постер готов');return true;
    }catch(error){toast(error.message||'Не удалось создать командный постер.');return false;}
  }
  document.addEventListener('input',event=>{
    const target=event.target,form=target.closest?.('#sonaForm');if(form){draft=readSonaForm(form);updateSonaPreview();}
    const match=target.id?.match(/^compareSearch([01])$/);if(match){const side=Number(match[1]);comparisonQueries[side]=target.value;$('#compareSelect'+side).innerHTML=comparisonOptions(side);}
  });
  document.addEventListener('change',event=>{
    const target=event.target,form=target.closest?.('#sonaForm');if(form){draft=readSonaForm(form);updateSonaPreview();}
    const match=target.id?.match(/^compareSelect([01])$/);if(match){const side=Number(match[1]),index=Number(target.value);if(Number.isInteger(index)&&heroes[index]){comparison[side]=index;$('#comparePanel'+side).innerHTML=comparisonPanel(side);}}
  });
  document.addEventListener('submit',event=>{if(event.target.id!=='sonaForm')return;event.preventDefault();draft=readSonaForm(event.target);restorePersona({...draft,active:true});updateSonaPreview();toast('SpiderSona сохранён и активирован. Открой свою обложку!');});
  document.addEventListener('click',event=>{const button=event.target.closest?.('[data-extras-action]');if(button?.dataset.extrasAction==='canonical'){deactivatePersona();updateSonaPreview();toast('Выбран герой из каталога. Авторский дизайн сохранён.');}});
  window.addEventListener('storage',event=>{if(event.key!==storageKey)return;try{current=sanitizePersona(JSON.parse(event.newValue||'null'));draft=sanitizePersona(current);updateSonaPreview();}catch{}});
  window.SpiderExtras={renderSona,renderCompare,onView,compareWith,downloadTeamPoster,heroForProfile,persona,sanitizePersona,restorePersona,deactivatePersona,svgFor};
})();
