const HST = {
  keys: { reaction:'hst_reaction_best', number:'hst_number_best', aim:'hst_aim_best', sequence:'hst_sequence_best', visual:'hst_visual_best', typing:'hst_typing_best', math:'hst_math_best' },
  lowerIsBetter: new Set(['reaction','aim']),
  get(key,fallback=null){const value=localStorage.getItem(this.keys[key]);if(value===null)return fallback;const n=Number(value);return Number.isFinite(n)?n:fallback},
  setBest(key,value,lower=this.lowerIsBetter.has(key)){value=Number(value);if(!Number.isFinite(value))return false;const old=this.get(key);if(old===null||(lower?value<old:value>old)){localStorage.setItem(this.keys[key],String(value));window.dispatchEvent(new CustomEvent('hst:scores-changed',{detail:{key,value}}));return true}return false},
  completedCount(){return Object.keys(this.keys).filter(k=>this.get(k)!==null).length},
  reset(){Object.values(this.keys).forEach(k=>localStorage.removeItem(k));window.dispatchEvent(new Event('hst:scores-changed'));location.reload()}
};
window.HST=HST;
document.addEventListener('DOMContentLoaded',()=>{const menu=document.querySelector('.menu-button'),links=document.querySelector('.nav-links');if(menu&&links)menu.addEventListener('click',()=>{const open=links.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});const page=document.body.dataset.page;document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===page));document.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Reset all saved scores on this device and in your account?'))window.dispatchEvent(new Event('hst:reset-requested'))}))});
