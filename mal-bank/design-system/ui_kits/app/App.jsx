/* Mal mobile banking app — interactive click-through recreation.
   External Babel file: use globals, no import/export. */
const { AccountCard, TransactionRow, ChatBubble, Card, Button, IconButton, Badge, Tag, Icon, Input, Switch } = window.MalDesignSystem_097b20;

/* ---------- shared data ---------- */
const TXNS = [
  { icon: "credit-card", title: "Careem", subtitle: "Transport · Today", amount: "42.00", direction: "out", tag: "Halal" },
  { icon: "wallet", title: "Carrefour", subtitle: "Groceries · Today", amount: "218.40", direction: "out" },
  { icon: "arrow-down-left", title: "Salary — ADCB", subtitle: "Income · 1 Jul", amount: "12,000.00", direction: "in" },
  { icon: "sparkles", title: "Noon", subtitle: "Shopping · 30 Jun", amount: "89.00", direction: "out" },
  { icon: "map-pin", title: "Emirates", subtitle: "Travel · 28 Jun", amount: "1,240.00", direction: "out", tag: "Halal" },
];

/* ---------- Status bar ---------- */
function StatusBar({ dark }) {
  const c = dark ? "#fff" : "var(--ink-900)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px 4px", fontSize: 14, fontWeight: 600, color: c, fontFamily: "var(--font-sans)" }}>
      <span className="tnum">9:41</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width="18" height="12" viewBox="0 0 18 12" fill={c}><rect x="0" y="7" width="3" height="5" rx="1"/><rect x="4.5" y="4.5" width="3" height="7.5" rx="1"/><rect x="9" y="2" width="3" height="10" rx="1"/><rect x="13.5" y="0" width="3" height="12" rx="1"/></svg>
        <svg width="22" height="12" viewBox="0 0 22 12" fill="none"><rect x="0.5" y="0.5" width="18" height="11" rx="3" stroke={c} opacity="0.5"/><rect x="2" y="2" width="14" height="8" rx="1.5" fill={c}/><rect x="19.5" y="4" width="1.5" height="4" rx="0.75" fill={c}/></svg>
      </div>
    </div>
  );
}

