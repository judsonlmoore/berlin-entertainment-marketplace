"use client";

import { useState } from "react";

type Locale = "en" | "de";
type View = "home" | "discover" | "opportunities" | "bookings" | "calendar" | "profile";

const copy = {
  en: {
    nav: ["Discover", "Opportunities", "Bookings", "Calendar"],
    eyebrow: "Berlin’s private booking circle",
    headline: "Good rooms meet\ngreat live acts.",
    sub: "A trusted, approval-only marketplace for Berlin venues and small-format entertainers—from first discovery to signed agreement.",
    enter: "Enter the marketplace",
    apply: "Apply for access",
    trusted: "Built for Berlin’s independent scene",
    workflow: "One calm flow from hello to showtime",
    privacy: "Private by design",
    privacyText: "Profiles and opportunities are visible only to approved members. Contact details unlock after mutual intent.",
    booking: "Booking, without the back-and-forth",
    bookingText: "Applications and direct requests meet in one clear flow with terms, agreements and signatures.",
    calendar: "Availability everyone can trust",
    calendarText: "Native holds, requests and confirmed dates keep calendars accurate—without pretending to sync everything.",
  },
  de: {
    nav: ["Entdecken", "Ausschreibungen", "Buchungen", "Kalender"],
    eyebrow: "Berlins privater Booking-Kreis",
    headline: "Gute Räume treffen\ngroßartige Live-Acts.",
    sub: "Ein vertrauensvoller, kuratierter Marktplatz für Berliner Venues und kleine Live-Acts – von der Entdeckung bis zur Vereinbarung.",
    enter: "Zum Marktplatz",
    apply: "Zugang beantragen",
    trusted: "Für Berlins unabhängige Szene",
    workflow: "Ein klarer Weg von Hallo bis Showtime",
    privacy: "Privat gedacht",
    privacyText: "Profile und Ausschreibungen sehen nur bestätigte Mitglieder. Kontaktdaten werden erst bei beidseitigem Interesse sichtbar.",
    booking: "Booking ohne E-Mail-Chaos",
    bookingText: "Bewerbungen und Direktanfragen laufen in einem klaren Prozess mit Konditionen, Vereinbarung und Unterschriften.",
    calendar: "Verfügbarkeit, auf die man zählt",
    calendarText: "Eigene Holds, Anfragen und bestätigte Termine halten Kalender verlässlich aktuell.",
  },
};

const acts = [
  { initials: "LR", name: "Lina Roth Trio", category: "Jazz · Acoustic", meta: "3 people · Kreuzberg", price: "€650–900", match: "96% match", color: "rose" },
  { initials: "AM", name: "Aki & Mar", category: "Neo-soul · Duo", meta: "2 people · Neukölln", price: "€450–700", match: "92% match", color: "blue" },
  { initials: "PF", name: "Paper Foxes", category: "Indie folk · Acoustic", meta: "4 people · Wedding", price: "€800–1,200", match: "88% match", color: "gold" },
];

const opportunities = [
  { date: "18", month: "SEP", title: "Late summer courtyard sessions", venue: "Hinterhof Haus · Kreuzberg", tags: ["Acoustic", "2–4 people", "€600–900"], applications: 7 },
  { date: "03", month: "OCT", title: "Thursday listening room", venue: "Studio Eins · Neukölln", tags: ["Jazz / Soul", "1–3 people", "€450–750"], applications: 4 },
  { date: "11", month: "OCT", title: "Gallery opening performance", venue: "Kiosk 44 · Mitte", tags: ["Experimental", "1–2 people", "€500–800"], applications: 3 },
];

