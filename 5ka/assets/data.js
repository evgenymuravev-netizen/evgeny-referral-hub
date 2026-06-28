/* =====================================================================
   ATMS · Prototype of the Pyaterochka store-management system
   Bilingual data layer. Every user-visible string is {ru, en}.
   Figures are taken from the attached screenshots of the live system.
   ===================================================================== */
;(function () {

/* ---- locale-aware formatters (decimal/grouping follow current language) */
const grp = (n, lang) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU').format(Math.round(n));
const FMT = {
  money:  (n, lang) => grp(n, lang) + ' ₽',
  num:    (n, lang) => grp(n, lang),
  pct:    (n, lang) => (n > 0 ? '+' : '') + n.toFixed(2)[lang === 'en' ? 'valueOf' : 'replace'] && (lang === 'en' ? (n>0?'+':'')+n.toFixed(2) : (n>0?'+':'')+n.toFixed(2).replace('.', ',')) + '%',
  pctRaw: (n, lang) => (lang === 'en' ? n.toFixed(2) : n.toFixed(2).replace('.', ',')) + '%',
};
/* clean pct (the above got clever; keep a simple correct version) */
FMT.pct = (n, lang) => (n > 0 ? '+' : '') + (lang === 'en' ? n.toFixed(2) : n.toFixed(2).replace('.', ',')) + '%';

/* bilingual literal helper for inline use in data */
const B = (ru, en) => ({ ru, en });

/* ------------------------------------------------------------------ */
/* STORES — analytics cards                                            */
/* ------------------------------------------------------------------ */
const STORES = {
  '22711': {
    id: '22711',
    name: B('Пятёрочка 22711', 'Pyaterochka 22711'),
    cluster: B('Кластер Поволжье', 'Volga cluster'),
    director: B('Ханифова Венера', 'Venera Khanifova'),
    role: B('Директор (основной)', 'Store director (primary)'),
    date: B('Ср (31.08.2022)', 'Wed (31 Aug 2022)'),
    month: B('август', 'August'),
    isNew: true,
    kpi: {
      rto:      { value: 128503, weekAgo: 110863, weekDelta: 15.91, yearAgo: 0, yearDelta: 100 },
      traffic:  { value: 446,    weekAgo: 402,    weekDelta: 10.95, yearAgo: 0, yearDelta: 100, unit: B('чеков','receipts') },
      avgCheck: { value: 288,    weekAgo: 275,    weekDelta: 4.73,  yearAgo: 0, yearDelta: 100 },
    },
    plan:   { pct: 103.58, actual: 3776514, monthPlan: 3645863, forecast: 3776514, forecastPct: 103.58 },
    csi:    { value: 64 },
    nps:    { value: 30 },
    losses: { pct: 9.18, norm: 4.84, money: 300590, status: 'bad',
              writeoff: { pct: 8.9, money: 291000 }, inventory: { pct: 0.28, money: 9590 } },
    lossesMip: { pct: 9.02, norm: 4.84, money: 612300,
                 writeoff: { pct: 8.8, money: 598000 }, inventory: { pct: 0.22, money: 14300 } },
    sparkRto: [96,104,99,112,108,118,110,128],
  },
  '18044': {
    id: '18044',
    name: B('Пятёрочка 18044', 'Pyaterochka 18044'),
    cluster: B('Кластер Юг', 'South cluster'),
    director: B('Смеловский Михаил', 'Mikhail Smelovsky'),
    role: B('Начальник отдела (основной) · 00926856', 'Department head (primary) · 00926856'),
    date: B('Чт (24.03.2022)', 'Thu (24 Mar 2022)'),
    month: B('март', 'March'),
    isNew: false,
    kpi: {
      rto:      { value: 476980, weekAgo: 438597, weekDelta: 8.75,  yearAgo: 396741, yearDelta: 20.22 },
      traffic:  { value: 836,    weekAgo: 793,    weekDelta: 5.42,  yearAgo: 842,    yearDelta: -0.71, unit: B('чеков','receipts') },
      avgCheck: { value: 570,    weekAgo: 553,    weekDelta: 3.07,  yearAgo: 471,    yearDelta: 21.02 },
    },
    plan:   { pct: 118.13, actual: 11158521, monthPlan: 13079999, forecast: 15723371, forecastPct: 120.21 },
    csi:    { value: 81 },
    nps:    { value: 47 },
    losses: { pct: 2.10, norm: 2.32, money: 221055, status: 'good',
              writeoff: { pct: 1.98, money: 208544 }, inventory: { pct: 0.12, money: 12511 } },
    lossesMip: { pct: 2.08, norm: 2.32, money: 425585,
                 writeoff: { pct: 2.06, money: 419759 }, inventory: { pct: 0.03, money: 5825 } },
    sparkRto: [420,432,440,455,438,460,468,477],
  },
};
const DEFAULT_STORE = '22711';

/* ------------------------------------------------------------------ */
/* PORTFOLIO — alternative dashboard (cluster ranking)                */
/* ------------------------------------------------------------------ */
const PORTFOLIO = [
  { id: '18044', name: B('Пятёрочка 18044','Pyaterochka 18044'), planPct: 118.1, losses: 2.10, nps: 47, openDev: 3,  trend: 'up',   rto: 476980 },
  { id: '21055', name: B('Пятёрочка 21055','Pyaterochka 21055'), planPct: 109.4, losses: 3.05, nps: 41, openDev: 6,  trend: 'up',   rto: 318200 },
  { id: '19870', name: B('Пятёрочка 19870','Pyaterochka 19870'), planPct: 101.2, losses: 4.10, nps: 38, openDev: 9,  trend: 'flat', rto: 254100 },
  { id: '22711', name: B('Пятёрочка 22711','Pyaterochka 22711'), planPct: 103.6, losses: 9.18, nps: 30, openDev: 14, trend: 'down', rto: 128503 },
  { id: '20336', name: B('Пятёрочка 20336','Pyaterochka 20336'), planPct: 94.7,  losses: 6.40, nps: 33, openDev: 11, trend: 'down', rto: 142600 },
  { id: '23190', name: B('Пятёрочка 23190','Pyaterochka 23190'), planPct: 88.3,  losses: 7.85, nps: 28, openDev: 18, trend: 'down', rto: 117400 },
];

/* ------------------------------------------------------------------ */
/* TASKS / DEVIATIONS                                                  */
/* ------------------------------------------------------------------ */
const TASK_TYPES = [
  { key: 'general',  label: B('Общее','General'),        count: 13 },
  { key: 'losses',   label: B('Потери','Losses'),        count: 79 },
  { key: 'manual',   label: B('Ручная задача','Manual task'), count: 1 },
  { key: 'info',     label: B('Инфоцентр','Info center'),count: 171 },
  { key: 'staff',    label: B('Персонал','Staff'),       count: 10 },
  { key: 'sales',    label: B('Продажи','Sales'),        count: 104 },
  { key: 'survey',   label: B('Опрос','Survey'),         count: 3 },
];
const TASK_STATUSES = [
  { key: 'done',    label: B('Выполнена','Done'),        tone: 'done' },
  { key: 'notdone', label: B('Не выполнена','Not done'), tone: 'open' },
  { key: 'revoked', label: B('Отозвана','Revoked'),      tone: 'muted' },
  { key: 'overdue', label: B('Просрочена','Overdue'),    tone: 'bad' },
];

const TASKS = [
  { id: '17109643', source: B('ИНФОЦЕНТР','INFO CENTER'), type: 'info', status: 'done',
    title: B('ИП № ЦО-332 от 31.08.2022 — Об оформлении коммерческих Акций в категории Напитки',
            'IP No. CO-332 dated 31.08.2022 — Merchandising of commercial promotions in the Beverages category'),
    due: '02.09.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false,
    desc: B('Обеспечить оформление коммерческих акций в категории «Напитки» согласно стандарту мерчандайзинга. Проверить наличие POSM, корректность ценников, выкладку промо-зоны.',
            'Merchandise the commercial promotions in the "Beverages" category per the standard. Check POSM presence, price-tag accuracy, and promo-zone layout.'),
    script: B('Качество подготовки к промо · Проверка смены ценников в день старта промо',
              'Promo readiness quality · Price-tag change check on promo launch day') },
  { id: '17085905', source: B('ИНФОЦЕНТР','INFO CENTER'), type: 'info', status: 'done',
    title: B('ИП № ЦО-333 от 31.08.2022 — Об обновлении POSm по программе «Обратная связь»',
            'IP No. CO-333 dated 31.08.2022 — Updating POSM for the "Feedback" program'),
    due: '25.09.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false,
    desc: B('Заменить POSM-материалы программы «Обратная связь» на входной группе и в прикассовой зоне.',
            'Replace the "Feedback" program POSM materials at the entrance and the checkout zone.'),
    script: B('NPS · Низкая оценка вежливости персонала','NPS · Low staff-politeness score') },
  { id: '17094160', source: B('ИНФОЦЕНТР','INFO CENTER'), type: 'info', status: 'done',
    title: B('ИП № ЦО-334 от 31.08.2022 — Об инвентаризации банковских терминалов при проведении ПИ',
            'IP No. CO-334 dated 31.08.2022 — Auditing bank terminals during the periodic stocktake'),
    due: '05.09.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false,
    desc: B('Провести сверку банковских терминалов в ходе плановой инвентаризации. Зафиксировать серийные номера, проверить работоспособность.',
            'Reconcile bank terminals during the scheduled stocktake. Record serial numbers and verify they are operational.'),
    script: B('Сервис расчёта · Контроль оборудования касс','Checkout service · Checkout equipment control') },
  { id: '17069489', source: B('ПРОДАЖИ','SALES'), type: 'sales', status: 'done',
    title: B('Виртуальный остаток по ФРОВ','Virtual stock in Produce (FV)'),
    due: '06.09.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: true,
    desc: B('Скрипт зафиксировал виртуальный остаток по группе ФРОВ: товар числится в системе, но отсутствует на полке. Провести пересчёт, отработать отрицательные/виртуальные остатки.',
            'The script flagged virtual stock in the Produce (FV) group: the item shows in the system but is missing from the shelf. Recount and clear negative/virtual stock.'),
    script: B('Корректность остатков · Наличие виртуальных остатков','Stock accuracy · Presence of virtual stock') },
  { id: '16931229', source: B('ИНФОЦЕНТР','INFO CENTER'), type: 'info', status: 'done',
    title: B('ИП № ЦО-331 от 29.08.2022 — Об изменении в логике проведения сезонных Промо, о старте Сезонного Промо № 09',
            'IP No. CO-331 dated 29.08.2022 — Change to seasonal-promo logic and launch of Seasonal Promo No. 09'),
    due: '03.09.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false,
    desc: B('Ознакомиться с новой логикой сезонных промо. Обеспечить старт Сезонного Промо № 09: выкладка, ценники, остатки промо-ассортимента.',
            'Review the new seasonal-promo logic. Launch Seasonal Promo No. 09: layout, price tags, and promo-assortment stock.'),
    script: B('Качество подготовки к промо · Доля проданного ассортимента в день старта','Promo readiness quality · Share of assortment sold on launch day') },

  /* Active deviations (raised by ATMS scripts) */
  { id: '17120884', source: B('ПОТЕРИ','LOSSES'), type: 'losses', status: 'notdone',
    title: B('Критическое отклонение от плана потерь (ТОП-10)','Critical deviation from the loss plan (Top-10)'),
    due: '30.08.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false, priority: 'high',
    desc: B('Потери магазина 9,18% при нормативе 4,84%. Магазин в ТОП-10 кластера по отклонению. Разобрать ТОП-позиции списаний, проверить выкладку и ротацию, провести ЛИ по проблемным группам.',
            'Store losses are 9.18% against a 4.84% target. The store is in the cluster Top-10 by deviation. Review top write-off items, check layout and rotation, and run a cycle count on the problem groups.'),
    script: B('Снижение потерь · Критическое отклонение от плана потерь (ТОП-10)','Loss reduction · Critical deviation from the loss plan (Top-10)') },
  { id: '17120991', source: B('ПОТЕРИ','LOSSES'), type: 'losses', status: 'notdone',
    title: B('Повышенные списания по группе ФРОВ','Elevated write-offs in Produce (FV)'),
    due: '29.08.2022', store: '22711', role: B('Администратор','Shift manager'), assignee: B('Гафуров Тимур','Timur Gafurov'), cascaded: true, priority: 'high',
    desc: B('Списания по ФРОВ превышают средний уровень по лиге РТО. Разобрать позиции с % списания выше среднего, отработать заказ и приёмку.',
            'Produce (FV) write-offs exceed the turnover-league average. Review items with above-average write-off %, and fix ordering and goods receipt.'),
    script: B('Снижение потерь · Разбор позиций ФРОВ с % списания выше маг. в лиге РТО','Loss reduction · Review of Produce items with write-off % above peers in the turnover league') },
  { id: '17121340', source: B('ПРОДАЖИ','SALES'), type: 'sales', status: 'notdone',
    title: B('Низкая доступность матрицы магазина','Low store assortment availability'),
    due: '01.09.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false, priority: 'med',
    desc: B('Доступность матрицы ниже норматива. Выполнить задания по проверке доступности, оформить дозаказ по отсутствующим ПЛЮ.',
            'Assortment availability is below target. Complete the availability-check tasks and reorder the missing PLUs.'),
    script: B('Доступность матрицы / пополнение · Не выполненные задания по проверке доступности','Assortment availability / replenishment · Outstanding availability-check tasks') },
  { id: '17121002', source: B('ПЕРСОНАЛ','STAFF'), type: 'staff', status: 'overdue',
    title: B('Низкая комплектность персонала','Low staff headcount'),
    due: '26.08.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false, priority: 'high',
    desc: B('Комплектность штата ниже нормы, открыты вакансии. Подать заявки на подбор, перераспределить графики, обеспечить адаптацию новичков.',
            'Headcount is below norm with open vacancies. Submit hiring requests, rebalance schedules, and onboard new hires.'),
    script: B('Персонал · Большое количество открытых вакансий','Staffing · High number of open vacancies') },
  { id: '17118770', source: B('ПРОДАЖИ','SALES'), type: 'sales', status: 'notdone',
    title: B('Снижение продаж по выпечке','Decline in bakery sales'),
    due: '31.08.2022', store: '22711', role: B('Администратор','Shift manager'), assignee: B('Гафуров Тимур','Timur Gafurov'), cascaded: true, priority: 'med',
    desc: B('Продажи выпечки ниже расчётного плана. Проверить отсутствие продаж ТОП-30, наличие в часы-пик, укомплектованность пекарей.',
            'Bakery sales are below the calculated plan. Check for zero-sales Top-30 items, peak-hour availability, and baker staffing.'),
    script: B('Выпечка · Снижение продаж по выпечке','Bakery · Decline in bakery sales') },
  { id: '17117450', source: B('ОПРОС','SURVEY'), type: 'survey', status: 'notdone',
    title: B('Низкая оценка по удобству ценников (NPS)','Low price-tag clarity score (NPS)'),
    due: '04.09.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false, priority: 'low',
    desc: B('По итогам опроса покупателей низкая оценка удобства ценников. Проверить корректность и читаемость ценников в торговом зале.',
            'Customer survey shows a low price-tag clarity score. Check price-tag accuracy and legibility across the sales floor.'),
    script: B('NPS · Низкая оценка по удобству ценников','NPS · Low price-tag clarity score') },
  { id: '17112201', source: B('ОБЩЕЕ','GENERAL'), type: 'general', status: 'done',
    title: B('Тех.карта ДМ — еженедельный обход','Store-manager tech card — weekly walk'),
    due: '28.08.2022', store: '22711', role: B('Директор','Store director'), assignee: B('Ханифова Венера','Venera Khanifova'), cascaded: false,
    desc: B('Выполнить еженедельный обход по тех.карте директора магазина. Зафиксировать результат по чек-листу.',
            'Complete the weekly store-manager tech-card walk. Record results against the checklist.'),
    script: B('Регулярные процессы ДМ/СПВ · Тех.карта ДМ','Regular store-manager processes · Store-manager tech card') },
  { id: '17109010', source: B('ПОТЕРИ','LOSSES'), type: 'losses', status: 'done',
    title: B('Отработка отрицательных остатков','Clearing negative stock'),
    due: '27.08.2022', store: '22711', role: B('Администратор','Shift manager'), assignee: B('Гафуров Тимур','Timur Gafurov'), cascaded: true,
    desc: B('Зафиксированы отрицательные остатки. Провести локальную инвентаризацию, привести остатки в соответствие.',
            'Negative stock was flagged. Run a cycle count and reconcile stock balances.'),
    script: B('Корректность остатков · Отработка отрицательных остатков','Stock accuracy · Clearing negative stock') },
];

/* ------------------------------------------------------------------ */
/* ATMS — SCRIPT BLOCKS                                                */
/* ------------------------------------------------------------------ */
const SCRIPT_BLOCKS = [
  { key: 'promo', title: B('Качество подготовки к промо','Promo readiness quality'), team: 'Gorshkova G.', proc: 'sales', scripts: [
    B('Отсутствие продаж хаммеров','No sales of hammer (hero) items'),
    B('Низкие продажи промо с касс','Low promo sales at checkout'),
    B('Доля проданного ассортимента промо в день старта промо','Share of promo assortment sold on launch day'),
    B('Проверка смены ценников через верификацию цен в день старта промо','Price-tag change verified via price check on promo launch day'),
    B('Время допуска цен до касс','Time to push prices to checkouts'),
    B('Доля ПЛЮ регулярного / сезонного промо с остатком > 0 и продажами «0»','Share of regular/seasonal promo PLUs with stock > 0 and zero sales'),
    B('«0» продажи по товарам с механикой 1+1 с остатком больше нуля','Zero sales on 1+1-mechanic items with stock above zero'),
  ]},
  { key: 'checkout', title: B('Сервис расчёта (кассы / КСО)','Checkout service (POS / self-checkout)'), team: 'Nikolaeva E.', proc: 'service', scripts: [
    B('Большое количество ошибок на кассе','High number of checkout errors'),
    B('Медленная скорость работы кассиров','Slow cashier throughput'),
    B('Недостаточное количество касс','Insufficient number of checkouts'),
    B('Низкий кассовый уровень сервиса','Low checkout service level'),
    B('Низкая доля КСО','Low self-checkout (SCO) share'),
    B('Нехватка КСО','Shortage of self-checkouts'),
    B('Неэффективное использование КСО','Inefficient self-checkout usage'),
  ]},
  { key: 'losses', title: B('Снижение потерь','Loss reduction'), team: 'Shulgin I.; Vlasov A.', proc: 'losses', scripts: [
    B('Повышенные списания по группам товаров','Elevated write-offs by product group'),
    B('Проблемы с выкладкой и ротацией товара','Layout and product-rotation issues'),
    B('Критическое отклонение от плана потерь (ТОП-10)','Critical deviation from the loss plan (Top-10)'),
    B('Повышенные списания по группе ФРОВ','Elevated write-offs in Produce (FV)'),
    B('Повышенные списания УИ2 по итогам ПИ','Elevated UI2 write-offs after the stocktake'),
    B('Разбор позиций ФРОВ с % списания выше маг. в лиге РТО','Review of Produce items with write-off % above peers in the turnover league'),
    B('Повышенные списания по группе ХБИ','Elevated write-offs in bakery products'),
  ]},
  { key: 'staff', title: B('Персонал (текучесть / комплектность)','Staffing (turnover / headcount)'), team: 'Nikolenko O.', proc: 'people', scripts: [
    B('Текучесть персонала','Staff turnover'),
    B('Большое количество открытых вакансий','High number of open vacancies'),
    B('Низкая комплектность персонала','Low staff headcount'),
    B('Кризисный магазин','Crisis store'),
    B('Адаптация новичков','New-hire onboarding'),
  ]},
  { key: 'stock', title: B('Корректность остатков','Stock accuracy'), team: 'Pilyugina M.; Dmitrienko G.', proc: 'stock', scripts: [
    B('Нерегулярность списаний','Irregular write-offs'),
    B('Некачественное проведение ЛИ','Poorly executed cycle counts'),
    B('Несоблюдение графика ЛИ','Cycle-count schedule not followed'),
    B('Отработка отрицательных остатков','Clearing negative stock'),
    B('Наличие виртуальных остатков','Presence of virtual stock'),
    B('Всплеск потерь перед ПИ','Loss spike before the stocktake'),
  ]},
  { key: 'price', title: B('Корректность ценников','Price-tag accuracy'), team: 'Sabirov D.', proc: 'service', scripts: [
    B('Продажи по цене ниже ценника','Sales below the shelf price'),
    B('Обращения на горячую линию по ценникам','Hotline complaints about price tags'),
    B('На остатках присутствуют товары с нулевой ценой','Items with zero price in stock'),
    B('Нерегулярные списания ФРЕШ','Irregular fresh write-offs'),
  ]},
  { key: 'fresh', title: B('Качество / Свежесть','Quality / Freshness'), team: 'Aleksandrova E.', proc: 'fresh', scripts: [
    B('Свежесть: отрицательные остатки ФРОВ','Freshness: negative Produce (FV) stock'),
    B('Свежесть: нерегулярные списания ФРОВ','Freshness: irregular Produce (FV) write-offs'),
    B('Свежесть: отсутствие ЛИ по ФРОВ','Freshness: no cycle counts for Produce (FV)'),
    B('Свежесть: отсутствие ЛИ по непродам','Freshness: no cycle counts for non-food'),
    B('Свежесть: нерегулярные списания ФРЕШ','Freshness: irregular fresh write-offs'),
  ]},
  { key: 'inventory', title: B('Товарный запас','Inventory level'), team: 'Kuznetsov A.', proc: 'stock', scripts: [
    B('Избыточный ТЗ, приводящий к потерям','Excess stock leading to losses'),
    B('Превышенный ТЗ по ФРЕШ / ФРОВ','Excess stock in Fresh / Produce (FV)'),
    B('Отклонение по ТЗ от норматива согласно лиг РТО','Stock-level deviation from target by turnover league'),
    B('Превышение ёмкости полочного пространства','Shelf-capacity overflow'),
    B('Доля товаров Ag.St на остатках','Share of Ag.St items in stock'),
  ]},
  { key: 'category', title: B('Продажи по категориям / СТМ','Category & private-label sales'), team: 'Kazakov O.', proc: 'sales', scripts: [
    B('Низкий УА при высокой доле продаж','Low availability rate despite high sales share'),
    B('Низкая доля продаж СТМ','Low private-label sales share'),
    B('Продажи товаров высокого ценового сегмента в магазинах с высоким РТО','Premium-segment sales in high-turnover stores'),
    B('% распродажи ниже среднего по лиге РТО','Sell-through % below the turnover-league average'),
  ]},
  { key: 'availability', title: B('Доступность матрицы / пополнение','Assortment availability / replenishment'), team: 'Pilyugina M.; Dmitrienko G.', proc: 'stock', scripts: [
    B('Не выполненные задания по проверке доступности','Outstanding availability-check tasks'),
    B('Низкая доступность матрицы магазина','Low store assortment availability'),
  ]},
  { key: 'regular', title: B('Регулярные процессы ДМ / СПВ','Regular store-manager / SPV processes'), team: 'Shulgin I.; Shmuratkin R.', proc: 'discipline', scripts: [
    B('Тех.карта ДМ','Store-manager tech card'),
    B('ЧЛ СПВ / НОП / ДК','Checklists: SPV / NOP / DK'),
    B('Задачи по кризисному магазину','Crisis-store tasks'),
    B('Задачи по доступности матрицы','Assortment-availability tasks'),
  ]},
  { key: 'nps', title: B('NPS','NPS'), team: 'Glushko I.', proc: 'service', scripts: [
    B('Своевременное открытие / закрытие магазина','On-time store opening / closing'),
    B('Низкая оценка по удобству ценников','Low price-tag clarity score'),
    B('Низкая оценка по удобству касс','Low checkout convenience score'),
    B('Низкая оценка вежливости персонала','Low staff-politeness score'),
    B('Низкая оценка свежести и качества товара','Low product freshness & quality score'),
    B('Низкая оценка от «Шпионского клуба»','Low mystery-shopper score'),
  ]},
  { key: 'bakery', title: B('Выпечка','Bakery'), team: 'Glushko I.; Mirobyan V.', proc: 'sales', scripts: [
    B('Снижение продаж по выпечке','Decline in bakery sales'),
    B('Низкая укомплектованность штата пекарей','Low baker staffing'),
    B('Отсутствие продаж ТОП-30 по выпечке','Zero sales of bakery Top-30'),
    B('Отсутствие продаж ТОП-5 по выпечке в часы-пик','Zero sales of bakery Top-5 during peak hours'),
    B('Низкая оценка от расчётного плана продаж','Below the calculated sales plan'),
  ]},
  { key: 'other', title: B('Прочее','Other'), team: 'Kazakov O.', proc: 'discipline', scripts: [
    B('Отклонение от мотивационного плана более −3%','Deviation from the bonus plan beyond −3%'),
    B('5post: своевременная приёмка посылок','5Post: timely parcel intake'),
    B('5post: своевременное изъятие посылок','5Post: timely parcel removal'),
    B('5post: своевременная отгрузка посылок','5Post: timely parcel dispatch'),
    B('Выполнение норматива по сдаче вторсырья','Meeting the recyclables-handover target'),
    B('Экспресс-доставка','Express delivery'),
    B('Инфо.потоки','Info flows'),
  ]},
];

/* ------------------------------------------------------------------ */
/* SEVEN PROCESS TYPES + key operating-model problems                 */
/* (reconstructed from the brief and script blocks)                   */
/* ------------------------------------------------------------------ */
const PROCESS_TYPES = [
  { key: 'sales',      icon: '📈', title: B('Продажи и выручка','Sales & revenue'),        desc: B('РТО, трафик, средний чек, промо, СТМ, выпечка.','Turnover, traffic, average basket, promo, private label, bakery.') },
  { key: 'losses',     icon: '📉', title: B('Потери и списания','Losses & write-offs'),    desc: B('Списания, инвентаризации, отклонение от плана потерь.','Write-offs, stocktakes, deviation from the loss plan.') },
  { key: 'stock',      icon: '📦', title: B('Товарный запас и остатки','Inventory & stock'), desc: B('Доступность матрицы, корректность остатков, пополнение.','Assortment availability, stock accuracy, replenishment.') },
  { key: 'fresh',      icon: '🥬', title: B('Свежесть и качество','Freshness & quality'),  desc: B('ФРОВ, ФРЕШ, ротация, ЛИ по свежести.','Produce, fresh, rotation, freshness cycle counts.') },
  { key: 'people',     icon: '👥', title: B('Персонал','People'),                          desc: B('Комплектность, текучесть, адаптация, кризисный магазин.','Headcount, turnover, onboarding, crisis store.') },
  { key: 'service',    icon: '🛎️', title: B('Сервис и NPS','Service & NPS'),              desc: B('Кассы, КСО, ценники, NPS, вежливость, удобство.','Checkouts, SCO, price tags, NPS, politeness, convenience.') },
  { key: 'discipline', icon: '✅', title: B('Дисциплина исполнения','Execution discipline'), desc: B('Тех.карты, инфопотоки, 5post, регулярные процессы.','Tech cards, info flows, 5Post, regular processes.') },
];

const PROBLEMS = [
  { icon: '🌊', title: B('Информационная перегрузка','Information overload'),
    text: B('Десятки информационных писем из инфоцентра в день. Директор физически не успевает прочитать, отфильтровать и расставить приоритеты.',
            'Dozens of info-center messages a day. The store director physically cannot read, filter and prioritize them all.') },
  { icon: '🎯', title: B('Нет приоритизации','No prioritization'),
    text: B('Сотни метрик по магазину, но непонятно, какое из отклонений критично именно сегодня и даст наибольший эффект на РТО и потери.',
            'Hundreds of store metrics, but it is unclear which deviation matters most today and will move turnover and losses the most.') },
  { icon: '🧮', title: B('Ручной сбор данных','Manual data gathering'),
    text: B('Чтобы понять, что не так, директор вручную сводит данные из 5+ разных систем. Анализ занимает часы вместо минут.',
            'To see what is wrong, the director manually pulls data from 5+ systems. Analysis takes hours instead of minutes.') },
  { icon: '⏰', title: B('Реактивность','Reactivity'),
    text: B('Проблемы вскрываются постфактум — на инвентаризации или при разборе потерь, когда деньги уже потеряны.',
            'Problems surface after the fact — at stocktake or loss review — once the money is already gone.') },
  { icon: '🔀', title: B('Каскад без контекста','Cascade without context'),
    text: B('Задачи каскадируются сверху вниз без привязки к фактическому состоянию конкретного магазина и без объяснения «зачем».',
            'Tasks cascade top-down with no link to the actual state of a specific store and no explanation of "why".') },
  { icon: '🔗', title: B('Разрыв «задача → эффект»','Broken "task → impact" link'),
    text: B('Нет связи между выполненной задачей и измеримым бизнес-результатом. Непонятно, что реально влияет на показатели.',
            'No link between a completed task and a measurable business result. It is unclear what actually moves the metrics.') },
];

const MONEYBALL_STAGES = [
  { n: '1', title: B('Гипотеза','Hypothesis'), text: B('Эффективность магазина определяется не интуицией директора, а набором измеримых отклонений. Найди отклонение — найдёшь точку роста.',
            'Store performance is defined not by the director\'s intuition but by a set of measurable deviations. Find the deviation, find the growth lever.') },
  { n: '2', title: B('Данные','Data'), text: B('Свели данные продаж, потерь, остатков, персонала и NPS по всей сети в единое хранилище — основу для скриптов.',
            'We pooled sales, losses, stock, staffing and NPS data across the whole network into one store — the basis for the scripts.') },
  { n: '3', title: B('Скрипты','Scripts'), text: B('Построили 70+ скриптов-детекторов в 14 блоках. Каждый ищет конкретное отклонение и оценивает его влияние на РТО/потери.',
            'We built 70+ detector scripts across 14 blocks. Each finds a specific deviation and estimates its impact on turnover/losses.') },
  { n: '4', title: B('Задачи','Tasks'), text: B('Отклонение автоматически превращается в задачу директору — с описанием, сроком и понятным «что сделать».',
            'A deviation automatically becomes a task for the director — with a description, a due date and a clear "what to do".') },
  { n: '5', title: B('Эффект','Impact'), text: B('Замыкаем контур: выполнил задачу → видишь, как изменился показатель. Система учится, какие действия дают результат.',
            'We close the loop: complete the task → see the metric move. The system learns which actions deliver results.') },
];

window.DB = { B, FMT, STORES, DEFAULT_STORE, PORTFOLIO, TASK_TYPES, TASK_STATUSES, TASKS,
              SCRIPT_BLOCKS, PROCESS_TYPES, PROBLEMS, MONEYBALL_STAGES };

})();
