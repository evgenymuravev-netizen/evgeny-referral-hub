/* =====================================================================
   ATMS prototype — SPA router, render and i18n (RU/EN)
   ===================================================================== */
const { FMT, STORES, DEFAULT_STORE, PORTFOLIO, TASK_TYPES, TASK_STATUSES,
        TASKS, SCRIPT_BLOCKS, PROCESS_TYPES, PROBLEMS } = window.DB;

let LANG = localStorage.getItem('asuz_lang') || 'ru';

const state = {
  store: DEFAULT_STORE,
  analyticsTab: 'store',
  dashView: 'classic',
  activity: 'done',
  fType: new Set(),
  fStatus: new Set(),
  task: null,
  taskKind: 'task',
  checks: [''],
};

/* ---------- i18n ---------- */
const tr = (v) => (v && typeof v === 'object' && 'ru' in v) ? (v[LANG] ?? v.ru) : v;
const S  = (k) => (UI[LANG][k] ?? UI.ru[k] ?? k);
const money  = (n) => FMT.money(n, LANG);
const num    = (n) => FMT.num(n, LANG);
const pctRaw = (n) => FMT.pctRaw(n, LANG);
const pct    = (n) => FMT.pct(n, LANG);

const UI = {
  ru: {
    brand:'Пятёрочка', backStory:'К истории Moneyball', collapse:'Свернуть меню',
    nav_home:'Главная', nav_tasks:'Задачи', nav_techcard:'Теххарта', nav_analytics:'Аналитика',
    nav_scripts:'АСУЗ', nav_opmodel:'Опер-модель', nav_faq:'FAQ',
    home:'Главная', tasks:'Задачи', techcard:'Теххарта', faq:'FAQ',
    analyticsTitleTop:'Аналитика по магазину', scriptsTitleTop:'АСУЗ · структура скриптов', opmodelTop:'Операционная модель',
    crumb_home:'Главная', crumb_analytics:'Аналитика', crumb_storeMetrics:'Показатели магазина',
    crumb_tasks:'Задачи', crumb_create:'Постановка задач', crumb_scripts:'АСУЗ', crumb_opmodel:'Операционная модель',
    analyticsFor:'Аналитика по магазину', new:'новый',
    vsCards:'Карточки', vsDash:'Дашборд',
    tabStore:'Показатели магазина', tabGoods:'Работа с товаром',
    kpiTitle:'Основные бизнес показатели', weekAgo:'Неделю назад', yearAgo:'Год назад',
    rto:'РТО', traffic:'Трафик', avgCheck:'Средний чек',
    planTitle:'Выполнение плана РТО', planOf:'плана на', inMoney:'— в денежном выражении',
    monthPlan:'— план на месяц', eomForecast:'— прогноз на конец месяца', planForecast:'— прогноз выполнения плана',
    csi:'CSI мотивация', npsTitle:'NPS', currentPeriod:'Текущий период',
    losses:'Потери', perMonth:'за месяц', norm:'норматив',
    writeoffs:'списания', inventory:'инвентаризации',
    lossesMip:'Потери за МИП', perMip:'за МИП',
    goodsTitle:'Работа с товаром', goodsText:'Раздел показывает доступность матрицы, товарный запас, корректность остатков и свежесть. В прототипе эти отклонения уже видны на вкладке',
    goodsAnd:'и в', goodsTasks:'задачах',
    altNote:'<b>Альтернативный дашборд.</b> Реконструкция по описанию файла «Дашборд» — исходный PDF недоступен в облачной среде. Это другая визуальная подача тех же данных: единая KPI-лента, рейтинг магазинов кластера, тепловая карта отклонений и лента событий.',
    clRto:'РТО кластера, день', clPlan:'Средн. выполнение плана', clLoss:'Средние потери', clNps:'NPS кластера', clOpen:'Открытых отклонений',
    wkPrev:'к прошлой неделе', goal:'цель', byStores:'по 6 магазинам',
    rankTitle:'Рейтинг магазинов кластера', hStore:'Магазин', hTrend:'Тренд', hRtoDay:'РТО/день', hPlan:'План', hLoss:'Потери', hNps:'NPS', hDev:'Отклонений',
    heatTitle:'Тепловая карта отклонений: магазин × процесс', heatFoot:'Цвет — острота отклонения по процессу. Источник: скрипты АСУЗ.',
    trendTitle:'Динамика РТО, 8 недель', store:'Магазин', feedTitle:'Лента критичных отклонений', open:'открыть',
    tasksTitle:'Задачи', tasksBadge:'они же отклонения', createBtn:'+ Постановка задач',
    activity:'Активность', completed:'Завершённые', active:'Активные', clearAll:'Очистить все',
    fType:'Тип', fStatus:'Статус', fStore:'Магазин',
    due:'Срок исполнения', storeNo:'Номер магазина', roleCol:'Должность исполнителя', assignee:'Исполнитель',
    cascaded:'КАСКАДИРОВАНА', noTasks:'Нет задач под выбранные фильтры',
    createTitle:'Постановка задач', taskType:'Тип задачи', kindTask:'Задача', kindCheck:'Чек-лист',
    taskName:'Наименование задачи', taskNamePh:'Например: Разбор ТОП-10 позиций по потерям',
    taskDesc:'Описание задачи', taskDescPh:'Что нужно сделать и зачем',
    checkItems:'Пункты чек-листа', checkPh:'Пункт чек-листа', addCheck:'+ Добавить пункт',
    assigneeLbl:'Исполнитель', optDirector:'Ханифова Венера — Директор', optAdmin:'Гафуров Тимур — Администратор', optCascade:'Каскадировать на сотрудников',
    dueLbl:'Срок исполнения', attachments:'Вложения', dropzone:'Перетащите файлы сюда или нажмите для выбора',
    submit:'Поставить задачу', cancel:'Отмена', submitted:'Прототип: задача поставлена и отправлена исполнителю',
    scriptsTitle:'АСУЗ · текущая структура скриптов',
    scriptsIntro:'Автоматизированная система управления задачами. 70+ скриптов-детекторов в 14 блоках непрерывно проверяют данные сети и превращают каждое отклонение в конкретную задачу директору. Цвет — тип процесса.',
    opmodelNote:'<b>Реконструкция.</b> Раздел собран по брифу и скриптовым блокам — исходные файлы «Опер-модель» и «Семь типов процессов Х5» недоступны в облачной среде. Формулировки иллюстративны.',
    opmodelTitle:'Операционная модель магазина', sevenTitle:'Семь типов процессов магазина', probTitle:'Ключевые проблемы «до» АСУЗ',
    solveTitle:'Как это решает АСУЗ',
    solveText:'Скрипты по каждому из семи процессов непрерывно ищут отклонения, ранжируют их по влиянию на РТО и потери и ставят директору <b>одну приоритизированную задачу</b> вместо потока сырых данных. Контур замыкается: выполнил → показатель изменился → система видит эффект.',
    solveBtn:'Смотреть структуру скриптов →',
    greeting:'Добрый день', homeSummary1:'Сводка по магазину', homeSummary2a:'Сегодня АСУЗ нашла', homeSummary2b:'отклонения, требующих внимания.',
    kRtoOn:'РТО,', kPlanDone:'Выполнение плана', kForecast:'прогноз', kLosses:'Потери', kNps:'NPS', kOpen:'Открытых задач', byStore:'по магазину',
    prioTitle:'Приоритетные отклонения', allTasks:'все задачи →', homeTrendText1:'Перейдите в', homeTrendAnalytics:'Аналитику', homeTrendText2:'для полной картины показателей или в', homeTrendDash:'Дашборд', homeTrendText3:'кластера.',
    drwSource:'Источник · скрипт АСУЗ', drwDone:'Отметить выполненной', drwClose:'Закрыть',
    stubText:'Раздел вне фокуса прототипа. Основные сценарии — Аналитика, Задачи и АСУЗ.',
    suffixStore:'Пятёрочка',
  },
  en: {
    brand:'Pyaterochka', backStory:'Back to the Moneyball story', collapse:'Collapse menu',
    nav_home:'Home', nav_tasks:'Tasks', nav_techcard:'Tech card', nav_analytics:'Analytics',
    nav_scripts:'ATMS', nav_opmodel:'Operating model', nav_faq:'FAQ',
    home:'Home', tasks:'Tasks', techcard:'Tech card', faq:'FAQ',
    analyticsTitleTop:'Analytics for store', scriptsTitleTop:'ATMS · script structure', opmodelTop:'Operating model',
    crumb_home:'Home', crumb_analytics:'Analytics', crumb_storeMetrics:'Store metrics',
    crumb_tasks:'Tasks', crumb_create:'Create task', crumb_scripts:'ATMS', crumb_opmodel:'Operating model',
    analyticsFor:'Analytics for store', new:'new',
    vsCards:'Cards', vsDash:'Dashboard',
    tabStore:'Store metrics', tabGoods:'Goods management',
    kpiTitle:'Key business metrics', weekAgo:'Week ago', yearAgo:'Year ago',
    rto:'Turnover', traffic:'Traffic', avgCheck:'Average basket',
    planTitle:'Turnover plan achievement', planOf:'of the', inMoney:'— in monetary terms',
    monthPlan:'— monthly plan', eomForecast:'— end-of-month forecast', planForecast:'— forecast plan achievement',
    csi:'CSI motivation', npsTitle:'NPS', currentPeriod:'Current period',
    losses:'Losses', perMonth:'this month', norm:'target',
    writeoffs:'write-offs', inventory:'stocktake',
    lossesMip:'Losses (ISP)', perMip:'per ISP',
    goodsTitle:'Goods management', goodsText:'This section shows assortment availability, inventory levels, stock accuracy and freshness. In the prototype these deviations are already visible on the',
    goodsAnd:'tab and in', goodsTasks:'tasks',
    altNote:'<b>Alternative dashboard.</b> Reconstructed from the description of the "Dashboard" file — the source PDF is unreachable in the build environment. It is a different visual take on the same data: one KPI strip, a cluster store ranking, a deviation heatmap and an event feed.',
    clRto:'Cluster turnover, day', clPlan:'Avg. plan achievement', clLoss:'Average losses', clNps:'Cluster NPS', clOpen:'Open deviations',
    wkPrev:'vs last week', goal:'goal', byStores:'across 6 stores',
    rankTitle:'Cluster store ranking', hStore:'Store', hTrend:'Trend', hRtoDay:'Turnover/day', hPlan:'Plan', hLoss:'Losses', hNps:'NPS', hDev:'Deviations',
    heatTitle:'Deviation heatmap: store × process', heatFoot:'Color = deviation severity by process. Source: ATMS scripts.',
    trendTitle:'Turnover trend, 8 weeks', store:'Store', feedTitle:'Critical-deviation feed', open:'open',
    tasksTitle:'Tasks', tasksBadge:'i.e. deviations', createBtn:'+ Create task',
    activity:'Activity', completed:'Completed', active:'Active', clearAll:'Clear all',
    fType:'Type', fStatus:'Status', fStore:'Store',
    due:'Due date', storeNo:'Store number', roleCol:'Assignee role', assignee:'Assignee',
    cascaded:'CASCADED', noTasks:'No tasks match the selected filters',
    createTitle:'Create task', taskType:'Task type', kindTask:'Task', kindCheck:'Checklist',
    taskName:'Task name', taskNamePh:'e.g. Review the Top-10 loss items',
    taskDesc:'Task description', taskDescPh:'What to do and why',
    checkItems:'Checklist items', checkPh:'Checklist item', addCheck:'+ Add item',
    assigneeLbl:'Assignee', optDirector:'Venera Khanifova — Store director', optAdmin:'Timur Gafurov — Shift manager', optCascade:'Cascade to staff',
    dueLbl:'Due date', attachments:'Attachments', dropzone:'Drag files here or click to select',
    submit:'Assign task', cancel:'Cancel', submitted:'Prototype: task created and sent to the assignee',
    scriptsTitle:'ATMS · current script structure',
    scriptsIntro:'Automated Task Management System. 70+ detector scripts in 14 blocks continuously check network data and turn every deviation into a concrete task for the store director. Color = process type.',
    opmodelNote:'<b>Reconstruction.</b> Built from the brief and the script blocks — the source "Operating model" and "Seven X5 process types" files are unreachable in the build environment. Wording is illustrative.',
    opmodelTitle:'Store operating model', sevenTitle:'Seven store process types', probTitle:'Key problems before ATMS',
    solveTitle:'How ATMS solves it',
    solveText:'Scripts for each of the seven processes continuously hunt for deviations, rank them by impact on turnover and losses, and hand the director <b>one prioritized task</b> instead of a stream of raw data. The loop closes: complete it → the metric moves → the system sees the effect.',
    solveBtn:'View the script structure →',
    greeting:'Good afternoon', homeSummary1:'Summary for store', homeSummary2a:'Today ATMS found', homeSummary2b:'deviations that need attention.',
    kRtoOn:'Turnover,', kPlanDone:'Plan achievement', kForecast:'forecast', kLosses:'Losses', kNps:'NPS', kOpen:'Open tasks', byStore:'in store',
    prioTitle:'Priority deviations', allTasks:'all tasks →', homeTrendText1:'Open', homeTrendAnalytics:'Analytics', homeTrendText2:'for the full metric picture, or the cluster', homeTrendDash:'Dashboard', homeTrendText3:'.',
    drwSource:'Source · ATMS script', drwDone:'Mark as done', drwClose:'Close',
    stubText:'This section is out of scope for the prototype. The core flows are Analytics, Tasks and ATMS.',
    suffixStore:'Pyaterochka',
  },
};