function Logo() {
  return <div className="logo"><span className="logoMark">S</span><span>Salon</span><small>BERLIN</small></div>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState<View>("home");
  const [toast, setToast] = useState("");
  const t = copy[locale];

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  if (!entered) {
    return <main className="landing">
      <header className="publicNav"><Logo /><div className="navRight"><button className="locale" onClick={() => setLocale(locale === "en" ? "de" : "en")}>{locale === "en" ? "DE" : "EN"}</button><button className="textButton" onClick={() => setEntered(true)}>Sign in</button><button className="darkButton" onClick={() => notify(locale === "en" ? "Application form opened" : "Bewerbung geöffnet")}>{t.apply}</button></div></header>
      <section className="hero">
        <div className="heroCopy"><p className="eyebrow">{t.eyebrow}</p><h1>{t.headline.split("\n").map((x, i) => <span key={x}>{x}{i === 0 && <br />}</span>)}</h1><p className="lede">{t.sub}</p><div className="heroActions"><button className="primaryButton" onClick={() => setEntered(true)}>{t.enter}<span>→</span></button><button className="linkButton" onClick={() => notify("Applications are reviewed manually within 2–3 days")}>{t.apply}</button></div><div className="memberRow"><div className="avatars"><span>LR</span><span>AM</span><span>+9</span></div><p><b>124 approved members</b><br />across 38 Berlin venues</p></div></div>
        <div className="heroVisual"><div className="arch"><div className="stageLight"></div><div className="performer p1"></div><div className="performer p2"></div><div className="performer p3"></div><div className="stage"></div></div><div className="floatingCard fc1"><span className="liveDot"></span><div><b>Available Friday</b><small>Lina Roth Trio · Jazz</small></div></div><div className="floatingCard fc2"><span className="check">✓</span><div><b>Booking confirmed</b><small>Hinterhof Haus · 18 Sep</small></div></div></div>
      </section>
      <section className="trust"><span>{t.trusted}</span><b>HINTERHOF HAUS</b><b>KIOSK 44</b><b>STUDIO EINS</b><b>BAR AM UFER</b></section>
      <section className="features"><p className="eyebrow">{t.workflow}</p><div className="featureGrid"><article><i>01</i><h3>{t.privacy}</h3><p>{t.privacyText}</p></article><article><i>02</i><h3>{t.booking}</h3><p>{t.bookingText}</p></article><article><i>03</i><h3>{t.calendar}</h3><p>{t.calendarText}</p></article></div></section>
      <footer><Logo /><span>Private marketplace · Berlin, Germany</span><span>© 2026 Salon</span></footer>
      {toast && <div className="toast">{toast}</div>}
    </main>;
  }

  const navViews: View[] = ["discover", "opportunities", "bookings", "calendar"];
  return <main className="appShell">
    <aside><Logo /><nav><button className={view === "home" ? "active" : ""} onClick={() => setView("home")}><span>⌂</span>Overview</button>{t.nav.map((label, i) => <button key={label} className={view === navViews[i] ? "active" : ""} onClick={() => setView(navViews[i])}><span>{["◫", "✦", "⌁", "□"][i]}</span>{label}{i === 2 && <em>2</em>}</button>)}</nav><div className="approval"><span>✓</span><div><b>Approved member</b><small>Full marketplace access</small></div></div><button className="user" onClick={() => setView("profile")}><span className="avatar">JM</span><div><b>Jonas Müller</b><small>Venue · Entertainer</small></div><i>···</i></button></aside>
    <section className="appMain">
      <header className="appHeader"><div className="mobileLogo"><Logo /></div><div className="crumb">SALON / <b>{view.toUpperCase()}</b></div><div className="headerActions"><button className="locale" onClick={() => setLocale(locale === "en" ? "de" : "en")}>{locale === "en" ? "DE" : "EN"}</button><button className="iconButton">⌕</button><button className="iconButton">♢<i></i></button><button className="mobileAvatar" onClick={() => setView("profile")}>JM</button></div></header>
      <div className="content">{view === "home" && <Dashboard setView={setView} notify={notify} />}{view === "discover" && <Discover notify={notify} />}{view === "opportunities" && <Opportunities notify={notify} />}{view === "bookings" && <Bookings notify={notify} />}{view === "calendar" && <Calendar notify={notify} />}{view === "profile" && <Profile notify={notify} />}</div>
    </section>
    <nav className="mobileNav">{["home", ...navViews].map((v, i) => <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v as View)}><span>{["⌂", "◫", "✦", "⌁", "□"][i]}</span>{["Home", "Discover", "Open", "Bookings", "Calendar"][i]}</button>)}</nav>
    {toast && <div className="toast">{toast}</div>}
  </main>;
}

