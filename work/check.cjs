const fs=require('fs'),vm=require('vm'),assert=require('assert');
const handlers={},els={};let stored={};
function el(s){return els[s]??={innerHTML:'',textContent:'',style:{},dataset:{},classList:{toggle(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false}}}
const ctx={console,setTimeout:()=>1,clearTimeout(){},setInterval(){},localStorage:{getItem:k=>stored[k],setItem:(k,v)=>stored[k]=v},document:{querySelector:el,querySelectorAll:()=>[],addEventListener:(n,f)=>handlers[n]=f},window:{scrollTo(){}},FormData:class{constructor(f){this.f=f}get(k){return this.f.values[k]??null}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),ctx);
function run(s){return vm.runInContext(s,ctx)}
function click(data){handlers.click({target:{closest:()=>({dataset:data,hasAttribute:k=>Object.hasOwn(data,k.replace(/^data-/,'').replace(/-([a-z])/g,(_,a)=>a.toUpperCase())),classList:{contains:()=>false}})}})}
assert(el('#content').innerHTML.includes('МИЛЛИОН'));
run("go('quiz')");for(let i=0;i<7;i++)click({answer:'1'});assert(el('#content').innerHTML.includes('Гвен Стейси'));
click({result:'1'});assert.equal(run('state.earth'),'65');
handlers.submit({preventDefault(){},target:{id:'passportForm',values:{name:'Тестовый герой',earth:'65',power:'Паутина',motto:'Вперёд!',status:'На связи'}}});
assert(el('#content').innerHTML.includes('Тестовый герой'));assert(JSON.parse(stored['spider-link-v1']).name==='Тестовый герой');
click({mission:'0'});assert.equal(run('state.active.length'),1);click({mission:'0'});assert(el('#modalContent').innerHTML.includes('ОТЧЁТ'));
handlers.submit({preventDefault(){},target:{id:'missionForm',dataset:{id:'0'},values:{note:'Посмотрели фильм'}}});assert.equal(run('state.done.length'),1);assert.equal(run('state.active.length'),0);run("go('passport')");assert(el('#content').innerHTML.includes('Билет в мультивселенную'));
run("go('hq')");assert(el('#content').innerHTML.includes('Миссия завершена'));
assert.equal(run("esc('<img>')"),'&lt;img&gt;');console.log('PASS: quiz, character, passport, persistence, missions, trophy, chronicles, escaping');