/* ---------- Tab bar ---------- */
function TabBar({ active, onNav }) {
  const tabs = [ ["home", "Home"], ["trending-up", "Insights"], ["sparkles", "Ask Mal"], ["credit-card", "Card"], ["user", "Profile"] ];
  return (
    <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", padding: "10px 8px 22px", borderTop: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}>
      {tabs.map(([icon, label]) => {
        const on = active === label;
        return (
          <button key={label} onClick={() => onNav(label)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", color: on ? "var(--ink-900)" : "var(--text-muted)" }}>
            <Icon name={icon} size={22} strokeWidth={on ? 2 : 1.6} />
            <span style={{ fontSize: 10, fontWeight: on ? 600 : 500 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Home ---------- */
function Home({ onNav }) {
  const [hidden, setHidden] = React.useState(false);
  const actions = [ ["send", "Send"], ["arrow-down-left", "Request"], ["credit-card", "Pay"], ["plus", "Top up"] ];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0 16px" }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Assalamu alaikum</div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>Layla</div>
        </div>
        <IconButton aria-label="Notifications"><Icon name="bell" /></IconButton>
      </div>

      <AccountCard label="Available balance" currency="AED" amount="12,480.50" cardLast4="4417" hidden={hidden}
        footer={<button onClick={() => setHidden(h => !h)} style={{ border: "none", background: "var(--glass-fill)", borderRadius: "var(--radius-pill)", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Icon name={hidden ? "eye" : "eye-off"} size={18} /></button>} />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        {actions.map(([icon, label]) => (
          <button key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: "none", background: "none", cursor: "pointer", flex: 1 }}>
            <span style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xs)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={22} /></span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* AI nudge */}
      <div onClick={() => onNav("Ask Mal")} style={{ marginTop: 20, position: "relative", overflow: "hidden", borderRadius: "var(--radius-lg)", padding: 16, background: "var(--mesh-cool)", border: "1px solid var(--glass-border)", cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}>
        <div className="mal-grain" style={{ position: "absolute", inset: 0 }} />
        <span style={{ position: "relative", zIndex: 2, width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--glass-fill)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="sparkles" size={20} /></span>
        <div style={{ position: "relative", zIndex: 2, flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>You could save AED 320 this month</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-700)" }}>Ask Mal how →</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Recent activity</span>
        <a href="#" style={{ fontSize: 13 }}>See all</a>
      </div>
      <div>
        {TXNS.slice(0, 4).map((t, i) => (
          <TransactionRow key={i} icon={<Icon name={t.icon} />} title={t.title} subtitle={t.subtitle} amount={t.amount} direction={t.direction}
            badge={t.tag ? <Badge tone="iris" size="sm">{t.tag}</Badge> : null} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Ask Mal (chat) ---------- */
function AskMal() {
  const [msgs, setMsgs] = React.useState([
    { from: "assistant", text: "As-salamu alaykum, Layla. I'm Mal. Ask me to move money, plan a trip, or find halal options — I'll handle it." },
  ]);
  const [draft, setDraft] = React.useState("");
  const scroller = React.useRef(null);
  React.useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [msgs]);

  function send(text) {
    const t = text || draft;
    if (!t.trim()) return;
    setMsgs(m => [...m, { from: "user", text: t }]);
    setDraft("");
    setTimeout(() => {
      setMsgs(m => [...m, { from: "assistant", text: "Found 3 halal-friendly hotels in Istanbul under AED 600. Top pick: Sura Hagia Sophia — AED 540/night, fully refundable, 8-min walk to the Blue Mosque.", action: "Book AED 540" }]);
    }, 600);
  }
  const prompts = ["Find a halal hotel in Istanbul", "Split dinner with Omar", "How much did I spend on travel?"];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 12px" }}>
        <span style={{ width: 36, height: 36, borderRadius: "var(--radius-pill)", background: "var(--mesh-hero)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="sparkles" size={18} /></span>
        <div><div style={{ fontWeight: 600, fontSize: 15 }}>Ask Mal</div><div style={{ fontSize: 11.5, color: "var(--success-500)" }}>● Online</div></div>
      </div>
      <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {msgs.map((m, i) => (
          <ChatBubble key={i} from={m.from} actions={m.action ? <Button size="sm" variant="secondary" iconRight={<Icon name="arrow-right" size={16} />}>{m.action}</Button> : null}>
            {m.text}
          </ChatBubble>
        ))}
      </div>
      <div style={{ padding: "8px 14px", display: "flex", gap: 8, overflowX: "auto" }}>
        {prompts.map(p => <Tag key={p} onClick={() => send(p)}>{p}</Tag>)}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 14px 14px" }}>
        <div style={{ flex: 1 }}>
          <Input placeholder="Ask Mal anything…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") send(); }} />
        </div>
        <IconButton variant="primary" aria-label="Send" onClick={() => send()}><Icon name="send" /></IconButton>
      </div>
    </div>
  );
}

/* ---------- Card ---------- */
function CardScreen() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 20px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: "8px 0 16px" }}>Your card</h2>
      <AccountCard variant="ink" label="Mal Platinum" currency="AED" amount="12,480.50" cardName="LAYLA AL MANSOORI" />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Button variant="secondary" fullWidth iconLeft={<Icon name="eye" size={18} />}>Details</Button>
        <Button variant="secondary" fullWidth iconLeft={<Icon name="settings" size={18} />}>Freeze</Button>
      </div>
      <Card variant="default" padding="md" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontWeight: 600, fontSize: 15 }}>Halal spending only</div><div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Block non-compliant merchants</div></div>
          <Switch checked onChange={() => {}} />
        </div>
      </Card>
      <Card variant="default" padding="md" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div><div style={{ fontWeight: 600, fontSize: 15 }}>Round-up savings</div><div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>Save spare change automatically</div></div>
          <Switch checked onChange={() => {}} />
        </div>
      </Card>
    </div>
  );
}

/* ---------- Simple screens ---------- */
function Insights() {
  const cats = [ ["Travel", 1240, "iris"], ["Groceries", 640, "success"], ["Transport", 210, "warning"], ["Shopping", 380, "info"] ];
  const max = 1240;
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 20px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, margin: "8px 0 4px" }}>July insights</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>You've spent <b className="tnum" style={{ color: "var(--text-primary)" }}>AED 2,470</b> so far.</p>
      <Card variant="mesh" padding="lg" style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, color: "var(--ink-700)" }}>Projected savings</div>
        <div className="tnum" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em" }}>AED 320</div>
      </Card>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        {cats.map(([name, val, tone]) => (
          <div key={name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span>{name}</span><span className="tnum" style={{ color: "var(--text-secondary)" }}>AED {val}</span></div>
            <div style={{ height: 8, borderRadius: 4, background: "var(--surface-sunken)" }}><div style={{ width: (val / max * 100) + "%", height: "100%", borderRadius: 4, background: tone === "iris" ? "var(--iris-periwinkle)" : `var(--${tone}-500)` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Profile() {
  const rows = [ ["shield-check", "Security & Sharia settings"], ["credit-card", "Cards & accounts"], ["bell", "Notifications"], ["settings", "Preferences"] ];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0 20px" }}>
        <div style={{ width: 60, height: 60, borderRadius: "var(--radius-pill)", background: "var(--mesh-hero)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 22 }}>L</div>
        <div><div style={{ fontWeight: 600, fontSize: 18 }}>Layla Al Mansoori</div><div style={{ fontSize: 13, color: "var(--text-muted)" }}>layla@mal.ai</div></div>
      </div>
      <Card variant="default" padding="none">
        {rows.map(([icon, label], i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderTop: i ? "1px solid var(--border-subtle)" : "none", cursor: "pointer" }}>
            <Icon name={icon} size={20} color="var(--ink-700)" />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{label}</span>
            <Icon name="chevron-right" size={18} color="var(--text-muted)" />
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ---------- Login ---------- */
function Login({ onEnter }) {
  return (
    <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", background: "var(--mesh-hero)" }}>
      <div className="mal-grain" style={{ position: "absolute", inset: 0 }} />
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 28 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 600, letterSpacing: "-0.04em" }}>Mal</div>
        <p style={{ fontSize: 17, color: "var(--ink-800)", lineHeight: 1.4, margin: "12px 0 0", maxWidth: 260 }}>The future of finance is here. Your AI companion for everyday money.</p>
      </div>
      <div style={{ position: "relative", zIndex: 2, background: "var(--surface-card)", borderRadius: "28px 28px 0 0", padding: "26px 24px 30px", boxShadow: "0 -12px 40px rgba(14,14,16,0.12)" }}>
        <Button variant="primary" fullWidth size="lg" onClick={onEnter} iconRight={<Icon name="arrow-right" size={20} />}>Continue with Face ID</Button>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>New to Mal?<a href="#" onClick={(e) => { e.preventDefault(); onEnter(); }}>Join the waitlist</a></div>
      </div>
    </div>
  );
}

/* ---------- Shell ---------- */
function PhoneApp() {
  const [screen, setScreen] = React.useState("login");
  const [tab, setTab] = React.useState("Home");
  const dark = screen === "login";
  const body = screen === "login" ? <Login onEnter={() => setScreen("app")} />
    : tab === "Home" ? <Home onNav={setTab} />
    : tab === "Ask Mal" ? <AskMal />
    : tab === "Card" ? <CardScreen />
    : tab === "Insights" ? <Insights />
    : <Profile />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-page)", padding: 32, fontFamily: "var(--font-sans)" }}>
      <div style={{ width: 390, height: 800, borderRadius: 46, background: "#000", padding: 11, boxShadow: "var(--shadow-xl)" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 36, overflow: "hidden", background: dark ? "transparent" : "var(--surface-page)", display: "flex", flexDirection: "column" }}>
          <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 120, height: 30, background: "#000", borderRadius: 20, zIndex: 20 }} />
          <StatusBar dark={dark} />
          {body}
          {screen === "app" && <TabBar active={tab} onNav={setTab} />}
        </div>
      </div>
    </div>
  );
}
window.PhoneApp = PhoneApp;