function Dashboard({ setView, notify }: { setView: (v: View) => void; notify: (s: string) => void }) {
  return <><div className="pageIntro"><div><p className="eyebrow">MONDAY, 3 AUGUST</p><h2>Good afternoon, Jonas.</h2><p>Here’s what’s moving in your marketplace.</p></div><button className="primaryButton" onClick={() => notify("New opportunity draft created")}>＋ Post opportunity</button></div>
    <div className="stats"><article><span>Active opportunities</span><b>3</b><small className="up">↗ 2 new applications</small></article><article><span>Booking requests</span><b>2</b><small>Awaiting your response</small></article><article><span>Confirmed this month</span><b>4</b><small>€3,250 total fees</small></article><article><span>Profile views</span><b>28</b><small className="up">↗ 12% this week</small></article></div>
    <div className="dashboardGrid"><section className="panel"><div className="panelHeader"><div><h3>Recent applications</h3><p>For your open opportunities</p></div><button onClick={() => setView("opportunities")}>View all →</button></div><div className="application"><div className="actAvatar rose">LR</div><div><b>Lina Roth Trio</b><small>Applied to Late summer courtyard sessions</small></div><span>2h ago</span><button onClick={() => notify("Lina Roth Trio shortlisted — contact details are now visible")}>Shortlist</button></div><div className="application"><div className="actAvatar blue">AM</div><div><b>Aki & Mar</b><small>Applied to Thursday listening room</small></div><span>Yesterday</span><button onClick={() => notify("Application opened")}>Review</button></div><div className="application"><div className="actAvatar gold">PF</div><div><b>Paper Foxes</b><small>Applied to Late summer courtyard sessions</small></div><span>2d ago</span><button onClick={() => notify("Application opened")}>Review</button></div></section>
      <section className="panel nextBooking"><div className="panelHeader"><div><h3>Next confirmed booking</h3><p>Everything is on track</p></div></div><div className="dateBadge"><b>18</b><span>SEP</span></div><h3>Lina Roth Trio</h3><p>Hinterhof Haus · Courtyard</p><div className="timeline"><span className="done">✓</span><i></i><span className="done">✓</span><i></i><span className="done">✓</span><i></i><span>4</span></div><div className="timelineLabels"><small>Terms</small><small>Agreement</small><small>Signed</small><small>Showtime</small></div><button onClick={() => setView("bookings")}>View booking details →</button></section>
    </div>
    <div className="sectionTitle"><div><h3>Recommended for your venue</h3><p>Based on your audience and recent searches</p></div><button onClick={() => setView("discover")}>Explore all acts →</button></div><div className="cardGrid">{acts.map(a => <ActCard key={a.name} act={a} notify={notify} />)}</div></>;
}

function ActCard({ act, notify }: { act: typeof acts[number]; notify: (s: string) => void }) {
  return <article className="actCard"><div className={`actImage ${act.color}`}><span>{act.initials}</span><button>♡</button><small>{act.match}</small></div><div className="actInfo"><span>{act.category}</span><h3>{act.name}</h3><p>{act.meta}</p><div><b>{act.price}</b><button onClick={() => notify(`Direct request draft opened for ${act.name}`)}>Request date</button></div></div></article>;
}

function Discover({ notify }: { notify: (s: string) => void }) { return <><div className="pageIntro"><div><p className="eyebrow">PRIVATE DISCOVERY</p><h2>Find the right act.</h2><p>Curated entertainers approved for the Salon community.</p></div></div><div className="filters"><button>All categories⌄</button><button>Any date⌄</button><button>Act size⌄</button><button>Budget⌄</button><label>⌕ <input placeholder="Search acts" /></label></div><div className="cardGrid large">{[...acts, ...acts].map((a, i) => <ActCard key={i} act={{...a, name: i > 2 ? ["Mara Klein", "Duo Vela", "The Quiet Hours"][i - 3] : a.name}} notify={notify} />)}</div></> }

function Opportunities({ notify }: { notify: (s: string) => void }) { return <><div className="pageIntro"><div><p className="eyebrow">OPEN OPPORTUNITIES</p><h2>Rooms looking for sound.</h2><p>Visible only to approved entertainers.</p></div><button className="primaryButton" onClick={() => notify("Opportunity editor opened")}>＋ Post opportunity</button></div><div className="opportunityList">{opportunities.map(o => <article key={o.title}><div className="dateBadge"><b>{o.date}</b><span>{o.month}</span></div><div className="oppBody"><span>OPEN FOR APPLICATIONS</span><h3>{o.title}</h3><p>{o.venue}</p><div className="tags">{o.tags.map(t => <small key={t}>{t}</small>)}</div></div><div className="oppSide"><small>{o.applications} applications</small><button onClick={() => notify(`Application started for “${o.title}”`)}>View & apply →</button></div></article>)}</div></> }

