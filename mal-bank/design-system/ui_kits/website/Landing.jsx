const { GradientMesh, Icon, Button, Card, Input } = window.MalDesignSystem_097b20;

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */
function Nav() {
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px clamp(20px, 5vw, 48px)",
      background: "rgba(247,247,249,0.72)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.04em" }}>Mal</span>
      <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <a href="#contact" style={{ fontSize: 15, color: "var(--text-secondary)" }}>Contact Us</a>
        <a href="#" style={{ fontSize: 15, color: "var(--text-secondary)" }}>Career</a>
        <Button variant="primary" size="sm">Join Waitlist</Button>
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero({ onJoin }) {
  const [email, setEmail] = React.useState("");
  const [joined, setJoined] = React.useState(false);
  return (
    <section style={{ padding: "clamp(48px,8vw,96px) clamp(20px,5vw,48px) 0", maxWidth: 1120, margin: "0 auto", textAlign: "center" }}>
      <span className="overline" style={{ color: "var(--text-muted)" }}>AI-native · Islamic · Digital finance</span>
      <h1 style={{
        fontFamily: "var(--font-display)", fontWeight: 600,
        fontSize: "clamp(3rem, 7vw, 5.25rem)", lineHeight: 1.02, letterSpacing: "-0.035em",
        margin: "18px auto 0", maxWidth: 900,
      }}>
        The future of finance is here.
      </h1>
      <p style={{ fontSize: "clamp(1.05rem,2vw,1.25rem)", color: "var(--text-secondary)", lineHeight: 1.55, maxWidth: 640, margin: "22px auto 0" }}>
        The first AI-native Islamic digital financial platform. Your digital companion for everyday choices, from travel to transactions. It finds value where others miss it, helping you do more with less effort.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); if (email) { setJoined(true); onJoin && onJoin(email); } }}
        style={{ display: "flex", gap: 10, justifyContent: "center", maxWidth: 460, margin: "32px auto 0", flexWrap: "wrap" }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <Input placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} iconLeft={<Icon name="user" size={18} />} />
        </div>
        <Button type="submit" variant="primary" iconRight={<Icon name="arrow-right" size={18} />}>
          {joined ? "You're in" : "Get Early Access"}
        </Button>
      </form>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 14 }}>
        {joined ? "Thanks — we'll be in touch." : "Be amongst the first to get Exclusive Early Access to our app."}
      </p>

      {/* Hero visual — signature mesh sheet */}
      <GradientMesh variant="hero" radius="var(--radius-2xl)" style={{ height: "clamp(280px, 42vw, 460px)", marginTop: 48, boxShadow: "var(--shadow-xl)", border: "1px solid var(--glass-border)" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            padding: "12px 20px", borderRadius: "var(--radius-pill)",
            background: "var(--glass-fill)", border: "1px solid var(--glass-border)",
            backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "var(--shadow-md)",
          }}>
            <Icon name="sparkles" size={20} />
            <span style={{ fontWeight: 500 }}>Ask Mal anything — from travel to transactions</span>
          </div>
        </div>
      </GradientMesh>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 14 }}>Mal is a technology company and not a bank.</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Feature row                                                         */
/* ------------------------------------------------------------------ */
const FEATURES = [
  { icon: "sparkles", variant: "cool", title: "Smarter Journeys, Powered by AI", body: "Your digital companion for everyday choices, from travel to transactions. It finds value where others miss it, helping you do more with less effort." },
  { icon: "credit-card", variant: "warm", title: "An Intelligent Financial Layer", body: "Built for how you move, spend, and connect. Quietly powerful systems designed to make your financial needs feel seamless." },
  { icon: "message", variant: "hero", title: "Conversations That Create Action", body: "Ask. Act. Done. A new kind of AI that turns everyday requests into real results, instantly." },
];

