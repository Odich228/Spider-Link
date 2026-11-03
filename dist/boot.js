updateTop();
window.SpiderExtras?.onView?.(view);
document.addEventListener('spider-sona-changed',()=>{updateTop();if(view==='cover'||view==='passport')render();});