function Bookings({ notify }: { notify: (s: string) => void }) { const steps = ["Request received", "Shortlisted", "Terms agreed", "Agreement generated", "Signatures", "Confirmed"]; return <><div className="pageIntro"><div><p className="eyebrow">BOOKING PIPELINE</p><h2>Bookings, clearly moving.</h2><p>Applications and direct requests share one dependable workflow.</p></div></div><div className="bookingTabs"><button className="active">Active <b>2</b></button><button>Confirmed <b>4</b></button><button>Past</button></div><section className="bookingCard"><div className="bookingTop"><div className="actAvatar rose">LR</div><div><span>DIRECT REQUEST · #SLN-1048</span><h3>Lina Roth Trio × Hinterhof Haus</h3><p>18 September 2026 · 19:30 · Courtyard</p></div><b>Signatures</b></div><div className="bookingSteps">{steps.map((s, i) => <div key={s} className={i < 4 ? "complete" : i === 4 ? "current" : ""}><span>{i < 4 ? "✓" : i + 1}</span><small>{s}</small></div>)}</div><div className="bookingFooter"><p><b>German controlling agreement</b><br /><span>English convenience translation included · E-sign provider sandbox</span></p><button onClick={() => notify("Sandbox agreement preview opened — no live legal or signature service")}>Review agreement →</button></div></section><section className="bookingCard compact"><div className="bookingTop"><div className="actAvatar blue">AM</div><div><span>APPLICATION · #SLN-1052</span><h3>Aki & Mar × Studio Eins</h3><p>3 October 2026 · 20:00 · Main room</p></div><b className="terms">Terms agreed</b></div></section><aside className="notice"><span>i</span><p><b>Deposits are tracked separately.</b> A booking becomes confirmed after signatures—not after payment. Salon does not process or hold funds.</p><button onClick={() => notify("Deposit status marked as pending")}>Update deposit status</button></aside></> }

function Calendar({ notify }: { notify: (s: string) => void }) { const days = Array.from({length: 35}, (_, i) => i - 2); return <><div className="pageIntro"><div><p className="eyebrow">NATIVE CALENDAR</p><h2>September 2026</h2><p>Availability for Jonas Müller and Hinterhof Haus.</p></div><button className="primaryButton" onClick={() => notify("Availability editor opened")}>＋ Add availability</button></div><div className="calendarLegend"><span><i className="available"></i>Available</span><span><i className="unavailable"></i>Unavailable</span><span><i className="tentative"></i>Tentative hold</span><span><i className="requested"></i>Requested</span><span><i className="confirmed"></i>Confirmed</span></div><section className="calendar"><div className="weekdays">{["MON","TUE","WED","THU","FRI","SAT","SUN"].map(d => <span key={d}>{d}</span>)}</div><div className="days">{days.map((d, i) => <button key={i} className={`${d < 1 || d > 30 ? "muted" : ""} ${d === 18 ? "has confirmed" : d === 12 ? "has tentative" : d === 22 ? "has requested" : d === 5 || d === 6 ? "has unavailable" : ""}`}><b>{d < 1 ? 31 + d : d > 30 ? d - 30 : d}</b>{d === 18 && <small>Confirmed · Lina Roth</small>}{d === 12 && <small>Hold · expires 10 Sep</small>}{d === 22 && <small>Request · Aki & Mar</small>}</button>)}</div></section></> }

function Profile({ notify }: { notify: (s: string) => void }) { return <><div className="pageIntro"><div><p className="eyebrow">DUAL-ROLE PROFILE</p><h2>Your Salon presence.</h2><p>One account, two sides of the marketplace.</p></div><button className="primaryButton" onClick={() => notify("Changes saved as draft for manual review")}>Save changes</button></div><div className="profileGrid"><section className="panel profilePanel"><div className="profileHeading"><div className="bigAvatar">JM</div><div><h3>Jonas Müller</h3><p>Approved member since June 2026</p></div><span>APPROVED</span></div><div className="roleTabs"><button className="active">Venue profile</button><button>Entertainer profile</button></div><div className="formGrid"><label>Venue name<input defaultValue="Hinterhof Haus" /></label><label>Venue type<select defaultValue="Cultural venue"><option>Cultural venue</option></select></label><label className="wide">Address<input defaultValue="Reichenberger Str. 17, 10999 Berlin" /></label><label>Capacity<input defaultValue="120" /></label><label>Audience<input defaultValue="Jazz, indie, acoustic" /></label><label className="wide">Technical resources<textarea defaultValue="Compact PA, 12-channel mixer, upright piano, warm stage lighting" /></label></div></section><aside className="panel checklist"><h3>Approval readiness</h3><p>Submitted profiles are reviewed manually by the platform team.</p>{["Identity verified", "Contact method added", "Venue details complete", "Availability added"].map(x => <div key={x}><span>✓</span>{x}</div>)}<hr /><small>Any material profile change returns to review before becoming visible.</small><button onClick={() => notify("Profile submitted for manual platform approval")}>Submit changes for review</button></aside></div></> }