function Features() {
  return (
    <section style={{ padding: "clamp(64px,10vw,120px) clamp(20px,5vw,48px)", maxWidth: 1120, margin: "0 auto" }}>
      <p style={{ fontSize: "clamp(1.25rem,2.4vw,1.6rem)", color: "var(--text-primary)", maxWidth: 720, lineHeight: 1.4, fontWeight: 500, letterSpacing: "-0.01em" }}>
        A new kind of digital platform built for how you live, earn, and grow — where AI understands your goals, anticipates your needs, and helps you move through your financial world, all at the click of a button.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 48 }}>
        {FEATURES.map((f) => (
          <Card key={f.title} variant="default" padding="none" interactive style={{ overflow: "hidden" }}>
            <GradientMesh variant={f.variant} radius="0" style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "var(--radius-md)", background: "var(--glass-fill)", border: "1px solid var(--glass-border)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={f.icon} size={26} />
              </div>
            </GradientMesh>
            <div style={{ padding: "var(--space-6)" }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}>{f.title}</h3>
              <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.55 }}>{f.body}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */
const VALUES = [
  { icon: "shield-check", title: "Act with Integrity", body: "Trust guides everything we do. From how we design to how we decide, every action reflects our belief that technology should serve with honesty, empathy, and respect." },
  { icon: "crown", title: "Empower the Many", body: "We build for access, not advantage. Our goal is to make intelligent tools that open doors, helping people move, grow, and thrive in a fairer digital world." },
];

function Values() {
  return (
    <section style={{ padding: "clamp(48px,8vw,96px) clamp(20px,5vw,48px)", background: "var(--surface-card)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <h2 style={{ fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 600, letterSpacing: "-0.025em", maxWidth: 620 }}>Our values and culture</h2>
        <p style={{ marginTop: 16, fontSize: 17, color: "var(--text-secondary)", maxWidth: 620, lineHeight: 1.6 }}>
          The way we build defines who we are. Transparent, ethical, and built around people. We believe progress means nothing if it leaves the people behind.
        </p>
        <div style={{ marginTop: 20 }}><Button variant="secondary" iconRight={<Icon name="arrow-up-right" size={18} />}>Join Us</Button></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 20, marginTop: 40 }}>
          {VALUES.map((v) => (
            <div key={v.title} style={{ position: "relative", overflow: "hidden", borderRadius: "var(--radius-xl)", minHeight: 260, padding: 32, display: "flex", flexDirection: "column", justifyContent: "flex-end", border: "1px solid var(--glass-border)", background: "var(--mesh-cool)" }}>
              <div className="mal-grain" style={{ position: "absolute", inset: 0 }} />
              <div style={{ position: "relative", zIndex: 2, width: 48, height: 48, borderRadius: "var(--radius-md)", background: "var(--glass-fill)", border: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "auto" }}>
                <Icon name={v.icon} size={24} />
              </div>
              <h3 style={{ position: "relative", zIndex: 2, fontSize: 22, fontWeight: 600, marginTop: 20 }}>{v.title}</h3>
              <p style={{ position: "relative", zIndex: 2, marginTop: 8, color: "var(--ink-700)", fontSize: 15, lineHeight: 1.55, maxWidth: 420 }}>{v.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Contact + Footer                                                    */
/* ------------------------------------------------------------------ */
function Contact() {
  return (
    <section id="contact" style={{ padding: "clamp(48px,8vw,96px) clamp(20px,5vw,48px)", maxWidth: 1120, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 40, alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "clamp(1.75rem,3.5vw,2.5rem)", fontWeight: 600, letterSpacing: "-0.025em" }}>Get in touch</h2>
          <div style={{ marginTop: 24, fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.9 }}>
            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Mal HQ</div>
            <div>21st floor, Sky Tower</div>
            <div>Al Reem Island</div>
            <div>Abu Dhabi, UAE</div>
            <a href="mailto:contact@mal.ai" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8 }}><Icon name="send" size={16} />contact@mal.ai</a>
          </div>
        </div>
        <div style={{ position: "relative", height: 260, borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--border-subtle)", background: "var(--neutral-100)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="map-pin" size={40} color="var(--ink-900)" />
          <span style={{ position: "absolute", bottom: 12, left: 12, fontSize: 12, color: "var(--text-muted)", background: "var(--surface-card)", padding: "4px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-subtle)" }}>Al Reem Island · Abu Dhabi</span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    ["Website", ["Terms", "Privacy"]],
    ["SME", ["Terms", "Privacy"]],
    ["App", ["Terms", "Privacy"]],
    ["Social", ["Facebook", "Instagram", "TikTok"]],
  ];
  return (
    <footer style={{ padding: "48px clamp(20px,5vw,48px)", background: "var(--ink-900)", color: "var(--neutral-0)" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 40, justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 600, letterSpacing: "-0.04em" }}>Mal</div>
          <p style={{ marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.5)", maxWidth: 240 }}>Copyright © 2025. All rights reserved. Mal is a technology company and not a bank.</p>
        </div>
        <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
          {cols.map(([h, items]) => (
            <div key={h}>
              <div className="overline" style={{ color: "rgba(255,255,255,0.5)" }}>{h}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {items.map((it) => <a key={it} href="#" style={{ fontSize: 14, color: "rgba(255,255,255,0.85)" }}>{it}</a>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
function Landing() {
  return (
    <div style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      <Nav />
      <Hero />
      <Features />
      <Values />
      <Contact />
      <Footer />
    </div>
  );
}
window.Landing = Landing;