/* ---------- svg helpers ---------- */
function gauge(p, color, size = 120){
  const r = size/2 - 12, c = 2*Math.PI*r, off = c*(1 - p/100), cx = size/2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#eef1f5" stroke-width="11"/>
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="11"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
      transform="rotate(-90 ${cx} ${cx})"/></svg>`;
}
function sparkline(data, color, w = 150, h = 42){
  const max = Math.max(...data), min = Math.min(...data), span = (max-min)||1, step = w/(data.length-1);
  const pts = data.map((v,i)=>`${(i*step).toFixed(1)},${(h-4 - (v-min)/span*(h-10)).toFixed(1)}`);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <path d="M0,${h} L${pts.join(' L')} L${w},${h} Z" fill="${color}" opacity="0.10"/>
    <path d="M${pts.join(' L')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
const delta = (n)=>`<span class="d ${n>=0?'up':'down'}">${n>=0?'▲':'▼'} ${pct(n).replace('+','')}</span>`;
const esc = (s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function plural(n, one, few, many){
  if(LANG==='en') return n===1?one:many;
  const m10=n%10, m100=n%100;
  if(m10===1 && m100!==11) return one;
  if(m10>=2 && m10<=4 && (m100<10||m100>=20)) return few;
  return many;
}

/* ---------- shell ---------- */
const NAV = [
  { id:'home', icon:'grid' }, { id:'tasks', icon:'clipboard' }, { id:'techcard', icon:'card' },
  { id:'analytics', icon:'chart' }, { id:'scripts', icon:'cpu' }, { id:'opmodel', icon:'layers' }, { id:'faq', icon:'help' },
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
  const route = currentRoute(), s = STORES[state.store];
  document.documentElement.lang = LANG;
  document.getElementById('nav').innerHTML = NAV.map(n=>`
    <a href="#/${n.id}" class="${route===n.id?'active':''}">
      <span class="ic">${icon(n.icon)}</span><span class="lbl">${S('nav_'+n.id)}</span></a>`).join('');
  const titles = { home:S('home'), tasks:S('tasks'),
    analytics:`${S('analyticsTitleTop')} ${s.id} «${S('brand')}»`,
    scripts:S('scriptsTitleTop'), opmodel:S('opmodelTop'), techcard:S('techcard'), faq:S('faq') };
  document.getElementById('topTitle').textContent = titles[route] || '';
  const initials = tr(s.director).split(' ').map(x=>x[0]).slice(0,2).join('');
  document.getElementById('topUser').innerHTML =
    `<div class="lang-toggle">
       <button class="${LANG==='ru'?'active':''}" onclick="setLang('ru')">RU</button>
       <button class="${LANG==='en'?'active':''}" onclick="setLang('en')">EN</button>
     </div>
     <div class="meta"><b>${esc(tr(s.director))}</b><span>${esc(tr(s.role))}</span></div>
     <div class="avatar">${esc(initials)}</div>`;
  const wm = document.querySelector('.wordmark'); if(wm) wm.textContent = S('brand');
  const fb = document.getElementById('footBack'); if(fb) fb.textContent = S('backStory');
  const fc = document.getElementById('footCollapse'); if(fc) fc.textContent = S('collapse');
}

/* ---------- ANALYTICS ---------- */
function viewAnalytics(){
  const s = STORES[state.store];
  const storePicker = `<div class="store-sel">🏪
    <select onchange="setStore(this.value)">
      ${Object.values(STORES).map(o=>`<option value="${o.id}" ${o.id===state.store?'selected':''}>${esc(tr(o.name))}</option>`).join('')}
    </select></div>`;
  const head = `
    <div class="crumbs"><a href="#/home">${S('crumb_home')}</a> / <a href="#/analytics">${S('crumb_analytics')}</a> / ${S('crumb_storeMetrics')}</div>
    <div class="page-h">
      <h1>${S('analyticsFor')} ${s.id} «${S('brand')}»</h1>
      ${s.isNew?`<span class="badge-new">${S('new')}</span>`:''}
      <div style="margin-left:auto;display:flex;gap:12px;align-items:center">
        ${storePicker}
        <div class="viewswitch">
          <button class="${state.dashView==='classic'?'active':''}" onclick="setDash('classic')">${S('vsCards')}</button>
          <button class="${state.dashView==='alt'?'active':''}" onclick="setDash('alt')">${S('vsDash')}</button>
        </div>
      </div>
    </div>`;
  if(state.dashView==='alt') return head + altDashboard();
  const tabs = `<div class="tabs">
      <button class="${state.analyticsTab==='store'?'active':''}" onclick="setATab('store')">${S('tabStore')}</button>
      <button class="${state.analyticsTab==='goods'?'active':''}" onclick="setATab('goods')">${S('tabGoods')}</button>
    </div>`;
  if(state.analyticsTab==='goods') return head + tabs + goodsTab();
  return head + tabs + classicDashboard(s);
}

function kpiRow(name, k){
  const unit = k.unit ? ' '+tr(k.unit) : (name===S('rto')||name===S('avgCheck')?' ₽':'');
  return `<tr>
    <td><div class="kpi-name"><span class="dot">i</span>${name}</div></td>
    <td><span class="kpi-big">${num(k.value)}${unit}</span></td>
    <td><div class="kpi-sub">${num(k.weekAgo)}${unit}</div><div class="kpi-cmp">${delta(k.weekDelta)}</div></td>
    <td><div class="kpi-sub">${num(k.yearAgo)}${unit}</div><div class="kpi-cmp">${delta(k.yearDelta)}</div></td>
  </tr>`;
}

function classicDashboard(s){
  const kpiCard = `<div class="card fade">
    <div class="card__h"><h3>${S('kpiTitle')}</h3><span class="i">i</span></div>
    <table class="kpi-table">
      <thead><tr><th></th><th>${tr(s.date)}</th><th>${S('weekAgo')}</th><th>${S('yearAgo')}</th></tr></thead>
      <tbody>${kpiRow(S('rto'), s.kpi.rto)}${kpiRow(S('traffic'), s.kpi.traffic)}${kpiRow(S('avgCheck'), s.kpi.avgCheck)}</tbody>
    </table>
    <div class="card__foot">01.09.2022 09:00</div></div>`;

  const p = s.plan;
  const planCard = `<div class="card fade">
    <div class="card__h"><h3>${S('planTitle')}</h3><span class="i">i</span></div>
    <div class="plan-pct">${pctRaw(p.pct)}<small>${S('planOf')} ${tr(s.month)}${LANG==='en'?' plan':''}</small></div>
    <div class="plan-bar"><span style="width:${Math.min(p.pct,100)}%"></span></div>
    <div class="plan-rows">
      <div class="plan-row"><b>${money(p.actual)}</b><span>${S('inMoney')}</span></div>
      <div class="plan-row"><b>${money(p.monthPlan)}</b><span>${S('monthPlan')}</span></div>
      <div class="plan-row"><b>${money(p.forecast)}</b><span>${S('eomForecast')}</span></div>
      <div class="plan-row accent"><b>${pctRaw(p.forecastPct)}</b><span>${S('planForecast')}</span></div>
    </div>
    <div class="card__foot">01.09.2022 09:01</div></div>`;

  const csiCard = `<div class="card fade">
    <div class="card__h"><h3>${S('csi')}</h3><span class="i">i</span></div>
    <div class="gauge-wrap"><div style="position:relative;display:grid;place-items:center">
      ${gauge(s.csi.value, s.csi.value>=70?'var(--pos)':'var(--warn)')}
      <div style="position:absolute;font-size:24px">${s.csi.value>=70?'🙂':'😐'}</div></div>
      <div class="gauge-val">${s.csi.value}%</div></div></div>`;

  const npsCard = `<div class="card fade">
    <div class="card__h"><h3>${S('npsTitle')}</h3><span class="i">i</span></div>
    <div style="color:var(--muted);font-size:12px;margin-bottom:6px">${S('currentPeriod')}</div>
    <div class="gauge-wrap">${gauge(s.nps.value, s.nps.value>=40?'var(--pos)':'var(--warn)')}
      <div class="gauge-val" style="margin-top:-78px">${s.nps.value}%</div><div style="height:40px"></div></div></div>`;

  const L = s.losses;
  const lossCard = `<div class="card fade" style="border:1px solid ${L.status==='bad'?'#f6cfcb':'var(--line)'}">
    <div class="card__h"><h3>${S('losses')}</h3><span class="i">i</span></div>
    <div class="loss-top"><span class="loss-pct ${L.status}">${pctRaw(L.pct)}<small>${S('perMonth')}</small></span>
      <span class="loss-norm">${pctRaw(L.norm)}<small>${S('norm')}</small></span></div>
    <div class="loss-money">${money(L.money)} ${S('inMoney')}</div>
    <div class="loss-breakdown">
      <div class="loss-line"><span class="lk"></span><b>${pctRaw(L.writeoff.pct)}</b> — ${S('writeoffs')} · ${money(L.writeoff.money)}</div>
      <div class="loss-line"><span class="lk"></span><b>${pctRaw(L.inventory.pct)}</b> — ${S('inventory')} · ${money(L.inventory.money)}</div>
    </div><div class="card__foot">31.08.2022 10:00</div></div>`;

  const M = s.lossesMip;
  const mipCard = `<div class="card fade">
    <div class="card__h"><h3>${S('lossesMip')}</h3><span class="i">i</span></div>
    <div class="loss-top"><span class="loss-pct ${M.pct<=M.norm?'good':'bad'}">${pctRaw(M.pct)}<small>${S('perMip')}</small></span>
      <span class="loss-norm">${pctRaw(M.norm)}<small>${S('norm')}</small></span></div>
    <div class="loss-money">${money(M.money)} ${S('inMoney')}</div>
    <div class="loss-breakdown">
      <div class="loss-line"><span class="lk"></span><b>${pctRaw(M.writeoff.pct)}</b> — ${S('writeoffs')} · ${money(M.writeoff.money)}</div>
      <div class="loss-line"><span class="lk"></span><b>${pctRaw(M.inventory.pct)}</b> — ${S('inventory')} · ${money(M.inventory.money)}</div>
    </div><div class="card__foot">31.08.2022 17:40</div></div>`;

  return `<div class="grid grid-2" style="margin-bottom:18px">${kpiCard}${planCard}</div>
    <div class="grid grid-4">${csiCard}${npsCard}${lossCard}${mipCard}</div>`;
}

function goodsTab(){
  return `<div class="card fade empty" style="padding:48px">
    <div style="font-size:30px;margin-bottom:8px">🧺</div>
    <h3 style="margin:0 0 6px">${S('goodsTitle')}</h3>
    <p style="color:var(--muted);max-width:480px;margin:0 auto">${S('goodsText')}
      <a href="#/scripts" style="color:var(--brand-dark);font-weight:700">${S('nav_scripts')}</a> ${S('goodsAnd')}
      <a href="#/tasks" style="color:var(--brand-dark);font-weight:700">${S('goodsTasks')}</a>.</p></div>`;
}

/* ---------- ALTERNATIVE DASHBOARD ---------- */
function altDashboard(){
  const note = `<div class="note">⚠️ <div>${S('altNote')}</div></div>`;
  const totRto = PORTFOLIO.reduce((a,b)=>a+b.rto,0);
  const avgPlan = PORTFOLIO.reduce((a,b)=>a+b.planPct,0)/PORTFOLIO.length;
  const avgLoss = PORTFOLIO.reduce((a,b)=>a+b.losses,0)/PORTFOLIO.length;
  const avgNps  = Math.round(PORTFOLIO.reduce((a,b)=>a+b.nps,0)/PORTFOLIO.length);
  const openDev = PORTFOLIO.reduce((a,b)=>a+b.openDev,0);

  const strip = `<div class="kstrip fade">
    <div class="kpill"><div class="lab">${S('clRto')}</div><div class="val">${num(totRto)} ₽</div><div class="dl up">▲ 11,4% ${S('wkPrev')}</div></div>
    <div class="kpill"><div class="lab">${S('clPlan')}</div><div class="val">${pctRaw(avgPlan)}</div><div class="dl up">▲ ${S('goal')} 100%</div></div>
    <div class="kpill"><div class="lab">${S('clLoss')}</div><div class="val">${pctRaw(avgLoss)}</div><div class="dl down">▼ ${S('norm')} 4,84%</div></div>
    <div class="kpill"><div class="lab">${S('clNps')}</div><div class="val">${avgNps}%</div><div class="dl down">▼ ${S('goal')} 45%</div></div>
    <div class="kpill"><div class="lab">${S('clOpen')}</div><div class="val">${openDev}</div><div class="dl down">${S('byStores')}</div></div>
  </div>`;

  const planColor=(v)=>v>=105?'g':v>=98?'y':'r', lossColor=(v)=>v<=3?'g':v<=5?'y':'r';
  const tIcon=(t)=>t==='up'?'<span class="trend-up">▲</span>':t==='down'?'<span class="trend-down">▼</span>':'<span class="trend-flat">▬</span>';
  const rank = `<div class="card fade">
    <div class="card__h"><h3>${S('rankTitle')}</h3><span class="i">i</span></div>
    <table class="rank-table">
      <thead><tr><th>${S('hStore')}</th><th>${S('hTrend')}</th><th style="text-align:right">${S('hRtoDay')}</th><th style="text-align:center">${S('hPlan')}</th><th style="text-align:center">${S('hLoss')}</th><th style="text-align:center">${S('hNps')}</th><th style="text-align:right">${S('hDev')}</th></tr></thead>
      <tbody>${[...PORTFOLIO].sort((a,b)=>b.planPct-a.planPct).map(p=>`
        <tr ${p.id===state.store?'style="background:#eaf6ec"':''}>
          <td><b>${esc(tr(p.name))}</b></td><td>${tIcon(p.trend)}</td>
          <td class="num">${num(p.rto)} ₽</td>
          <td style="text-align:center"><span class="pill-pct ${planColor(p.planPct)}">${pctRaw(p.planPct)}</span></td>
          <td style="text-align:center"><span class="pill-pct ${lossColor(p.losses)}">${pctRaw(p.losses)}</span></td>
          <td style="text-align:center">${p.nps}%</td><td class="num">${p.openDev}</td></tr>`).join('')}
      </tbody></table></div>`;

  const procs = PROCESS_TYPES, seed=(i,j)=>((i*7+j*13+5)%10);
  const heatColor=(v)=>v<=2?'#9ccc9e':v<=4?'#f4c542':v<=6?'#f0902e':'#e5392f';
  const heat = `<div class="card fade">
    <div class="card__h"><h3>${S('heatTitle')}</h3><span class="i">i</span></div>
    <div class="heat"><div></div>${procs.map(p=>`<div class="hh" title="${esc(tr(p.title))}">${p.icon}</div>`).join('')}
      ${PORTFOLIO.map((st,i)=>`<div class="rl">${esc(tr(st.name))}</div>${procs.map((p,j)=>{const v=seed(i,j);return `<div class="cell" style="background:${heatColor(v)}" title="${esc(tr(p.title))}: ${v}">${v}</div>`;}).join('')}`).join('')}
    </div><div class="card__foot">${S('heatFoot')}</div></div>`;

  const trendCard = `<div class="card fade">
    <div class="card__h"><h3>${S('trendTitle')}</h3><span class="i">i</span></div>
    ${sparkline(STORES['22711'].sparkRto, 'var(--brand)', 320, 90)}
    <div class="card__foot">${S('store')} ${state.store}</div></div>`;

  const feed = `<div class="card fade">
    <div class="card__h"><h3>${S('feedTitle')}</h3><span class="i">i</span></div>
    <div class="devfeed">${TASKS.filter(t=>t.status!=='done').slice(0,6).map(t=>`
      <div class="devrow"><span class="dt" style="background:${t.priority==='high'?'var(--neg)':t.priority==='med'?'var(--warn)':'var(--muted-2)'}"></span>
        <div class="tx">${esc(tr(t.title))}<small>${esc(tr(t.source))} · ${S('byStore')} ${t.store} · ${t.due}</small></div>
        <a href="#/tasks" class="link-clear" style="font-size:12px">${S('open')}</a></div>`).join('')}
    </div></div>`;

  return note + strip + `<div class="grid grid-2" style="margin-bottom:18px">${rank}${heat}</div>` +
    `<div class="grid grid-2">${trendCard}${feed}</div>`;
}

/* ---------- TASKS ---------- */
function viewTasks(){
  const head = `<div class="crumbs"><a href="#/home">${S('crumb_home')}</a> / ${S('crumb_tasks')}</div>
    <div class="page-h"><h1>${S('tasksTitle')}</h1>
      <span class="badge-new" style="background:var(--muted-2)">${S('tasksBadge')}</span>
      <a href="#/task-create" class="btn btn-primary" style="margin-left:auto;text-decoration:none">${S('createBtn')}</a></div>`;

  const activeChip = `<div class="chip">${S('activity')}: ${state.activity==='done'?S('completed'):S('active')}
      <button onclick="toggleActivity()">⇄</button></div>`;
  const typeChips = [...state.fType].map(k=>`<div class="chip">${tr(TASK_TYPES.find(x=>x.key===k).label)}<button onclick="rmFilter('fType','${k}')">✕</button></div>`).join('');
  const statusChips = [...state.fStatus].map(k=>`<div class="chip">${tr(TASK_STATUSES.find(x=>x.key===k).label)}<button onclick="rmFilter('fStatus','${k}')">✕</button></div>`).join('');
  const clear = (state.fType.size||state.fStatus.size)?`<button class="link-clear" onclick="clearFilters()">${S('clearAll')}</button>`:'';
  const toolbar = `<div class="task-toolbar">${activeChip}${typeChips}${statusChips}${clear}</div>`;

  const list = filteredTasks();
  const cards = list.length ? list.map(taskCard).join('') : `<div class="empty">${S('noTasks')}</div>`;

  const filters = `<aside class="filters">
    <section><h4>${S('activity')}</h4>
      ${['active','done'].map(a=>`<label class="fopt"><input type="radio" name="act" ${state.activity===a?'checked':''} onchange="setActivity('${a}')"> ${a==='active'?S('active'):S('completed')}</label>`).join('')}
    </section>
    <section><h4>${S('fType')}</h4>
      ${TASK_TYPES.map(t=>`<label class="fopt"><input type="checkbox" ${state.fType.has(t.key)?'checked':''} onchange="addFilter('fType','${t.key}')"> ${tr(t.label)}<span class="cnt">${t.count}</span></label>`).join('')}
    </section>
    <section><h4>${S('fStatus')}</h4>
      ${TASK_STATUSES.map(t=>`<label class="fopt"><input type="checkbox" ${state.fStatus.has(t.key)?'checked':''} onchange="addFilter('fStatus','${t.key}')"> ${tr(t.label)}</label>`).join('')}
    </section>
    <section><h4>${S('fStore')}</h4>
      <div class="store-sel" style="width:100%">🏪<select onchange="setStore(this.value)">
        ${Object.values(STORES).map(o=>`<option value="${o.id}" ${o.id===state.store?'selected':''}>${esc(tr(o.name))}</option>`).join('')}
      </select></div></section></aside>`;

  return head + `<div class="tasks-layout"><div><div class="fade">${toolbar}<div class="task-list">${cards}</div></div></div>${filters}</div>`;
}

function taskCard(t){
  const st = TASK_STATUSES.find(x=>x.key===t.status);
  return `<div class="task ${t.priority?('prio-'+t.priority):''}" onclick="openTask('${t.id}')">
    <div class="task__top"><span class="src">${esc(tr(t.source))}</span><span class="tid">${t.id}</span><span class="spacer"></span>
      ${t.cascaded?`<span class="tag-casc">⤵ ${S('cascaded')}</span>`:''}
      <span class="st ${st.tone}">${tr(st.label)}</span></div>
    <div class="task__title">${esc(tr(t.title))}</div>
    <div class="task__meta">
      <div class="m"><label>${S('due')}</label><b>${t.due}</b></div>
      <div class="m"><label>${S('storeNo')}</label><b>${t.store} ${S('suffixStore')}</b></div>
      <div class="m"><label>${S('roleCol')}</label><b>${esc(tr(t.role))}</b></div>
      <div class="m"><label>${S('assignee')}</label><b>${esc(tr(t.assignee))}</b></div>
    </div></div>`;
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
  const head = `<div class="crumbs"><a href="#/home">${S('crumb_home')}</a> / <a href="#/tasks">${S('crumb_tasks')}</a> / ${S('crumb_create')}</div>
    <div class="page-h"><h1>${S('createTitle')}</h1></div>`;
  const checks = state.checks.map((v,i)=>`
    <div class="checkitem"><span style="color:var(--muted-2)">${i+1}.</span>
      <input type="text" value="${esc(v)}" placeholder="${S('checkPh')}" oninput="setCheck(${i}, this.value)">
      <button class="x" onclick="rmCheck(${i})">✕</button></div>`).join('');
  const body = `<div class="card form-card fade">
    <div class="field"><label>${S('taskType')}</label>
      <div class="seg"><button class="${state.taskKind==='task'?'active':''}" onclick="setKind('task')">${S('kindTask')}</button>
        <button class="${state.taskKind==='checklist'?'active':''}" onclick="setKind('checklist')">${S('kindCheck')}</button></div></div>
    <div class="field"><label>${S('taskName')}</label><input type="text" placeholder="${S('taskNamePh')}"></div>
    <div class="field"><label>${S('taskDesc')}</label><textarea placeholder="${S('taskDescPh')}"></textarea></div>
    ${state.taskKind==='checklist'?`<div class="field"><label>${S('checkItems')}</label>${checks}<button class="add-check" onclick="addCheck()">${S('addCheck')}</button></div>`:''}
    <div class="field"><label>${S('assigneeLbl')}</label>
      <select><option>${S('optDirector')}</option><option>${S('optAdmin')}</option><option>${S('optCascade')}</option></select></div>
    <div class="field"><label>${S('dueLbl')}</label><input type="text" value="05.09.2022"></div>
    <div class="field"><label>${S('attachments')}</label><div class="dropzone">${S('dropzone')}</div></div>
    <div class="btn-row"><button class="btn btn-primary" onclick="alert(SUBMIT_MSG)">${S('submit')}</button>
      <a href="#/tasks" class="btn btn-ghost" style="text-decoration:none">${S('cancel')}</a></div></div>`;
  return head + body;
}

/* ---------- SCRIPTS ---------- */
function viewScripts(){
  const head = `<div class="crumbs"><a href="#/home">${S('crumb_home')}</a> / ${S('crumb_scripts')}</div>
    <div class="page-h"><h1>${S('scriptsTitle')}</h1></div>
    <p style="color:var(--muted);max-width:820px;margin:-8px 0 18px">${S('scriptsIntro')}</p>`;
  const procColor = { sales:'#2f80ed', losses:'#e5392f', stock:'#8e5cd9', fresh:'#2e9e4f', people:'#f08c1e', service:'#0fb5ae', discipline:'#5b6b7b' };
  const legend = `<div class="legend">${PROCESS_TYPES.map(p=>`<span><i style="background:${procColor[p.key]}"></i>${tr(p.title)}</span>`).join('')}</div>`;
  const blocks = SCRIPT_BLOCKS.map(b=>`
    <div class="sblock proc-${b.proc}">
      <div class="sblock__h"><h3>${esc(tr(b.title))}</h3><div class="team">${esc(b.team)}</div></div>
      <div class="sblock__body"><ul>${b.scripts.map(s=>`<li><span>${esc(tr(s))}</span></li>`).join('')}</ul></div>
    </div>`).join('');
  return head + legend + `<div class="scripts-grid">${blocks}</div>`;
}

/* ---------- OP MODEL ---------- */
function viewOpModel(){
  const note = `<div class="note">⚠️ <div>${S('opmodelNote')}</div></div>`;
  const head = `<div class="crumbs"><a href="#/home">${S('crumb_home')}</a> / ${S('crumb_opmodel')}</div>
    <div class="page-h"><h1>${S('opmodelTitle')}</h1></div>`;
  const proc7 = `<h2 style="font-size:17px;margin:6px 0 14px">${S('sevenTitle')}</h2>
    <div class="proc7">${PROCESS_TYPES.map(p=>`<div class="proct"><div class="ic">${p.icon}</div><h4>${tr(p.title)}</h4><p>${tr(p.desc)}</p></div>`).join('')}</div>`;
  const probs = `<h2 style="font-size:17px;margin:24px 0 14px">${S('probTitle')}</h2>
    <div class="prob-grid">${PROBLEMS.map(p=>`<div class="prob"><div class="ic">${p.icon}</div><h3>${esc(tr(p.title))}</h3><p>${esc(tr(p.text))}</p></div>`).join('')}</div>`;
  const solve = `<div class="card" style="margin-top:24px;background:#eaf6ec;border-color:#cfe9d4">
    <h3 style="margin:0 0 8px;color:var(--brand-dark)">${S('solveTitle')}</h3>
    <p style="margin:0;color:var(--ink-soft);max-width:840px">${S('solveText')}</p>
    <a href="#/scripts" class="btn btn-primary" style="margin-top:14px;display:inline-block;text-decoration:none">${S('solveBtn')}</a></div>`;
  return note + head + proc7 + probs + solve;
}

/* ---------- HOME ---------- */
function viewHome(){
  const s = STORES[state.store];
  const open = TASKS.filter(t=>t.store===state.store && t.status!=='done').length;
  const parts = tr(s.director).split(' ');
  const nameForGreet = LANG==='en' ? parts[0] : (parts[1] || parts[0]);
  const devWord = LANG==='en' ? (open===1?'deviation':'deviations') : plural(open,'отклонение','отклонения','отклонений');
  const devTail = LANG==='en' ? ' that need attention.' : ', требующих внимания.';
  return `<div class="page-h"><h1>${S('greeting')}, ${esc(nameForGreet)} 👋</h1></div>
    <p style="color:var(--muted);margin:-10px 0 22px">${S('homeSummary1')} ${s.id}. ${S('homeSummary2a')} <b style="color:var(--neg)">${open}</b> ${devWord}${devTail}</p>
    <div class="kstrip">
      <div class="kpill"><div class="lab">${S('kRtoOn')} ${tr(s.date)}</div><div class="val">${money(s.kpi.rto.value)}</div><div class="dl up">${delta(s.kpi.rto.weekDelta)} ${S('wkPrev')}</div></div>
      <div class="kpill"><div class="lab">${S('kPlanDone')}</div><div class="val">${pctRaw(s.plan.pct)}</div><div class="dl">${S('kForecast')} ${pctRaw(s.plan.forecastPct)}</div></div>
      <div class="kpill"><div class="lab">${S('kLosses')}</div><div class="val" style="color:${s.losses.status==='bad'?'var(--neg)':'var(--pos)'}">${pctRaw(s.losses.pct)}</div><div class="dl">${S('norm')} ${pctRaw(s.losses.norm)}</div></div>
      <div class="kpill"><div class="lab">${S('kNps')}</div><div class="val">${s.nps.value}%</div><div class="dl">${S('currentPeriod')}</div></div>
      <div class="kpill"><div class="lab">${S('kOpen')}</div><div class="val">${open}</div><div class="dl">${S('byStore')} ${s.id}</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:18px">
      <div class="card"><div class="card__h"><h3>${S('prioTitle')}</h3><a href="#/tasks" class="link-clear" style="font-size:12px">${S('allTasks')}</a></div>
        <div class="devfeed">${TASKS.filter(t=>t.store===state.store && t.status!=='done').map(t=>`
          <div class="devrow" style="cursor:pointer" onclick="location.hash='#/tasks'">
            <span class="dt" style="background:${t.priority==='high'?'var(--neg)':t.priority==='med'?'var(--warn)':'var(--muted-2)'}"></span>
            <div class="tx">${esc(tr(t.title))}<small>${esc(tr(t.source))} · ${t.due}</small></div></div>`).join('')}</div></div>
      <div class="card"><div class="card__h"><h3>${S('trendTitle')}</h3><span class="i">i</span></div>
        ${sparkline(s.sparkRto, 'var(--brand)', 340, 110)}
        <p style="color:var(--muted);font-size:12.5px;margin-top:12px">${S('homeTrendText1')} <a href="#/analytics" style="color:var(--brand-dark);font-weight:700">${S('homeTrendAnalytics')}</a> ${S('homeTrendText2')} <a href="#/analytics" onclick="setTimeout(()=>setDash('alt'),50)" style="color:var(--brand-dark);font-weight:700">${S('homeTrendDash')}</a>${S('homeTrendText3')}</p></div>
    </div>`;
}

function viewStub(title, emoji){
  return `<div class="page-h"><h1>${title}</h1></div>
    <div class="card empty" style="padding:54px"><div style="font-size:34px;margin-bottom:10px">${emoji}</div>
    <p style="color:var(--muted)">${S('stubText')}</p></div>`;
}

/* ---------- drawer ---------- */
function openTask(id){ state.task=id; renderDrawer(); }
function closeTask(){ state.task=null; renderDrawer(); }
function renderDrawer(){
  const back=document.getElementById('drawerBack'), dr=document.getElementById('drawer');
  if(!state.task){ back.classList.remove('open'); dr.classList.remove('open'); return; }
  const t=TASKS.find(x=>x.id===state.task), st=TASK_STATUSES.find(x=>x.key===t.status);
  dr.innerHTML = `
    <div class="drawer__h"><div><div class="task__top"><span class="src">${esc(tr(t.source))}</span><span class="tid">${t.id}</span>
      ${t.cascaded?`<span class="tag-casc">⤵ ${S('cascaded')}</span>`:''}</div><h2>${esc(tr(t.title))}</h2></div>
      <button class="drawer__close" onclick="closeTask()">✕</button></div>
    <div class="drawer__body"><span class="st ${st.tone}">${tr(st.label)}</span>
      <div class="dl-list">
        <div class="r"><label>${S('due')}</label><b>${t.due}</b></div>
        <div class="r"><label>${S('fStore')}</label><b>${t.store} ${S('suffixStore')}</b></div>
        <div class="r"><label>${S('roleCol')}</label><b>${esc(tr(t.role))}</b></div>
        <div class="r"><label>${S('assignee')}</label><b>${esc(tr(t.assignee))}</b></div></div>
      <p style="color:var(--ink-soft);font-size:13.5px;line-height:1.55">${esc(tr(t.desc))}</p>
      <div class="script-tag" style="margin-top:18px"><small>${S('drwSource')}</small>${esc(tr(t.script))}</div>
      ${t.status!=='done'?`<div class="btn-row" style="margin-top:22px">
        <button class="btn btn-primary" onclick="closeTask()">${S('drwDone')}</button>
        <button class="btn btn-ghost" onclick="closeTask()">${S('drwClose')}</button></div>`:''}
    </div>`;
  back.classList.add('open'); dr.classList.add('open');
}

/* ---------- router ---------- */
let SUBMIT_MSG = '';
function render(){
  SUBMIT_MSG = S('submitted');
  renderShell();
  const route = currentRoute();
  const map = { home:viewHome, analytics:viewAnalytics, tasks:viewTasks, 'task-create':viewTaskCreate,
    scripts:viewScripts, opmodel:viewOpModel, techcard:()=>viewStub(S('techcard'),'📋'), faq:()=>viewStub(S('faq'),'❓') };
  document.getElementById('view').innerHTML = (map[route]||viewAnalytics)();
  window.scrollTo(0,0);
}

/* ---------- actions ---------- */
function setLang(l){ LANG=l; localStorage.setItem('asuz_lang',l); render(); if(state.task) renderDrawer(); }
function setStore(id){ state.store=id; render(); }
function setDash(v){ state.dashView=v; render(); }
function setATab(t){ state.analyticsTab=t; render(); }
function setActivity(a){ state.activity=a; render(); }
function toggleActivity(){ state.activity = state.activity==='done'?'active':'done'; render(); }
function addFilter(g,k){ state[g].has(k)?state[g].delete(k):state[g].add(k); render(); }
function rmFilter(g,k){ state[g].delete(k); render(); }
function clearFilters(){ state.fType.clear(); state.fStatus.clear(); render(); }
function setKind(k){ state.taskKind=k; render(); }
function setCheck(i,v){ state.checks[i]=v; }
function addCheck(){ state.checks.push(''); render(); }
function rmCheck(i){ state.checks.splice(i,1); if(!state.checks.length)state.checks=['']; render(); }
function toggleNav(){ document.querySelector('.app').classList.toggle('nav-open'); }

Object.assign(window,{ setLang,setStore,setDash,setATab,setActivity,toggleActivity,addFilter,rmFilter,
  clearFilters,setKind,setCheck,addCheck,rmCheck,openTask,closeTask,toggleNav });

window.addEventListener('hashchange', ()=>{ closeTask(); render(); });
document.addEventListener('DOMContentLoaded', render);
