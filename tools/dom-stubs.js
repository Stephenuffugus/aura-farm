

function makeCtx(){
  const grad = { addColorStop(){} };
  return new Proxy({}, { get(t,k){
    if (k==='createLinearGradient'||k==='createRadialGradient') return ()=>grad;
    if (k==='canvas') return {};
    return typeof k==='string' ? function(){ } : undefined;
  }, set(){ return true; } });
}
function makeEl(id){
  const el = {
    id, style:{ setProperty(){} }, dataset:{}, children:[], innerHTML:'', textContent:'',
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    appendChild(c){ el.children.push(c); }, remove(){}, querySelector(){ return null; },
    querySelectorAll(){ return []; }, addEventListener(){}, click(){},
    getContext(){ return makeCtx(); },
    get firstChild(){ return { remove(){ el.children.shift(); } }; }, offsetWidth:0,
  };
  return el;
}
const els = {};
global.document = {
  getElementById(id){ return els[id] || (els[id] = makeEl(id)); },
  createElement(tag){ return makeEl('dyn-'+tag); },
  addEventListener(){}, hidden:false,
};
const store = {};
global.localStorage = { getItem:k=>store[k]||null, setItem(k,v){ store[k]=v; }, removeItem(k){ delete store[k]; } };
global.window = { innerWidth:390, innerHeight:844, devicePixelRatio:2, addEventListener(){}, AudioContext:undefined, webkitAudioContext:undefined };
global.requestAnimationFrame = ()=>0;
global.setTimeout = (fn)=>0; // don't run deferred UI
global.clearTimeout = ()=>{};

