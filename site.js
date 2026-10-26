const menuBtn=document.getElementById('menuBtn'),nav=document.getElementById('navlinks');
if(menuBtn&&nav){
  const setMenu=open=>{nav.classList.toggle('open',open);menuBtn.setAttribute('aria-expanded',String(open));menuBtn.setAttribute('aria-label',open?'Close navigation':'Open navigation')};
  menuBtn.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
}
const header=document.querySelector('.site-header');
const syncHeader=()=>header?.classList.toggle('scrolled',scrollY>24);addEventListener('scroll',syncHeader,{passive:true});syncHeader();
const atlas={
 jezero:{title:'Jezero Crater',desc:'An ancient lake-basin landscape and the study region for MarsWalk.',type:'Impact crater / delta',next:'Detailed Jezero exploration'},
 gale:{title:'Gale Crater',desc:'A layered mountain record explored by Curiosity, useful for comparing sedimentary geology and long-duration surface operations.',type:'Impact crater / mountain',next:'Curiosity field context'},
 olympus:{title:'Olympus Mons',desc:'The largest volcano on Mars, a reminder that planetary scale changes every navigation problem.',type:'Shield volcano',next:'Planetary scale context'},
 valles:{title:'Valles Marineris',desc:'A canyon network thousands of kilometres long with dramatic relief and complex geologic history.',type:'Canyon system',next:'Extreme terrain context'}
};
document.querySelectorAll('.atlas-marker').forEach(b=>b.addEventListener('click',()=>{const s=b.dataset.site,d=atlas[s];document.querySelectorAll('.atlas-marker').forEach(x=>x.classList.toggle('active',x===b));document.getElementById('atlasTitle').textContent=d.title;document.getElementById('atlasDesc').textContent=d.desc;document.getElementById('atlasType').textContent=d.type;document.getElementById('atlasNext').textContent=d.next;document.getElementById('atlasLink').href=`site.html?site=${s}`}));
async function loadNasa(el){const q=el.dataset.query;if(!q)return;try{const r=await fetch('https://images-api.nasa.gov/search?q='+encodeURIComponent(q)+'&media_type=image&page_size=12');if(!r.ok)return;const j=await r.json();for(const item of (j.collection?.items||[])){const img=item.links?.find(x=>x.render==='image')?.href||item.links?.[0]?.href;if(img){el.style.backgroundImage=`linear-gradient(180deg,rgba(3,8,13,.05),rgba(3,8,13,.18)),url("${img}")`;return}}}catch(e){/* local fallback remains */}}
document.querySelectorAll('.nasa-photo').forEach(loadNasa);
const io='IntersectionObserver'in window?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12}):null;
document.querySelectorAll('.reveal').forEach(el=>io?io.observe(el):el.classList.add('in'));
