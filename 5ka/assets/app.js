/* =====================================================================
   АСУЗ прототип — SPA-роутер и рендер представлений
   ===================================================================== */
const { FMT, STORES, DEFAULT_STORE, PORTFOLIO, TASK_TYPES, TASK_STATUSES,
        TASKS, SCRIPT_BLOCKS, PROCESS_TYPES, PROBLEMS } = window.DB;

const state = {
  store: DEFAULT_STORE,
  analyticsTab: 'store',     // store | goods
  dashView: 'classic',       // classic | alt
  activity: 'done',          // done | active
  fType: new Set(),
  fStatus: new Set(),
  task: null,                // open task id
  taskKind: 'task',          // task | checklist (create form)
  checks: [''],
};

/* ---------- tiny svg helpers ---------- */
function gauge(pct, color, size = 120){
  const r = size/2 - 12, c = 2*Math.PI*r, off = c*(1 - pct/100), cx = size/2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#eef1f5" stroke-width="11"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="11"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
      transform="rotate(-90 ${cx} ${cx})"/>
  </svg>`;
}
function sparkline(data, color, w = 150, h = 42){
  const max = Math.max(...data), min = Math.min(...data), span = (max-min)||1;
  const step = w/(data.length-1);
  const pts = data.map((v,i)=>`${(i*step).toFixed(1)},${(h-4 - (v-min)/span*(h-10)).toFixed(1)}`);
  const d = 'M'+pts.join(' L');
  const area = `M0,${h} L`+pts.join(' L')+` L${w},${h} Z`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="${area}" fill="${color}" opacity="0.10"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
const delta = (n) => `<span class="d ${n>=0?'up':'down'}">${n>=0?'▲':'▼'} ${FMT.pct(n).replace('+','')}</span>`;
const esc = (s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function plural(n, one, few, many){
  const m10 = n%10, m100 = n%100;
  if(m10===1 && m100!==11) return one;
  if(m10>=2 && m10<=4 && (m100<10 || m100>=20)) return few;
  return many;
}

/* ---------- shell ---------- */
const NAV = [
  { id:'home',      label:'Главная',  icon:'grid' },
  { id:'tasks',     label:'Задачи',   icon:'clipboard' },
  { id:'techcard',  label:'Теххарта', icon:'card' },
  { id:'analytics', label:'Аналитика',icon:'chart' },
  { id:'scripts',   label:'АСУЗ',     icon:'cpu' },
  { id:'opmodel',   label:'Опер-модель', icon:'layers' },
  { id:'faq',       label:'FAQ',      icon:'help' },
];
function icon(name){
  const p = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M8 11h8M8 15h6"/>',
    card:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    cpu:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
    layers:'<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/>',
    help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7M12 17h.01"/>',
  }[name];
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

function currentRoute(){ return (location.hash.replace('#/','').split('/')[0]) || 'analytics'; }

function renderShell(){
  const route = currentRoute();
  const s = STORES[state.store];
  document.getElementById('nav').innerHTML = NAV.map(n=>`
    <a href="#/${n.id}" class="${route===n.id?'active':''}">
      <span class="ic">${icon(n.icon)}</span><span class="lbl">${n.label}</span>
    </a>`).join('');
  const titles = { home:'Главная', tasks:'Задачи', analytics:'Аналитика по магазину '+s.id+' «Пятёрочка»',
    scripts:'АСУЗ · структура скриптов', opmodel:'Операционная модель', techcard:'Теххарта', faq:'FAQ' };
  document.getElementById('topTitle').textContent = titles[route] || '';
  const initials = s.director.split(' ').map(x=>x[0]).slice(0,2).join('');
  document.getElementById('topUser').innerHTML = `
    <div class="meta"><b>${esc(s.director)}</b><span>${esc(s.role)}</span></div>
    <div class="avatar">${esc(initials)}</div>`;
}

/* ---------- ANALYTICS ---------- */
function viewAnalytics(){
  const s = STORES[state.store];
  const storePicker = `<div class="store-sel">🏪
    <select onchange="setStore(this.value)">
      ${Object.values(STORES).map(o=>`<option value="${o.id}" ${o.id===state.store?'selected':''}>${esc(o.name)}</option>`).join('')}
    </select></div>`;
  const head = `
    <div class="crumbs"><a href="#/home">Главная</a> / <a href="#/analytics">Аналитика</a> / Показатели магазина</div>
    <div class="page-h">
      <h1>Аналитика по магазину ${s.id} «Пятёрочка»</h1>
      ${s.isNew?'<span class="badge-new">новый</span>':''}
      <div style="margin-left:auto;display:flex;gap:12px;align-items:center">
        ${storePicker}
        <div class="viewswitch">
          <button class="${state.dashView==='classic'?'active':''}" onclick="setDash('classic')">Карточки</button>
          <button class="${state.dashView==='alt'?'active':''}" onclick="setDash('alt')">Дашборд</button>
        </div>
      </div>
    </div>`;
  if(state.dashView==='alt') return head + altDashboard();
  const tabs = `<div class="tabs">
      <button class="${state.analyticsTab==='store'?'active':''}" onclick="setATab('store')">Показатели магазина</button>
      <button class="${state.analyticsTab==='goods'?'active':''}" onclick="setATab('goods')">Работа с товаром</button>
    </div>`;
  if(state.analyticsTab==='goods') return head + tabs + goodsTab();
  return head + tabs + classicDashboard(s);
}

function kpiRow(name, k){
  const unit = k.unit ? ' '+k.unit : (name==='РТО'||name==='Средний чек'?' ₽':'');
  return `<tr>
    <td><div class="kpi-name"><span class="dot">i</span>${name}</div></td>
    <td><span class="kpi-big">${FMT.num(k.value)}${unit}</span></td>
    <td><div class="kpi-sub">${FMT.num(k.weekAgo)}${unit}</div><div class="kpi-cmp">${delta(k.weekDelta)}</div></td>
    <td><div class="kpi-sub">${FMT.num(k.yearAgo)}${unit}</div><div class="kpi-cmp">${delta(k.yearDelta)}</div></td>
  </tr>`;
}

function classicDashboard(s){
  const kpiCard = `<div class="card fade">
    <div class="card__h"><h3>Основные бизнес показатели</h3><span class="i">i</span></div>
    <table class="kpi-table">
      <thead><tr><th></th><th>${s.date}</th><th>Неделю назад</th><th>Год назад</th></tr></thead>
      <tbody>
        ${kpiRow('РТО', s.kpi.rto)}
        ${kpiRow('Трафик', s.kpi.traffic)}
        ${kpiRow('Средний чек', s.kpi.avgCheck)}
      </tbody>
    </table>
    <div class="card__foot">01.09.2022 09:00</div>
  </div>`;

  const p = s.plan;
  const planCard = `<div class="card fade">
    <div class="card__h"><h3>Выполнение плана РТО</h3><span class="i">i</span></div>
    <div class="plan-pct">${FMT.pctRaw(p.pct)}<small>плана на ${p.month}</small></div>
    <div class="plan-bar"><span style="width:${Math.min(p.pct,100)}%"></span></div>
    <div class="plan-rows">
      <div class="plan-row"><b>${FMT.money(p.actual)}</b><span>— в денежном выражении</span></div>
      <div class="plan-row"><b>${FMT.money(p.monthPlan)}</b><span>— план на месяц</span></div>
      <div class="plan-row"><b>${FMT.money(p.forecast)}</b><span>— прогноз на конец месяца</span></div>
      <div class="plan-row accent"><b>${FMT.pctRaw(p.forecastPct)}</b><span>— прогноз выполнения плана</span></div>
    </div>
    <div class="card__foot">01.09.2022 09:01</div>
  </div>`;

  const csiCard = `<div class="card fade">
    <div class="card__h"><h3>CSI мотивация</h3><span class="i">i</span></div>
    <div class="gauge-wrap">
      <div style="position:relative;display:grid;place-items:center">
        ${gauge(s.csi.value, s.csi.value>=70?'var(--pos)':'var(--warn)')}
        <div style="position:absolute;font-size:24px">${s.csi.value>=70?'🙂':'😐'}</div>
      </div>
      <div class="gauge-val">${s.csi.value}%</div>
    </div>
  </div>`;

  const npsCard = `<div class="card fade">
    <div class="card__h"><h3>NPS</h3><span class="i">i</span></div>
    <div style="color:var(--muted);font-size:12px;margin-bottom:6px">Текущий период</div>
    <div class="gauge-wrap">
      ${gauge(s.nps.value, s.nps.value>=40?'var(--pos)':'var(--warn)')}
      <div class="gauge-val" style="margin-top:-78px">${s.nps.value}%</div>
      <div style="height:40px"></div>
    </div>
  </div>`;

  const L = s.losses;
  const lossCard = `<div class="card fade" style="border:1px solid ${L.status==='bad'?'#f6cfcb':'var(--line)'}">
    <div class="card__h"><h3>Потери</h3><span class="i">i</span></div>
    <div class="loss-top">
      <span class="loss-pct ${L.status}">${FMT.pctRaw(L.pct)}<small>за месяц</small></span>
      <span class="loss-norm">${FMT.pctRaw(L.norm)}<small>норматив</small></span>
    </div>
    <div class="loss-money">${FMT.money(L.money)} — в денежном выражении</div>
    <div class="loss-breakdown">
      <div class="loss-line"><span class="lk"></span><b>${FMT.pctRaw(L.writeoff.pct)}</b> — списания · ${FMT.money(L.writeoff.money)}</div>
      <div class="loss-line"><span class="lk"></span><b>${FMT.pctRaw(L.inventory.pct)}</b> — инвентаризации · ${FMT.money(L.inventory.money)}</div>
    </div>
    <div class="card__foot">31.08.2022 10:00</div>
  </div>`;

  const M = s.lossesMip;
  const mipCard = `<div class="card fade">
    <div class="card__h"><h3>Потери за МИП</h3><span class="i">i</span></div>
    <div class="loss-top">
      <span class="loss-pct ${M.pct<=M.norm?'good':'bad'}">${FMT.pctRaw(M.pct)}<small>за МИП</small></span>
      <span class="loss-norm">${FMT.pctRaw(M.norm)}<small>норматив</small></span>
    </div>
    <div class="loss-money">${FMT.money(M.money)} — в денежном выражении</div>
    <div class="loss-breakdown">
      <div class="loss-line"><span class="lk"></span><b>${FMT.pctRaw(M.writeoff.pct)}</b> — списания · ${FMT.money(M.writeoff.money)}</div>
      <div class="loss-line"><span class="lk"></span><b>${FMT.pctRaw(M.inventory.pct)}</b> — инвентаризации · ${FMT.money(M.inventory.money)}</div>
    </div>
    <div class="card__foot">31.08.2022 17:40</div>
  </div>`;

  return `
    <div class="grid grid-2" style="margin-bottom:18px">${kpiCard}${planCard}</div>
    <div class="grid grid-4">${csiCard}${npsCard}${lossCard}${mipCard}</div>`;
}

function goodsTab(){
  return `<div class="card fade empty" style="padding:48px">
    <div style="font-size:30px;margin-bottom:8px">🧺</div>
    <h3 style="margin:0 0 6px">Работа с товаром</h3>
    <p style="color:var(--muted);max-width:460px;margin:0 auto">Раздел показывает доступность матрицы, товарный запас, корректность остатков и свежесть. В прототипе эти отклонения уже видны на вкладке <a href="#/scripts" style="color:var(--brand-dark);font-weight:700">АСУЗ</a> и в <a href="#/tasks" style="color:var(--brand-dark);font-weight:700">задачах</a>.</p>
  </div>`;
}

/* ---------- ALTERNATIVE DASHBOARD (Дашборд) ---------- */
function altDashboard(){
  const note = `<div class="note">⚠️ <div><b>Альтернативный дашборд.</b> Реконструкция по описанию файла «Дашборд» — исходный PDF недоступен в облачной среде. Это другая визуальная подача тех же данных: единая KPI-лента, рейтинг магазинов кластера, тепловая карта отклонений и лента событий.</div></div>`;

  const totRto = PORTFOLIO.reduce((a,b)=>a+b.rto,0);
  const avgPlan = (PORTFOLIO.reduce((a,b)=>a+b.planPct,0)/PORTFOLIO.length);
  const avgLoss = (PORTFOLIO.reduce((a,b)=>a+b.losses,0)/PORTFOLIO.length);
  const avgNps  = Math.round(PORTFOLIO.reduce((a,b)=>a+b.nps,0)/PORTFOLIO.length);
  const openDev = PORTFOLIO.reduce((a,b)=>a+b.openDev,0);

  const strip = `<div class="kstrip fade">
    <div class="kpill"><div class="lab">РТО кластера, день</div><div class="val">${FMT.num(totRto)} ₽</div><div class="dl up">▲ 11,4% к прошлой неделе</div></div>
    <div class="kpill"><div class="lab">Средн. выполнение плана</div><div class="val">${FMT.pctRaw(avgPlan)}</div><div class="dl up">▲ цель 100%</div></div>
    <div class="kpill"><div class="lab">Средние потери</div><div class="val">${FMT.pctRaw(avgLoss)}</div><div class="dl down">▼ норматив 4,84%</div></div>
    <div class="kpill"><div class="lab">NPS кластера</div><div class="val">${avgNps}%</div><div class="dl down">▼ цель 45%</div></div>
    <div class="kpill"><div class="lab">Открытых отклонений</div><div class="val">${openDev}</div><div class="dl down">по 6 магазинам</div></div>
  </div>`;

  const planColor = (v)=> v>=105?'g':v>=98?'y':'r';
  const lossColor = (v)=> v<=3?'g':v<=5?'y':'r';
  const trendIcon = (t)=> t==='up'?'<span class="trend-up">▲</span>':t==='down'?'<span class="trend-down">▼</span>':'<span class="trend-flat">▬</span>';
  const rank = `<div class="card fade">
    <div class="card__h"><h3>Рейтинг магазинов кластера</h3><span class="i">i</span></div>
    <table class="rank-table">
      <thead><tr><th>Магазин</th><th>Тренд</th><th style="text-align:right">РТО/день</th><th style="text-align:center">План</th><th style="text-align:center">Потери</th><th style="text-align:center">NPS</th><th style="text-align:right">Отклонений</th></tr></thead>
      <tbody>
        ${[...PORTFOLIO].sort((a,b)=>b.planPct-a.planPct).map(p=>`
          <tr ${p.id===state.store?'style="background:#eaf6ec"':''}>
            <td><b>${esc(p.name)}</b></td>
            <td>${trendIcon(p.trend)}</td>
            <td class="num">${FMT.num(p.rto)} ₽</td>
            <td style="text-align:center"><span class="pill-pct ${planColor(p.planPct)}">${FMT.pctRaw(p.planPct)}</span></td>
            <td style="text-align:center"><span class="pill-pct ${lossColor(p.losses)}">${FMT.pctRaw(p.losses)}</span></td>
            <td style="text-align:center">${p.nps}%</td>
            <td class="num">${p.openDev}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;

  // heatmap: deviations per process per store (synthetic intensity)
  const procs = PROCESS_TYPES;
  const seed = (i,j)=> ((i*7+j*13+5)%10);
  const heatColor = (v)=> v<=2?'#9ccc9e':v<=4?'#f4c542':v<=6?'#f0902e':'#e5392f';
  const heat = `<div class="card fade">
    <div class="card__h"><h3>Тепловая карта отклонений: магазин × процесс</h3><span class="i">i</span></div>
    <div class="heat">
      <div></div>
      ${procs.map(p=>`<div class="hh" title="${esc(p.title)}">${p.icon}</div>`).join('')}
      ${PORTFOLIO.map((st,i)=>`
        <div class="rl">${esc(st.name)}</div>
        ${procs.map((p,j)=>{const v=seed(i,j);return `<div class="cell" style="background:${heatColor(v)}" title="${esc(p.title)}: ${v} откл.">${v}</div>`;}).join('')}
      `).join('')}
    </div>
    <div class="card__foot">Цвет — острота отклонения по процессу. Источник: скрипты АСУЗ.</div>
  </div>`;

  const trendCard = `<div class="card fade">
    <div class="card__h"><h3>Динамика РТО, 8 недель</h3><span class="i">i</span></div>
    ${sparkline(STORES['22711'].sparkRto, 'var(--brand)', 320, 90)}
    <div class="card__foot">Магазин ${state.store}</div>
  </div>`;

  const feed = `<div class="card fade">
    <div class="card__h"><h3>Лента критичных отклонений</h3><span class="i">i</span></div>
    <div class="devfeed">
      ${TASKS.filter(t=>t.status!=='done').slice(0,6).map(t=>`
        <div class="devrow">
          <span class="dt" style="background:${t.priority==='high'?'var(--neg)':t.priority==='med'?'var(--warn)':'var(--muted-2)'}"></span>
          <div class="tx">${esc(t.title)}<small>${esc(t.source)} · магазин ${t.store} · до ${t.due}</small></div>
          <a href="#/tasks" class="link-clear" style="font-size:12px">открыть</a>
        </div>`).join('')}
    </div>
  </div>`;

  return note + strip +
    `<div class="grid grid-2" style="margin-bottom:18px">${rank}${heat}</div>` +
    `<div class="grid grid-2">${trendCard}${feed}</div>`;
}

/* ---------- TASKS ---------- */
function viewTasks(){
  const head = `
    <div class="crumbs"><a href="#/home">Главная</a> / Задачи</div>
    <div class="page-h"><h1>Задачи</h1>
      <span class="badge-new" style="background:var(--muted-2)">они же отклонения</span>
      <a href="#/task-create" class="btn btn-primary" style="margin-left:auto;text-decoration:none">+ Постановка задач</a>
    </div>`;

  const activeChip = `<div class="chip">Активность: ${state.activity==='done'?'Завершённые':'Активные'}
      <button onclick="toggleActivity()" title="переключить">⇄</button></div>`;
  const typeChips = [...state.fType].map(k=>{
    const t = TASK_TYPES.find(x=>x.key===k);
    return `<div class="chip">${t.label}<button onclick="rmFilter('fType','${k}')">✕</button></div>`;
  }).join('');
  const statusChips = [...state.fStatus].map(k=>{
    const t = TASK_STATUSES.find(x=>x.key===k);
    return `<div class="chip">${t.label}<button onclick="rmFilter('fStatus','${k}')">✕</button></div>`;
  }).join('');
  const clear = (state.fType.size||state.fStatus.size) ? `<button class="link-clear" onclick="clearFilters()">Очистить все</button>` : '';
  const toolbar = `<div class="task-toolbar">${activeChip}${typeChips}${statusChips}${clear}</div>`;

  const list = filteredTasks();
  const cards = list.length ? list.map(taskCard).join('') :
    `<div class="empty">Нет задач под выбранные фильтры</div>`;

  const filters = `<aside class="filters">
    <section><h4>Активность</h4>
      ${['active','done'].map(a=>`<label class="fopt"><input type="radio" name="act" ${state.activity===a?'checked':''} onchange="setActivity('${a}')"> ${a==='active'?'Активные':'Завершённые'}</label>`).join('')}
    </section>
    <section><h4>Тип</h4>
      ${TASK_TYPES.map(t=>`<label class="fopt"><input type="checkbox" ${state.fType.has(t.key)?'checked':''} onchange="addFilter('fType','${t.key}')"> ${t.label}<span class="cnt">${t.count}</span></label>`).join('')}
    </section>
    <section><h4>Статус</h4>
      ${TASK_STATUSES.map(t=>`<label class="fopt"><input type="checkbox" ${state.fStatus.has(t.key)?'checked':''} onchange="addFilter('fStatus','${t.key}')"> ${t.label}</label>`).join('')}
    </section>
    <section><h4>Магазин</h4>
      <div class="store-sel" style="width:100%">🏪<select onchange="setStore(this.value)">
        ${Object.values(STORES).map(o=>`<option value="${o.id}" ${o.id===state.store?'selected':''}>${esc(o.name)}</option>`).join('')}
      </select></div>
    </section>
  </aside>`;

  return head + `<div class="tasks-layout"><div><div class="fade">${toolbar}<div class="task-list">${cards}</div></div></div>${filters}</div>`;
}

function taskCard(t){
  const st = TASK_STATUSES.find(x=>x.key===t.status);
  return `<div class="task ${t.priority?('prio-'+t.priority):''}" onclick="openTask('${t.id}')">
    <div class="task__top">
      <span class="src">${esc(t.source)}</span><span class="tid">${t.id}</span>
      <span class="spacer"></span>
      ${t.cascaded?'<span class="tag-casc">⤵ КАСКАДИРОВАНА</span>':''}
      <span class="st ${st.tone}">${st.label}</span>
    </div>
    <div class="task__title">${esc(t.title)}</div>
    <div class="task__meta">
      <div class="m"><label>Срок исполнения</label><b>${t.due}</b></div>
      <div class="m"><label>Номер магазина</label><b>${t.store} Пятёрочка</b></div>
      <div class="m"><label>Должность исполнителя</label><b>${esc(t.role)}</b></div>
      <div class="m"><label>Исполнитель</label><b>${esc(t.assignee)}</b></div>
    </div>
  </div>`;
}

function filteredTasks(){
  return TASKS.filter(t=>{
    const isDone = t.status==='done';
    if(state.activity==='done' && !isDone) return false;
    if(state.activity==='active' && isDone) return false;
    if(t.store!==state.store) return false;
    if(state.fType.size && !state.fType.has(t.type)) return false;
    if(state.fStatus.size && !state.fStatus.has(t.status)) return false;
    return true;
  });
}

function viewTaskCreate(){
  const head = `<div class="crumbs"><a href="#/home">Главная</a> / <a href="#/tasks">Задачи</a> / Постановка задач</div>
    <div class="page-h"><h1>Постановка задач</h1></div>`;
  const checks = state.checks.map((v,i)=>`
    <div class="checkitem"><span style="color:var(--muted-2)">${i+1}.</span>
      <input type="text" value="${esc(v)}" placeholder="Пункт чек-листа" oninput="setCheck(${i}, this.value)">
      <button class="x" onclick="rmCheck(${i})">✕</button></div>`).join('');
  const body = `<div class="card form-card fade">
    <div class="field"><label>Тип задачи</label>
      <div class="seg">
        <button class="${state.taskKind==='task'?'active':''}" onclick="setKind('task')">Задача</button>
        <button class="${state.taskKind==='checklist'?'active':''}" onclick="setKind('checklist')">Чек-лист</button>
      </div>
    </div>
    <div class="field"><label>Наименование задачи</label><input type="text" placeholder="Например: Разбор ТОП-10 позиций по потерям"></div>
    <div class="field"><label>Описание задачи</label><textarea placeholder="Что нужно сделать и зачем"></textarea></div>
    ${state.taskKind==='checklist' ? `<div class="field"><label>Пункты чек-листа</label>${checks}<button class="add-check" onclick="addCheck()">+ Добавить пункт</button></div>`:''}
    <div class="field"><label>Исполнитель</label>
      <select><option>Ханифова Венера — Директор</option><option>Гафуров Тимур — Администратор</option><option>Каскадировать на сотрудников</option></select></div>
    <div class="field"><label>Срок исполнения</label><input type="text" placeholder="дд.мм.гггг" value="05.09.2022"></div>
    <div class="field"><label>Вложения</label><div class="dropzone">Перетащите файлы сюда или нажмите для выбора</div></div>
    <div class="btn-row">
      <button class="btn btn-primary" onclick="alert('Прототип: задача поставлена и отправлена исполнителю')">Поставить задачу</button>
      <a href="#/tasks" class="btn btn-ghost" style="text-decoration:none">Отмена</a>
    </div>
  </div>`;
  return head + body;
}

/* ---------- SCRIPTS (АСУЗ) ---------- */
function viewScripts(){
  const head = `<div class="crumbs"><a href="#/home">Главная</a> / АСУЗ</div>
    <div class="page-h"><h1>АСУЗ · текущая структура скриптов</h1></div>
    <p style="color:var(--muted);max-width:760px;margin:-8px 0 18px">Автоматизированная система управления задачами. 70+ скриптов-детекторов в 14 блоках непрерывно проверяют данные сети и превращают каждое отклонение в конкретную задачу директору. Цвет — тип процесса.</p>`;
  const procColor = { sales:'#2f80ed', losses:'#e5392f', stock:'#8e5cd9', fresh:'#2e9e4f', people:'#f08c1e', service:'#0fb5ae', discipline:'#5b6b7b' };
  const legend = `<div class="legend">${PROCESS_TYPES.map(p=>`<span><i style="background:${procColor[p.key]}"></i>${p.title}</span>`).join('')}</div>`;
  const blocks = SCRIPT_BLOCKS.map(b=>`
    <div class="sblock proc-${b.proc}">
      <div class="sblock__h"><h3>${esc(b.title)}</h3><div class="team">${esc(b.team)}</div></div>
      <div class="sblock__body"><ul>${b.scripts.map(s=>`<li><span>${esc(s)}</span></li>`).join('')}</ul></div>
    </div>`).join('');
  return head + legend + `<div class="scripts-grid">${blocks}</div>`;
}

/* ---------- OP MODEL / PROBLEMS ---------- */
function viewOpModel(){
  const note = `<div class="note">⚠️ <div><b>Реконструкция.</b> Раздел собран по брифу и скриптовым блокам — исходные файлы «Опер-модель» и «Семь типов процессов Х5» недоступны в облачной среде. Формулировки иллюстративны.</div></div>`;
  const head = `<div class="crumbs"><a href="#/home">Главная</a> / Операционная модель</div>
    <div class="page-h"><h1>Операционная модель магазина</h1></div>`;
  const proc7 = `<h2 style="font-size:17px;margin:6px 0 14px">Семь типов процессов магазина</h2>
    <div class="proc7">${PROCESS_TYPES.map(p=>`
      <div class="proct"><div class="ic">${p.icon}</div><h4>${p.title}</h4><p>${p.desc}</p></div>`).join('')}</div>`;
  const probs = `<h2 style="font-size:17px;margin:24px 0 14px">Ключевые проблемы «до» АСУЗ</h2>
    <div class="prob-grid">${PROBLEMS.map(p=>`
      <div class="prob"><div class="ic">${p.icon}</div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join('')}</div>`;
  const solve = `<div class="card" style="margin-top:24px;background:#eaf6ec;border-color:#cfe9d4">
    <h3 style="margin:0 0 8px;color:var(--brand-dark)">Как это решает АСУЗ</h3>
    <p style="margin:0;color:var(--ink-soft);max-width:820px">Скрипты по каждому из семи процессов непрерывно ищут отклонения, ранжируют их по влиянию на РТО и потери и ставят директору <b>одну приоритизированную задачу</b> вместо потока сырых данных. Контур замыкается: выполнил → показатель изменился → система видит эффект.</p>
    <a href="#/scripts" class="btn btn-primary" style="margin-top:14px;display:inline-block;text-decoration:none">Смотреть структуру скриптов →</a>
  </div>`;
  return note + head + proc7 + probs + solve;
}

/* ---------- HOME ---------- */
function viewHome(){
  const s = STORES[state.store];
  const open = TASKS.filter(t=>t.store===state.store && t.status!=='done').length;
  return `<div class="page-h"><h1>Добрый день, ${esc(s.director.split(' ')[0])} 👋</h1></div>
    <p style="color:var(--muted);margin:-10px 0 22px">Сводка по магазину ${s.id}. Сегодня АСУЗ нашла <b style="color:var(--neg)">${open}</b> ${plural(open,'отклонение','отклонения','отклонений')}, требующих внимания.</p>
    <div class="kstrip">
      <div class="kpill"><div class="lab">РТО, ${s.date}</div><div class="val">${FMT.money(s.kpi.rto.value)}</div><div class="dl up">${delta(s.kpi.rto.weekDelta)} к неделе</div></div>
      <div class="kpill"><div class="lab">Выполнение плана</div><div class="val">${FMT.pctRaw(s.plan.pct)}</div><div class="dl">прогноз ${FMT.pctRaw(s.plan.forecastPct)}</div></div>
      <div class="kpill"><div class="lab">Потери</div><div class="val ${s.losses.status==='bad'?'':''}" style="color:${s.losses.status==='bad'?'var(--neg)':'var(--pos)'}">${FMT.pctRaw(s.losses.pct)}</div><div class="dl">норматив ${FMT.pctRaw(s.losses.norm)}</div></div>
      <div class="kpill"><div class="lab">NPS</div><div class="val">${s.nps.value}%</div><div class="dl">текущий период</div></div>
      <div class="kpill"><div class="lab">Открытых задач</div><div class="val">${open}</div><div class="dl">по магазину ${s.id}</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:18px">
      <div class="card">
        <div class="card__h"><h3>Приоритетные отклонения</h3><a href="#/tasks" class="link-clear" style="font-size:12px">все задачи →</a></div>
        <div class="devfeed">
          ${TASKS.filter(t=>t.store===state.store && t.status!=='done').map(t=>`
            <div class="devrow" style="cursor:pointer" onclick="location.hash='#/tasks'">
              <span class="dt" style="background:${t.priority==='high'?'var(--neg)':t.priority==='med'?'var(--warn)':'var(--muted-2)'}"></span>
              <div class="tx">${esc(t.title)}<small>${esc(t.source)} · до ${t.due}</small></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card__h"><h3>Динамика РТО, 8 недель</h3><span class="i">i</span></div>
        ${sparkline(s.sparkRto, 'var(--brand)', 340, 110)}
        <p style="color:var(--muted);font-size:12.5px;margin-top:12px">Перейдите в <a href="#/analytics" style="color:var(--brand-dark);font-weight:700">Аналитику</a> для полной картины показателей или в <a href="#/analytics" onclick="setTimeout(()=>setDash('alt'),50)" style="color:var(--brand-dark);font-weight:700">Дашборд</a> кластера.</p>
      </div>
    </div>`;
}

function viewStub(title, emoji){
  return `<div class="page-h"><h1>${title}</h1></div>
    <div class="card empty" style="padding:54px"><div style="font-size:34px;margin-bottom:10px">${emoji}</div>
    <p style="color:var(--muted)">Раздел вне фокуса прототипа. Основные сценарии — Аналитика, Задачи и АСУЗ.</p></div>`;
}

/* ---------- task drawer ---------- */
function openTask(id){ state.task = id; renderDrawer(); }
function closeTask(){ state.task = null; renderDrawer(); }
function renderDrawer(){
  const back = document.getElementById('drawerBack');
  const dr = document.getElementById('drawer');
  if(!state.task){ back.classList.remove('open'); dr.classList.remove('open'); return; }
  const t = TASKS.find(x=>x.id===state.task);
  const st = TASK_STATUSES.find(x=>x.key===t.status);
  dr.innerHTML = `
    <div class="drawer__h">
      <div><div class="task__top"><span class="src">${esc(t.source)}</span><span class="tid">${t.id}</span>
        ${t.cascaded?'<span class="tag-casc">⤵ КАСКАДИРОВАНА</span>':''}</div>
        <h2>${esc(t.title)}</h2></div>
      <button class="drawer__close" onclick="closeTask()">✕</button>
    </div>
    <div class="drawer__body">
      <span class="st ${st.tone}">${st.label}</span>
      <div class="dl-list">
        <div class="r"><label>Срок исполнения</label><b>${t.due}</b></div>
        <div class="r"><label>Магазин</label><b>${t.store} Пятёрочка</b></div>
        <div class="r"><label>Должность исполнителя</label><b>${esc(t.role)}</b></div>
        <div class="r"><label>Исполнитель</label><b>${esc(t.assignee)}</b></div>
      </div>
      <p style="color:var(--ink-soft);font-size:13.5px;line-height:1.55">${esc(t.desc)}</p>
      <div class="script-tag" style="margin-top:18px"><small>Источник · скрипт АСУЗ</small>${esc(t.script)}</div>
      ${t.status!=='done' ? `<div class="btn-row" style="margin-top:22px">
        <button class="btn btn-primary" onclick="closeTask()">Отметить выполненной</button>
        <button class="btn btn-ghost" onclick="closeTask()">Закрыть</button></div>` : ''}
    </div>`;
  back.classList.add('open'); dr.classList.add('open');
}

/* ---------- router ---------- */
function render(){
  renderShell();
  const route = currentRoute();
  const map = {
    home: viewHome, analytics: viewAnalytics, tasks: viewTasks,
    'task-create': viewTaskCreate, scripts: viewScripts, opmodel: viewOpModel,
    techcard: ()=>viewStub('Теххарта','📋'), faq: ()=>viewStub('FAQ','❓'),
  };
  document.getElementById('view').innerHTML = (map[route]||viewAnalytics)();
  window.scrollTo(0,0);
}

/* ---------- actions ---------- */
function setStore(id){ state.store=id; render(); }
function setDash(v){ state.dashView=v; render(); }
function setATab(t){ state.analyticsTab=t; render(); }
function setActivity(a){ state.activity=a; render(); }
function toggleActivity(){ state.activity = state.activity==='done'?'active':'done'; render(); }
function addFilter(group,key){ state[group].has(key)?state[group].delete(key):state[group].add(key); render(); }
function rmFilter(group,key){ state[group].delete(key); render(); }
function clearFilters(){ state.fType.clear(); state.fStatus.clear(); render(); }
function setKind(k){ state.taskKind=k; render(); }
function setCheck(i,v){ state.checks[i]=v; }
function addCheck(){ state.checks.push(''); render(); }
function rmCheck(i){ state.checks.splice(i,1); if(!state.checks.length)state.checks=['']; render(); }
function toggleNav(){ document.querySelector('.app').classList.toggle('nav-open'); }

window.setStore=setStore; window.setDash=setDash; window.setATab=setATab;
window.setActivity=setActivity; window.toggleActivity=toggleActivity;
window.addFilter=addFilter; window.rmFilter=rmFilter; window.clearFilters=clearFilters;
window.setKind=setKind; window.setCheck=setCheck; window.addCheck=addCheck; window.rmCheck=rmCheck;
window.openTask=openTask; window.closeTask=closeTask; window.toggleNav=toggleNav;

window.addEventListener('hashchange', ()=>{ closeTask(); render(); });
document.addEventListener('DOMContentLoaded', render);
