import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";

/* ------------------------------------------------------------------
   ANDERSEN CI — 5S FLOOR WALK
   Drop the real logo in and set this to its path, e.g. "/aci-logo.png".
   Leave as null to use the built-in target mark.
------------------------------------------------------------------ */
const LOGO_SRC = null;

const INK = "#14110F";
const RED = "#D42029";
const BONE = "#F2EFE9";
const AMBER = "#E8B33A";
const STEEL = "#6E6B6B";
const PANEL = "#1E1A17";
const CONCRETE = "#2B2724";

const MONO = "'JetBrains Mono','SF Mono',Menlo,Consolas,monospace";
const HEAVY = "'Arial Black','Helvetica Neue',Impact,sans-serif";

const ROUND_TIME = 30;
const PX_PER_STEP = 42;

/* ---------------- deck ---------------- */
const SUITS = [
  { k: "S", sym: "\u2660", name: "SPADES", red: false },
  { k: "H", sym: "\u2665", name: "HEARTS", red: true },
  { k: "D", sym: "\u2666", name: "DIAMONDS", red: true },
  { k: "C", sym: "\u2663", name: "CLUBS", red: false },
];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck(withJokers) {
  const cards = [];
  SUITS.forEach((s) =>
    RANKS.forEach((r, i) =>
      cards.push({ id: `${r}${s.k}`, rank: r, order: i, suit: s.k, sym: s.sym, red: s.red, joker: false, label: `${r}${s.sym}` })
    )
  );
  if (withJokers) {
    cards.push({ id: "JK1", rank: "\u2605", order: 99, suit: "X", sym: "\u2605", red: true, joker: true, label: "JOKER" });
    cards.push({ id: "JK2", rank: "\u2605", order: 99, suit: "X", sym: "\u2605", red: false, joker: true, label: "JOKER" });
  }
  return cards;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* scatter across the whole floor: jittered grid so nothing is fully buried */
function scatterLayout(cards, cols, rows) {
  const colStep = 92 / cols;
  const rowStep = 88 / rows;
  const pos = {};
  cards.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pos[c.id] = {
      left: Math.max(1, Math.min(94, col * colStep + 2 + (Math.random() - 0.5) * colStep * 0.75)),
      top: Math.max(1, Math.min(92, row * rowStep + 3 + (Math.random() - 0.5) * rowStep * 0.7)),
      rot: (Math.random() - 0.5) * 10,
      z: Math.floor(Math.random() * 50) + 1,
    };
  });
  return pos;
}

/* ---------------- rounds ---------------- */
const ROUNDS = [
  {
    n: 1,
    tag: "UNSORTED",
    sIndex: -1,
    duringTag: "NO SYSTEM",
    step: "NO SYSTEM",
    mood: 0,
    faceDown: true,
    mode: "scatter",
    floorW: 3,
    floorH: 2,
    scatterCols: 9,
    scatterRows: 6,
    cardW: 4.6,
    handleMs: 560,
    flipBack: 900,
    reshuffleAt: 14,
    headline: "Fifty-four cards. Six aisles. No labels.",
    during: "Walk it. Pick it up. Turn it over. Put it back.",
    after:
      "That is a search with no system. Nothing is labeled, nothing has a home, and you cannot tell from across the aisle whether the part you need is in that bin or the next one. You covered ground and came back with nothing.",
    parallel: "The back half of every parts room. Unmarked totes, three deep, and the only index is somebody's memory.",
    waste: "Every one of the seven wastes is on that floor at once. The breakdown is below.",
  },
  {
    n: 2,
    tag: "SORT",
    sIndex: 0,
    duringTag: "VISIBLE ≠ ORGANIZED",
    step: "1S — SORT",
    mood: 1,
    faceDown: false,
    mode: "scatter",
    floorW: 3,
    floorH: 2,
    scatterCols: 9,
    scatterRows: 6,
    cardW: 4.6,
    handleMs: 220,
    headline: "Everything face up. Still spread across six aisles.",
    during: "You can read every card now. You still have to walk to it.",
    after:
      "Sort separates what you need from what you don't. You can finally see what you have, and the junk stops hiding the good parts. But the floor is the same size — visibility cuts the guessing, not the walking.",
    parallel: "The shop clears dead tooling off the benches. Nothing is buried anymore, but the wrench is still four bays down.",
    waste: "Sort alone might take a 30-minute search to 20. Real progress, and only the first S.",
  },
  {
    n: 3,
    tag: "SET IN ORDER",
    sIndex: 1,
    duringTag: "COLOR = ZONE",
    step: "2S — SET IN ORDER",
    mood: 2,
    faceDown: false,
    mode: "zones",
    floorW: 2,
    floorH: 1,
    cardW: 5.6,
    cols: 9,
    handleMs: 140,
    headline: "Jokers gone. Two taped zones: red and black.",
    during: "The target's color tells you which zone. Walk to that one only.",
    after:
      "Set in Order gives everything a home and marks it. The jokers were the obvious waste and they are out of the building. Now one look at the work order tells you which half of the floor to walk to — you never enter the other one.",
    parallel: "Parts by family: fasteners, electrical, hydraulic, consumables. You know the aisle before you leave the bench.",
    waste: "Half the floor eliminated from the search. Thirty minutes becomes fifteen.",
  },
  {
    n: 4,
    tag: "SET IN ORDER",
    sIndex: 1,
    duringTag: "READ THE PLACARD",
    step: "2S — DEEPER",
    mood: 3,
    faceDown: false,
    mode: "zones",
    floorW: 1.3,
    floorH: 1,
    cardW: 6.2,
    cols: 7,
    handleMs: 120,
    headline: "Four bays. Four suits. Placards on every one.",
    during: "Four bays, thirteen cards each. Read the placard, walk once.",
    after:
      "Same S, one layer deeper. Every card has a category and every category has a marked bay. You went from scanning fifty-four to scanning thirteen without adding a tool, a rack, or a dollar.",
    parallel: "A plant laid out by line first, then by part type inside the line. Walk to Line A, the bearings are where bearings go.",
    waste: "Search space down 75%. Thirty minutes becomes five.",
  },
  {
    n: 5,
    tag: "STANDARDIZE",
    sIndex: 3,
    duringTag: "ONE WAY, EVERY TIME",
    step: "3S — STANDARDIZE",
    mood: 4,
    faceDown: false,
    mode: "zones",
    floorW: 1,
    floorH: 1,
    cardW: 6.4,
    cols: 13,
    handleMs: 100,
    headline: "One board. Suit, then rank, A through K.",
    during: "You know where it is before you look.",
    after:
      "Standardize means one method, everywhere, every shift. You did not search that time — you reached. That is the difference between a place that looks tidy and a place that is actually organized: it is predictable, and a new hire can use it on day one.",
    parallel: "A kitchen line. Every pan, every knife, every squeeze bottle in the same spot on every shift. A cook reaches without looking.",
    waste: "Thirty minutes of searching becomes thirty seconds of retrieval.",
  },
];

const FIVE_S = [
  { n: "1S", name: "SORT", jp: "SEIRI", line: "Get rid of what you don't need.", game: "Round 2" },
  { n: "2S", name: "SET IN ORDER", jp: "SEITON", line: "A marked home for everything.", game: "Rounds 3–4" },
  { n: "3S", name: "SHINE", jp: "SEISO", line: "Clean it so problems show up.", game: "Not in game" },
  { n: "4S", name: "STANDARDIZE", jp: "SEIKETSU", line: "One way, every shift.", game: "Round 5" },
  { n: "5S", name: "SUSTAIN", jp: "SHITSUKE", line: "Keep it that way.", game: "Not in game" },
];

const MOOD_CAPTION = ["WHERE IS IT", "STILL WALKING", "HUH. FASTER.", "NOW WE'RE MOVING", "THAT'S THE JOB"];

const ZONE_LAYOUTS = {
  3: (groups) => [
    { ...groups[0], left: 3, top: 8, width: 43, height: 84, tape: RED },
    { ...groups[1], left: 53, top: 8, width: 43, height: 84, tape: BONE },
  ],
  4: (groups) => [
    { ...groups[0], left: 3, top: 5, width: 44, height: 43, tape: BONE },
    { ...groups[1], left: 52, top: 5, width: 44, height: 43, tape: RED },
    { ...groups[2], left: 3, top: 52, width: 44, height: 43, tape: RED },
    { ...groups[3], left: 52, top: 52, width: 44, height: 43, tape: BONE },
  ],
  5: (groups) =>
    groups.map((g, i) => ({ ...g, left: 4, top: 2 + i * 24.5, width: 92, height: 23, tape: i % 2 ? RED : BONE })),
};

function buildGroups(n) {
  if (n <= 2) return [{ label: null, cards: shuffle(buildDeck(true)) }];
  const d = buildDeck(false);
  if (n === 3)
    return [
      { label: "RED ZONE", cards: shuffle(d.filter((c) => c.red)) },
      { label: "BLACK ZONE", cards: shuffle(d.filter((c) => !c.red)) },
    ];
  if (n === 4) return SUITS.map((s) => ({ label: `BAY ${s.k} — ${s.name}`, cards: shuffle(d.filter((c) => c.suit === s.k)) }));
  return SUITS.map((s) => ({ label: `${s.name} — A THROUGH K`, cards: d.filter((c) => c.suit === s.k).sort((a, b) => a.order - b.order) }));
}

/* ---------------- supervisor ---------------- */
function Supervisor({ mood, size = 132 }) {
  const skin = "#EFC08D";
  const skinShade = "#D9A472";
  const hatDark = "#9E1620";
  const S = { shapeRendering: "crispEdges" };
  return (
    <svg viewBox="0 0 120 128" width={size} height={size * (128 / 120)} role="img" aria-label={`Supervisor: ${MOOD_CAPTION[mood]}`}>
      {mood === 0 && (
        <g fill={RED} opacity="0.9" style={S}>
          <rect x="14" y="16" width="8" height="8" />
          <rect x="8" y="8" width="6" height="6" />
          <rect x="98" y="16" width="8" height="8" />
          <rect x="106" y="8" width="6" height="6" />
        </g>
      )}
      {mood === 4 && (
        <g fill={AMBER} style={S}>
          <rect x="10" y="30" width="4" height="12" />
          <rect x="6" y="34" width="12" height="4" />
          <rect x="106" y="24" width="4" height="12" />
          <rect x="102" y="28" width="12" height="4" />
        </g>
      )}
      <g style={S}>
        <rect x="18" y="30" width="84" height="9" fill={RED} stroke={INK} strokeWidth="4" />
        <rect x="32" y="12" width="56" height="20" fill={RED} stroke={INK} strokeWidth="4" />
        <rect x="56" y="12" width="8" height="20" fill={hatDark} />
        <rect x="19" y="62" width="10" height="16" fill={skinShade} stroke={INK} strokeWidth="4" />
        <rect x="91" y="62" width="10" height="16" fill={skinShade} stroke={INK} strokeWidth="4" />
      </g>
      <rect x="28" y="39" width="64" height="60" fill={skin} stroke={INK} strokeWidth="4" style={S} />
      {mood === 0 && (
        <g fill={RED} opacity="0.32" style={S}>
          <rect x="32" y="72" width="14" height="8" />
          <rect x="74" y="72" width="14" height="8" />
        </g>
      )}
      <g stroke={INK} strokeWidth="5" strokeLinecap="square">
        {mood === 0 && (
          <>
            <line x1="36" y1="52" x2="52" y2="60" />
            <line x1="84" y1="52" x2="68" y2="60" />
          </>
        )}
        {mood === 1 && (
          <>
            <line x1="36" y1="54" x2="52" y2="59" />
            <line x1="84" y1="54" x2="68" y2="59" />
          </>
        )}
        {mood === 2 && (
          <>
            <line x1="36" y1="50" x2="52" y2="50" />
            <line x1="68" y1="58" x2="84" y2="54" />
          </>
        )}
        {mood === 3 && (
          <>
            <line x1="36" y1="52" x2="52" y2="49" />
            <line x1="68" y1="49" x2="84" y2="52" />
          </>
        )}
        {mood === 4 && (
          <>
            <line x1="36" y1="50" x2="52" y2="48" />
            <line x1="68" y1="48" x2="84" y2="50" />
          </>
        )}
      </g>
      <g fill={INK} style={S}>
        {mood <= 1 && (
          <>
            <rect x="40" y="64" width="9" height="9" />
            <rect x="71" y="64" width="9" height="9" />
          </>
        )}
        {mood === 2 && (
          <>
            <rect x="40" y="66" width="10" height="4" />
            <rect x="71" y="64" width="9" height="9" />
          </>
        )}
        {mood === 3 && (
          <>
            <rect x="40" y="63" width="9" height="10" />
            <rect x="71" y="63" width="9" height="10" />
          </>
        )}
      </g>
      {mood === 4 && (
        <g stroke={INK} strokeWidth="5" fill="none" strokeLinecap="square">
          <polyline points="39,70 44,63 49,70" />
          <polyline points="70,70 75,63 80,70" />
        </g>
      )}
      <g style={S}>
        {mood === 0 && (
          <>
            <rect x="43" y="80" width="34" height="14" fill={INK} />
            <rect x="43" y="80" width="34" height="4" fill={BONE} />
          </>
        )}
        {mood === 1 && <path d="M43 90 Q60 80 77 90" stroke={INK} strokeWidth="5" fill="none" />}
        {mood === 2 && <rect x="48" y="85" width="24" height="5" fill={INK} />}
        {mood === 3 && <path d="M46 84 Q60 93 74 84" stroke={INK} strokeWidth="5" fill="none" />}
        {mood === 4 && (
          <>
            <path d="M42 82 Q60 100 78 82 Z" fill={INK} />
            <rect x="48" y="82" width="24" height="4" fill={BONE} />
          </>
        )}
      </g>
      {mood === 1 && <rect x="94" y="46" width="7" height="11" fill="#5BA8D8" stroke={INK} strokeWidth="3" style={S} />}
      {mood === 0 && (
        <g style={S}>
          <rect x="12" y="34" width="14" height="14" fill={skin} stroke={INK} strokeWidth="4" />
          <rect x="94" y="34" width="14" height="14" fill={skin} stroke={INK} strokeWidth="4" />
        </g>
      )}
      {mood === 3 && (
        <g style={S}>
          <rect x="94" y="86" width="16" height="16" fill={skin} stroke={INK} strokeWidth="4" />
          <rect x="99" y="74" width="6" height="14" fill={skin} stroke={INK} strokeWidth="4" />
        </g>
      )}
      <g style={S}>
        <rect x="22" y="99" width="76" height="14" fill={AMBER} stroke={INK} strokeWidth="4" />
        <rect x="52" y="99" width="16" height="14" fill={INK} />
      </g>
    </svg>
  );
}

function FiveSStrip({ active = -1, done = [] }) {
  return (
    <div className="s-strip">
      {FIVE_S.map((s, i) => {
        const state = i === active ? "now" : done.includes(i) ? "done" : "todo";
        return (
          <div className={`s-cell s-${state}`} key={s.n}>
            <div className="s-num">{s.n}</div>
            <div className="s-name">{s.name}</div>
            <div className="s-jp">{s.jp}</div>
            <div className="s-line">{s.line}</div>
            <div className="s-game">{s.game}</div>
          </div>
        );
      })}
    </div>
  );
}

function Logo({ size = 44 }) {
  if (LOGO_SRC) return <img src={LOGO_SRC} alt="Andersen Continuous Improvement" style={{ height: size, width: "auto", display: "block" }} />;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label="Andersen Continuous Improvement">
      <circle cx="50" cy="50" r="47" fill={BONE} stroke={INK} strokeWidth="5" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={INK} strokeWidth="2" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={RED} strokeWidth="7" />
      <circle cx="50" cy="50" r="19" fill="none" stroke={RED} strokeWidth="7" />
      <circle cx="50" cy="50" r="8" fill="none" stroke={RED} strokeWidth="7" />
      <rect x="56" y="43" width="26" height="14" fill={BONE} />
      <path d="M74 40 L66 50 L74 60" fill="none" stroke={RED} strokeWidth="7" strokeLinecap="square" />
      <path d="M86 40 L78 50 L86 60" fill="none" stroke={RED} strokeWidth="7" strokeLinecap="square" />
    </svg>
  );
}

/* walking figure for the coach card */
function Walker({ size = 54 }) {
  return (
    <svg viewBox="0 0 40 60" width={size} height={size * 1.5} aria-hidden="true">
      <g style={{ shapeRendering: "crispEdges" }}>
        <rect x="12" y="2" width="16" height="5" fill={RED} stroke={INK} strokeWidth="2" />
        <rect x="15" y="7" width="10" height="9" fill="#EFC08D" stroke={INK} strokeWidth="2" />
        <rect x="11" y="16" width="18" height="18" fill={AMBER} stroke={INK} strokeWidth="2" />
        <rect x="4" y="20" width="7" height="4" fill="#EFC08D" stroke={INK} strokeWidth="2" />
        <rect x="29" y="24" width="7" height="4" fill="#EFC08D" stroke={INK} strokeWidth="2" />
        <rect x="12" y="34" width="6" height="16" fill={INK} />
        <rect x="22" y="34" width="6" height="12" fill={INK} />
        <rect x="8" y="50" width="12" height="5" fill={INK} />
        <rect x="22" y="46" width="12" height="5" fill={INK} />
      </g>
    </svg>
  );
}

/* ---------------- card ---------------- */
const Card = memo(function Card({ card, faceDown, revealed, status, onPick, disabled, pos, widthPct, flipping }) {
  const showFace = !faceDown || revealed;
  const cls = ["card", status ? `card-${status}` : "", showFace ? "" : "card-back", pos ? "card-abs" : "", flipping ? "card-flipping" : ""].join(" ");
  const style = { color: showFace ? (card.red ? RED : INK) : "transparent" };
  if (pos) {
    style.left = `${pos.left}%`;
    style.top = `${pos.top}%`;
    style.width = `${widthPct}%`;
    style.zIndex = status ? 60 : pos.z;
    style["--rot"] = `${pos.rot}deg`;
    style.transform = `rotate(${pos.rot}deg)`;
  }
  return (
    <button className={cls} onClick={() => onPick(card)} disabled={disabled} aria-label={showFace ? card.label : "Unlabeled tote"} style={style}>
      {showFace ? (
        card.joker ? (
          <span className="card-joker">{card.sym}</span>
        ) : (
          <>
            <span className="card-rank">{card.rank}</span>
            <span className="card-suit">{card.sym}</span>
          </>
        )
      ) : (
        <span className="card-tote" aria-hidden="true" />
      )}
    </button>
  );
});

/* ---------------- app ---------------- */
export default function FiveSCardGame() {
  const [phase, setPhase] = useState("intro"); // intro | play | reveal | debrief | final
  const [roundIdx, setRoundIdx] = useState(0);
  const [groups, setGroups] = useState([]);
  const [positions, setPositions] = useState(null);
  const [target, setTarget] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [results, setResults] = useState([]);
  const [locked, setLocked] = useState(false);
  const [flipping, setFlipping] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [banner, setBanner] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [vp, setVp] = useState({ w: 600, h: 420 });
  const [steps, setSteps] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState({ handled: 0, wrong: 0, repeats: 0 });

  const counts = useRef({ handled: 0, wrong: 0, repeats: 0 });
  const handledIds = useRef(new Set());
  const tickRef = useRef(null);
  const lockRef = useRef(null);
  const flipRef = useRef(null);
  const reshuffled = useRef(false);
  const vpRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const offRef = useRef({ x: 0, y: 0 });

  const round = ROUNDS[roundIdx];
  const floorW = vp.w * round.floorW;
  const floorH = vp.h * round.floorH;
  const pannable = round.floorW > 1 || round.floorH > 1;

  useEffect(() => {
    offRef.current = offset;
  }, [offset]);

  /* every new screen starts at the top */
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [phase, roundIdx]);

  /* measure viewport */
  useEffect(() => {
    const measure = () => {
      if (!vpRef.current) return;
      const r = vpRef.current.getBoundingClientRect();
      setVp({ w: r.width, h: r.height });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase, roundIdx]);

  const clamp = useCallback(
    (x, y) => ({
      x: Math.min(0, Math.max(vp.w - floorW, x)),
      y: Math.min(0, Math.max(vp.h - floorH, y)),
    }),
    [vp, floorW, floorH]
  );

  const stopTimer = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
  };
  const clearPending = () => {
    if (lockRef.current) clearTimeout(lockRef.current);
    if (flipRef.current) clearTimeout(flipRef.current);
  };

  const startRound = useCallback((idx) => {
    const cfg = ROUNDS[idx];
    const g = buildGroups(cfg.n);
    const pool = g.flatMap((x) => x.cards);
    setGroups(g);
    setPositions(cfg.mode === "scatter" ? scatterLayout(pool, cfg.scatterCols, cfg.scatterRows) : null);
    const pullable = pool.filter((c) => !c.joker);
    setTarget(pullable[Math.floor(Math.random() * pullable.length)]);
    setRevealed({});
    setTimeLeft(ROUND_TIME);
    setLocked(false);
    setFlipping(null);
    setOutcome(null);
    setBanner(null);
    setOffset({ x: 0, y: 0 });
    setSteps(0);
    counts.current = { handled: 0, wrong: 0, repeats: 0 };
    setStats({ handled: 0, wrong: 0, repeats: 0 });
    handledIds.current = new Set();
    reshuffled.current = false;
    clearPending();
    setRoundIdx(idx);
    setPhase("play");
    setShowHint(idx !== 0 && (cfg.floorW > 1 || cfg.floorH > 1));
  }, []);

  const offRefSteps = useRef(0);
  useEffect(() => {
    offRefSteps.current = steps;
  }, [steps]);

  const endRound = useCallback(
    (timeUsed, timedOut) => {
      stopTimer();
      clearPending();
      setLocked(false);
      const c = counts.current;
      setResults((r) => [
        ...r,
        { n: ROUNDS[roundIdx].n, timeUsed, timedOut, wrongPicks: c.wrong, handled: c.handled, repeats: c.repeats, steps: Math.round(offRefSteps.current) },
      ]);
      setOutcome(timedOut ? "timeout" : "found");
      setPhase("reveal");
    },
    [roundIdx]
  );

  /* timer */
  useEffect(() => {
    if (phase !== "play") return;
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = +(t - 0.1).toFixed(1);
        if (next <= 0) {
          clearInterval(tickRef.current);
          tickRef.current = null;
          return 0;
        }
        return next;
      });
    }, 100);
    return stopTimer;
  }, [phase, roundIdx]);

  useEffect(() => {
    if (phase === "play" && timeLeft <= 0) {
      if (target) {
        setRevealed((r) => ({ ...r, [target.id]: "found" }));
        const p = positions?.[target.id];
        if (p) setOffset(clamp(-((p.left / 100) * floorW) + vp.w / 2, -((p.top / 100) * floorH) + vp.h / 2));
      }
      endRound(ROUND_TIME, true);
    }
  }, [timeLeft, phase, endRound, target, positions, clamp, floorW, floorH, vp]);

  /* second shift moves things */
  useEffect(() => {
    if (phase !== "play" || !round.reshuffleAt || reshuffled.current) return;
    if (timeLeft <= round.reshuffleAt) {
      reshuffled.current = true;
      const pool = groups.flatMap((g) => g.cards);
      setPositions(scatterLayout(pool, round.scatterCols, round.scatterRows));
      setRevealed({});
      handledIds.current = new Set();
      setBanner("SECOND SHIFT MOVED THINGS AGAIN");
      setTimeout(() => setBanner(null), 2200);
    }
  }, [timeLeft, phase, round, groups]);

  /* hint fade */
  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 3200);
    return () => clearTimeout(t);
  }, [showHint, roundIdx]);

  /* panning */
  const onPointerDown = (e) => {
    if (!pannable || phase !== "play") return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: offRef.current.x, oy: offRef.current.y, lx: e.clientX, ly: e.clientY };
    movedRef.current = false;
  };
  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) > 9 || Math.abs(dy) > 9) {
      movedRef.current = true;
      setShowHint(false);
    }
    const moved = Math.abs(e.clientX - d.lx) + Math.abs(e.clientY - d.ly);
    d.lx = e.clientX;
    d.ly = e.clientY;
    if (moved) setSteps((s) => s + moved / PX_PER_STEP);
    setOffset(clamp(d.ox + dx, d.oy + dy));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const nudge = (dx, dy) => {
    if (!pannable) return;
    setShowHint(false);
    setSteps((s) => s + (Math.abs(dx) + Math.abs(dy)) / PX_PER_STEP);
    setOffset((o) => clamp(o.x + dx, o.y + dy));
  };

  const onKeyDown = (e) => {
    if (phase !== "play" || !pannable) return;
    const d = 140;
    if (e.key === "ArrowLeft") nudge(d, 0);
    else if (e.key === "ArrowRight") nudge(-d, 0);
    else if (e.key === "ArrowUp") nudge(0, d);
    else if (e.key === "ArrowDown") nudge(0, -d);
    else return;
    e.preventDefault();
  };

  /* picking */
  const handlePick = (card) => {
    if (phase !== "play" || locked || movedRef.current) return;
    if (revealed[card.id]) return;

    const cost = round.handleMs || 0;
    const hit = card.id === target.id;

    counts.current.handled += 1;
    if (handledIds.current.has(card.id)) counts.current.repeats += 1;
    handledIds.current.add(card.id);
    if (!hit) counts.current.wrong += 1;
    setStats({ ...counts.current });

    setRevealed((r) => ({ ...r, [card.id]: hit ? "found" : "wrong" }));
    setFlipping(card.id);

    if (hit) {
      setLocked(true);
      const used = +(ROUND_TIME - timeLeft).toFixed(1);
      lockRef.current = setTimeout(() => endRound(used, false), Math.max(420, cost));
      return;
    }

    setLocked(true);
    lockRef.current = setTimeout(() => {
      setLocked(false);
      setFlipping(null);
      if (round.flipBack) {
        flipRef.current = setTimeout(() => {
          setRevealed((r) => {
            const next = { ...r };
            delete next[card.id];
            return next;
          });
        }, round.flipBack);
      }
    }, cost);
  };

  const pickRef = useRef(null);
  pickRef.current = handlePick;
  const onPick = useCallback((c) => pickRef.current(c), []);

  const reset = () => {
    stopTimer();
    clearPending();
    setResults([]);
    setRoundIdx(0);
    setPhase("intro");
  };

  const prev = results.length > 1 ? results[results.length - 2] : null;
  const curr = results[results.length - 1];
  const improvement = prev && curr && prev.timeUsed > 0 ? Math.round(((prev.timeUsed - curr.timeUsed) / prev.timeUsed) * 100) : null;

  const styles = `
    .aci-root{background:${INK};color:${BONE};font-family:${MONO};min-height:100%;padding:14px;position:relative;overflow:hidden}
    .aci-root:before{content:"";position:absolute;inset:0;pointer-events:none;z-index:5;
      background:repeating-linear-gradient(to bottom,rgba(0,0,0,.14) 0,rgba(0,0,0,.14) 1px,transparent 1px,transparent 3px)}
    .wrap{max-width:960px;margin:0 auto;position:relative;z-index:1}
    .bar{display:flex;align-items:center;gap:10px;border-bottom:3px solid ${RED};padding-bottom:10px;margin-bottom:16px}
    .brand{font-family:${HEAVY};font-size:13px;letter-spacing:.14em;line-height:1.15}
    .brand small{display:block;color:${STEEL};font-family:${MONO};font-size:9px;letter-spacing:.22em;margin-top:2px}
    .panel{background:${PANEL};border:3px solid ${BONE};box-shadow:6px 6px 0 ${RED};padding:16px;margin-bottom:16px}
    .panel-quiet{box-shadow:6px 6px 0 #000}
    h1{font-family:${HEAVY};font-size:clamp(26px,7vw,46px);line-height:.94;margin:0 0 10px;text-transform:uppercase}
    h1 em{font-style:normal;color:${RED}}
    h2{font-family:${HEAVY};font-size:15px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px}
    p{font-size:13px;line-height:1.6;margin:0 0 10px;color:#DAD5CC}
    .eyebrow{font-size:10px;letter-spacing:.26em;color:${AMBER};text-transform:uppercase;margin-bottom:6px}
    .btn{font-family:${HEAVY};font-size:14px;letter-spacing:.1em;text-transform:uppercase;background:${RED};color:${BONE};
      border:3px solid ${BONE};box-shadow:5px 5px 0 #000;padding:13px 22px;cursor:pointer;width:100%}
    .btn:hover{transform:translate(2px,2px);box-shadow:3px 3px 0 #000}
    .btn:active{transform:translate(5px,5px);box-shadow:0 0 0 #000}
    .btn:disabled{cursor:not-allowed}
    .btn:disabled:hover{transform:none;box-shadow:5px 5px 0 #000}
    .s-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
    @media (max-width:620px){.s-strip{grid-template-columns:repeat(2,1fr)}}
    .s-cell{border:3px solid ${STEEL};background:#0C0A09;padding:8px 7px;min-height:104px}
    .s-num{font-family:${HEAVY};font-size:16px;line-height:1;color:${STEEL}}
    .s-name{font-family:${HEAVY};font-size:11px;letter-spacing:.04em;margin-top:3px;line-height:1.15}
    .s-jp{font-size:8px;letter-spacing:.18em;color:${STEEL};margin-top:2px}
    .s-line{font-size:10px;line-height:1.4;color:#DAD5CC;margin-top:6px}
    .s-game{font-size:8px;letter-spacing:.12em;color:${STEEL};margin-top:6px}
    .s-now{border-color:${AMBER};background:rgba(232,179,58,.1)}
    .s-now .s-num,.s-now .s-name{color:${AMBER}}
    .s-done{border-color:${RED}}
    .s-done .s-num{color:${RED}}
    .s-todo{opacity:.55}
    .joker-row{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}
    .joker-card{position:relative;width:54px;aspect-ratio:2/2.9;background:${BONE};border:3px solid ${INK};
      border-radius:3px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;opacity:.55}
    .joker-card span{font-size:24px;color:${STEEL}}
    .joker-x{position:absolute;inset:0;background:
      linear-gradient(to bottom right,transparent calc(50% - 2px),${RED} calc(50% - 2px),${RED} calc(50% + 2px),transparent calc(50% + 2px)),
      linear-gradient(to bottom left,transparent calc(50% - 2px),${RED} calc(50% - 2px),${RED} calc(50% + 2px),transparent calc(50% + 2px))}
    .joker-txt{flex:1 1 220px;min-width:0}
    .joker-txt p{margin-bottom:8px}
    .how-grid{display:flex;flex-direction:column;gap:8px}
    .how-cell{display:flex;gap:10px;align-items:flex-start;border-left:4px solid ${AMBER};padding:4px 0 4px 10px}
    .how-num{font-family:${HEAVY};font-size:20px;color:${AMBER};line-height:1;min-width:18px}
    .how-txt{font-size:13px;line-height:1.5;color:#DAD5CC}
    .how-txt b{color:${BONE}}
    .tag-chip{display:inline-block;background:${AMBER};color:${INK};font-family:${HEAVY};font-size:11px;
      letter-spacing:.1em;padding:4px 10px;margin-bottom:8px}
    .btn-ghost{background:transparent;color:${BONE}}
    .hud{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    .hud-box{flex:1 1 78px;background:${PANEL};border:3px solid ${BONE};padding:7px 8px;text-align:center}
    .hud-label{font-size:8px;letter-spacing:.18em;color:${STEEL}}
    .hud-val{font-family:${HEAVY};font-size:clamp(17px,5vw,26px);line-height:1.1}
    .target{background:${BONE};color:${INK};border:3px solid ${RED};padding:8px;text-align:center;margin-bottom:10px}
    .target-lbl{font-size:9px;letter-spacing:.24em;color:${STEEL}}
    .target-val{font-family:${HEAVY};font-size:clamp(26px,9vw,40px);line-height:1}

    .stage{position:relative;border:3px solid ${STEEL};background:#0C0A09;overflow:hidden;touch-action:none;
      aspect-ratio:16/11;cursor:grab;user-select:none}
    .stage:active{cursor:grabbing}
    .stage.fixed{cursor:default}
    .stage:focus-visible{outline:3px solid ${AMBER};outline-offset:2px}
    .floor{position:absolute;left:0;top:0;background:${CONCRETE};
      background-image:linear-gradient(rgba(0,0,0,.22) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.22) 1px,transparent 1px);
      background-size:44px 44px}
    .lane{position:absolute;left:0;right:0;height:10px;background:repeating-linear-gradient(90deg,${AMBER} 0 22px,transparent 22px 40px);opacity:.5}
    .bay-tag{position:absolute;font-family:${HEAVY};font-size:34px;letter-spacing:.1em;color:rgba(242,239,233,.055);white-space:nowrap}
    .rack{position:absolute;background:#1A1714;border:2px solid rgba(242,239,233,.09)}
    .zone{position:absolute;border:4px dashed rgba(242,239,233,.34);background:rgba(0,0,0,.28);padding:22px 8px 8px}
    .zone-tag{position:absolute;top:-3px;left:-3px;font-size:10px;letter-spacing:.18em;padding:4px 9px;color:${INK};font-weight:700}
    .zone-grid{display:grid;gap:4px;height:100%;align-content:start}

    .card{aspect-ratio:2/2.9;background:${BONE};border:3px solid ${INK};border-radius:3px;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:1px;cursor:pointer;padding:0;font-family:${MONO};line-height:1;transition:filter .08s}
    .card:focus-visible{outline:3px solid ${AMBER};outline-offset:2px}
    .card-rank{font-size:clamp(13px,3vw,22px);font-weight:800;line-height:1}
    .card-suit{font-size:clamp(15px,3.6vw,26px);line-height:1}
    .card-joker{font-size:20px}
    .card-abs{position:absolute;box-shadow:3px 3px 0 rgba(0,0,0,.6)}
    .card-abs:hover:not(:disabled){filter:brightness(1.15)}
    .card-back{background:#7A4A2B;border-color:${INK}}
    .card-tote{width:64%;height:44%;border:2px solid rgba(0,0,0,.35);border-top-width:6px}
    .card-wrong{opacity:.55;animation:shake .22s}
    .card-found{box-shadow:0 0 0 3px ${AMBER};animation:pop .3s;opacity:1!important}
    .card-flipping{animation:flip .3s}
    @keyframes flip{0%{transform:rotate(var(--rot,0deg)) scaleX(1)}50%{transform:rotate(var(--rot,0deg)) scaleX(.05)}100%{transform:rotate(var(--rot,0deg)) scaleX(1)}}
    @keyframes shake{0%,100%{transform:rotate(var(--rot,0deg)) translateX(0)}25%{transform:rotate(var(--rot,0deg)) translateX(-4px)}75%{transform:rotate(var(--rot,0deg)) translateX(4px)}}
    @keyframes pop{0%,100%{transform:rotate(var(--rot,0deg)) scale(1)}50%{transform:rotate(var(--rot,0deg)) scale(1.3)}}

    .edge{position:absolute;z-index:12;pointer-events:none;font-family:${HEAVY};font-size:22px;color:${AMBER};
      text-shadow:2px 2px 0 #000;animation:beat 1.1s infinite}
    @keyframes beat{0%,100%{opacity:.35}50%{opacity:1}}
    .minimap{position:absolute;right:8px;top:8px;z-index:14;background:rgba(12,10,9,.86);border:2px solid ${STEEL};padding:3px}
    .minimap-inner{position:relative;width:78px;height:52px;background:#2B2724}
    .minimap-vp{position:absolute;border:2px solid ${AMBER};background:rgba(232,179,58,.22)}
    .minimap-cap{font-size:7px;letter-spacing:.14em;color:${STEEL};text-align:center;margin-top:2px}
    .pad{position:absolute;left:8px;bottom:8px;z-index:14;display:grid;grid-template-columns:repeat(3,26px);
      grid-template-rows:repeat(2,22px);gap:2px}
    .pad button{background:rgba(12,10,9,.86);border:2px solid ${STEEL};color:${BONE};font-size:11px;cursor:pointer;padding:0}
    .pad button:hover{border-color:${AMBER};color:${AMBER}}
    .hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);z-index:14;background:rgba(12,10,9,.9);
      border:2px solid ${AMBER};color:${AMBER};font-size:10px;letter-spacing:.16em;padding:6px 12px;white-space:nowrap}
    .banner{position:absolute;left:0;right:0;top:38%;z-index:16;background:${RED};color:${BONE};font-family:${HEAVY};
      font-size:clamp(13px,3.4vw,20px);letter-spacing:.06em;text-align:center;padding:10px;border-top:3px solid ${INK};
      border-bottom:3px solid ${INK};animation:slam .3s}
    @keyframes slam{0%{transform:scaleY(0)}70%{transform:scaleY(1.1)}100%{transform:scaleY(1)}}
    .handling{font-size:10px;letter-spacing:.2em;color:${AMBER};min-height:14px;margin-bottom:6px}

    .overlay{position:fixed;inset:0;z-index:40;background:rgba(10,8,7,.94);display:flex;align-items:center;justify-content:center;padding:18px;animation:fade .18s}
    @keyframes fade{from{opacity:0}to{opacity:1}}
    .reveal-box{background:${PANEL};border:4px solid ${BONE};box-shadow:8px 8px 0 ${RED};padding:22px;max-width:420px;width:100%;text-align:center}
    .reveal-card{width:100px;aspect-ratio:2/2.9;background:${BONE};border:4px solid ${INK};margin:0 auto 14px;display:flex;
      flex-direction:column;align-items:center;justify-content:center;animation:reveal .45s}
    @keyframes reveal{0%{transform:rotateY(90deg) scale(.6)}60%{transform:rotateY(0) scale(1.15)}100%{transform:scale(1)}}
    .reveal-rank{font-family:${HEAVY};font-size:32px;line-height:1}
    .reveal-suit{font-size:36px;line-height:1}
    .reveal-verdict{font-family:${HEAVY};font-size:clamp(24px,8vw,38px);text-transform:uppercase;margin-bottom:4px}

    .sup{display:flex;align-items:center;gap:12px;background:#0C0A09;border:3px solid ${RED};padding:8px 12px}
    .sup-cap{font-family:${HEAVY};font-size:12px;letter-spacing:.08em;color:${AMBER}}
    .sup-role{font-size:9px;letter-spacing:.2em;color:${STEEL};margin-top:3px}
    .split{display:flex;gap:14px;flex-wrap:wrap}
    .split>*{flex:1 1 260px}
    .stat-row{display:flex;justify-content:space-between;border-bottom:1px dotted #3A342F;padding:7px 0;font-size:12px}
    .stat-row b{font-family:${HEAVY}}
    .good{color:${AMBER}}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{text-align:left;font-size:9px;letter-spacing:.14em;color:${STEEL};border-bottom:2px solid ${STEEL};padding:6px 4px}
    td{padding:7px 4px;border-bottom:1px dotted #3A342F;vertical-align:top}
    .waste-name{color:${RED};font-weight:700;white-space:nowrap}
    .waste-num{font-family:${HEAVY};color:${AMBER};white-space:nowrap}
    .timer-low{color:${RED}}
    .kicker{font-family:${HEAVY};font-size:11px;letter-spacing:.16em;color:${RED};text-transform:uppercase}
    @media (max-width:620px){.stage{aspect-ratio:3/4}.minimap-inner{width:58px;height:40px}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
  `;

  const Header = () => (
    <div className="bar">
      <Logo size={44} />
      <div className="brand">
        ANDERSEN CI
        <small>5S FLOOR WALK</small>
      </div>
    </div>
  );

  /* ---------- floor dressing ---------- */
  const dressing = useMemo(() => {
    const lanes = [];
    const rows = Math.round(round.floorH * 3);
    for (let i = 1; i <= rows; i++) lanes.push((i * 100) / (rows + 1));
    const tags = [];
    const cols = Math.round(round.floorW * 2);
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < Math.max(1, rows - 1); r++)
        tags.push({ left: (c * 100) / cols + 3, top: (r * 100) / Math.max(1, rows - 1) + 6, txt: `AISLE ${c + 1}-${String.fromCharCode(65 + r)}` });
    return (
      <>
        {lanes.map((t, i) => (
          <div className="lane" key={i} style={{ top: `${t}%` }} />
        ))}
        {tags.map((t, i) => (
          <div className="bay-tag" key={i} style={{ left: `${t.left}%`, top: `${t.top}%` }}>
            {t.txt}
          </div>
        ))}
        <div className="rack" style={{ left: 0, top: 0, width: "100%", height: "10px" }} />
        <div className="rack" style={{ left: 0, bottom: 0, width: "100%", height: "10px" }} />
      </>
    );
  }, [roundIdx]);

  /* ---------- intro ---------- */
  if (phase === "intro") {
    return (
      <div className="aci-root">
        <style>{styles}</style>
        <div className="wrap">
          <Header />
          <div className="panel">
            <div className="eyebrow">Five rounds · 30 seconds each</div>
            <h1>
              Find the part.<br />
              <em>Beat the clock.</em>
            </h1>
            <p>
              <b>A deck of 54 playing cards is dumped across a plant floor.</b> Those cards are your parts, tools and
              totes — every item somebody has to go find to do their job.
            </p>
            <p>
              You get a work order: <b>one card to bring back</b>. Find it before the clock hits zero.
            </p>
            <p>
              <span className="kicker">Clock runs 60:1.</span> One second here = one minute out there.
            </p>
          </div>

          <div className="panel panel-quiet">
            <h2>How to play</h2>
            <div className="how-grid">
              <div className="how-cell">
                <div className="how-num">1</div>
                <div className="how-txt">
                  <b>DRAG</b> the floor to walk around it. It's bigger than your screen.
                </div>
              </div>
              <div className="how-cell">
                <div className="how-num">2</div>
                <div className="how-txt">
                  <b>TAP</b> a card to pick it up and read it. Takes time, same as real life.
                </div>
              </div>
              <div className="how-cell">
                <div className="how-num">3</div>
                <div className="how-txt">
                  <b>MATCH</b> the work order card at the top of the screen.
                </div>
              </div>
            </div>
          </div>

          <div className="panel panel-quiet">
            <h2>The point</h2>
            <p>
              <b>The deck never changes. How it's organized does.</b> Round 1 it's face-down in six unmarked aisles.
              Round 5 it's sorted by suit and rank on one screen.
            </p>
            <p>Same 54 cards, same job, every round. Watch what happens to your time.</p>
            <div className="sup" style={{ marginTop: 12 }}>
              <Supervisor mood={0} size={64} />
              <div>
                <div className="sup-cap">{MOOD_CAPTION[0]}</div>
                <div className="sup-role">HE GETS HAPPIER AS THE FLOOR GETS BETTER</div>
              </div>
            </div>
          </div>

          <button className="btn" onClick={() => startRound(0)}>
            Clock in
          </button>
        </div>
      </div>
    );
  }

  /* ---------- play + reveal + tutorial (same floor, tutorial pauses the clock) ---------- */
  if (phase === "play" || phase === "reveal") {
    const low = timeLeft <= 8;
    const zones = round.mode === "zones" ? ZONE_LAYOUTS[round.n](groups) : null;
    const canL = offset.x < -2;
    const canR = offset.x > vp.w - floorW + 2;
    const canU = offset.y < -2;
    const canD = offset.y > vp.h - floorH + 2;

    return (
      <div className="aci-root">
        <style>{styles}</style>
        <div className="wrap">
          <Header />

          <div className="sup" style={{ marginBottom: 12 }}>
            <Supervisor mood={round.mood} size={64} />
            <div>
              <div className="sup-cap">{MOOD_CAPTION[round.mood]}</div>
              <div className="sup-role">
                ROUND {round.n} · {round.step}
              </div>
            </div>
          </div>

          <div className="hud">
            <div className="hud-box">
              <div className="hud-label">TIME LEFT</div>
              <div className={`hud-val ${low ? "timer-low" : ""}`}>{timeLeft.toFixed(1)}</div>
            </div>
            <div className="hud-box">
              <div className="hud-label">STEPS WALKED</div>
              <div className="hud-val">{Math.round(steps)}</div>
            </div>
            <div className="hud-box">
              <div className="hud-label">HANDLED</div>
              <div className="hud-val">{stats.handled}</div>
            </div>
            <div className="hud-box">
              <div className="hud-label">FLOOR TIME</div>
              <div className="hud-val">{Math.round(ROUND_TIME - timeLeft)}m</div>
            </div>
          </div>

          <div className="target">
            <div className="target-lbl">WORK ORDER — PULL THIS ONE</div>
            <div className="target-val" style={{ color: target.red ? RED : INK }}>
              {target.joker ? "JOKER" : `${target.rank}${target.sym}`}
            </div>
          </div>

          <div className="tag-chip">{round.duringTag}</div>
          <div className="handling">{locked && phase === "play" ? "HANDLING — SETTING IT BACK DOWN" : ""}</div>

          <div
            className={`stage ${pannable ? "" : "fixed"}`}
            ref={vpRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{ touchAction: pannable ? "none" : "auto", cursor: pannable ? undefined : "default" }}
            aria-label="Plant floor. Drag or use arrow keys to walk."
          >
            <div
              className="floor"
              style={{ width: floorW, height: floorH, transform: `translate(${offset.x}px, ${offset.y}px)` }}
            >
              {dressing}

              {round.mode === "scatter" &&
                groups[0]?.cards.map((c) => (
                  <Card
                    key={c.id}
                    card={c}
                    faceDown={round.faceDown}
                    revealed={!!revealed[c.id]}
                    status={revealed[c.id]}
                    onPick={onPick}
                    disabled={!!revealed[c.id] || locked || phase !== "play"}
                    pos={positions?.[c.id]}
                    widthPct={round.cardW}
                    flipping={flipping === c.id}
                  />
                ))}

              {zones?.map((z, zi) => (
                <div
                  className="zone"
                  key={zi}
                  style={{ left: `${z.left}%`, top: `${z.top}%`, width: `${z.width}%`, height: `${z.height}%`, borderColor: z.tape }}
                >
                  <div className="zone-tag" style={{ background: z.tape }}>
                    {z.label}
                  </div>
                  <div className="zone-grid" style={{ gridTemplateColumns: `repeat(${round.cols},1fr)` }}>
                    {z.cards.map((c) => (
                      <Card
                        key={c.id}
                        card={c}
                        faceDown={false}
                        revealed={!!revealed[c.id]}
                        status={revealed[c.id]}
                        onPick={onPick}
                        disabled={!!revealed[c.id] || locked || phase !== "play"}
                        flipping={flipping === c.id}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {pannable && phase === "play" && (
              <>
                {canL && <div className="edge" style={{ left: 6, top: "48%" }}>{"\u25C0"}</div>}
                {canR && <div className="edge" style={{ right: 6, top: "48%" }}>{"\u25B6"}</div>}
                {canU && <div className="edge" style={{ left: "48%", top: 4 }}>{"\u25B2"}</div>}
                {canD && <div className="edge" style={{ left: "48%", bottom: 4 }}>{"\u25BC"}</div>}
                <div className="minimap">
                  <div className="minimap-inner">
                    <div
                      className="minimap-vp"
                      style={{
                        left: `${(-offset.x / floorW) * 100}%`,
                        top: `${(-offset.y / floorH) * 100}%`,
                        width: `${(vp.w / floorW) * 100}%`,
                        height: `${(vp.h / floorH) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="minimap-cap">YOU ARE HERE</div>
                </div>
                <div className="pad">
                  <span />
                  <button onClick={() => nudge(0, 140)} aria-label="Walk up">{"\u25B2"}</button>
                  <span />
                  <button onClick={() => nudge(140, 0)} aria-label="Walk left">{"\u25C0"}</button>
                  <button onClick={() => nudge(0, -140)} aria-label="Walk down">{"\u25BC"}</button>
                  <button onClick={() => nudge(-140, 0)} aria-label="Walk right">{"\u25B6"}</button>
                </div>
                {showHint && <div className="hint">DRAG TO WALK THE FLOOR</div>}
              </>
            )}

            {banner && <div className="banner">{banner}</div>}
          </div>
        </div>

        {phase === "reveal" && (
          <div className="overlay" role="dialog" aria-live="assertive">
            <div className="reveal-box">
              <div className="reveal-card" style={{ color: target.red ? RED : INK }}>
                {target.joker ? (
                  <span className="reveal-suit">{target.sym}</span>
                ) : (
                  <>
                    <span className="reveal-rank">{target.rank}</span>
                    <span className="reveal-suit">{target.sym}</span>
                  </>
                )}
              </div>
              <div className="reveal-verdict" style={{ color: outcome === "found" ? AMBER : RED }}>
                {outcome === "found" ? "Got it" : "Time's up"}
              </div>
              <p style={{ marginBottom: 14 }}>
                {outcome === "found"
                  ? `${curr.timeUsed.toFixed(1)} seconds · ${curr.steps} steps · ${curr.handled} items handled — ${Math.round(
                      curr.timeUsed
                    )} minutes on the floor.`
                  : `Thirty minutes gone and the part never made it to the tech. It's highlighted on the floor behind this.`}
              </p>
              <button className="btn" onClick={() => setPhase("debrief")}>
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---------- debrief ---------- */
  if (phase === "debrief") {
    const last = roundIdx === ROUNDS.length - 1;
    const wastes = [
      ["Transport", `${curr.steps} steps walked to and from the same aisles`],
      ["Inventory", `Two jokers still in the deck — nothing tagged obsolete`],
      ["Motion", `${curr.handled} items picked up, turned over, set back down`],
      ["Waiting", `${Math.round(curr.timeUsed)} minutes with a tech standing at the bench`],
      ["Overprocessing", `${curr.repeats} cards checked twice — nothing marked them checked`],
      ["Defects", `${curr.wrongPicks} wrong parts pulled toward the job`],
      ["Skills", `Nobody asked the person who searches this aisle every day`],
    ];

    return (
      <div className="aci-root">
        <style>{styles}</style>
        <div className="wrap">
          <Header />
          <div className="panel">
            <div className="eyebrow">
              Round {round.n} complete · {round.step}
            </div>
            <h1 style={{ fontSize: "clamp(20px,5.5vw,32px)" }}>{curr.timedOut ? <em>Never found it.</em> : round.headline}</h1>
            <div className="sup" style={{ margin: "14px 0" }}>
              <Supervisor mood={round.mood} size={68} />
              <div>
                <div className="sup-cap">{MOOD_CAPTION[round.mood]}</div>
                <div className="sup-role">SHOP SUPERVISOR</div>
              </div>
            </div>
            <div className="stat-row">
              <span>Time used</span>
              <b>{curr.timeUsed.toFixed(1)}s</b>
            </div>
            <div className="stat-row">
              <span>Equivalent search on the floor</span>
              <b>{Math.round(curr.timeUsed)} min</b>
            </div>
            <div className="stat-row">
              <span>Steps walked</span>
              <b>{curr.steps}</b>
            </div>
            <div className="stat-row">
              <span>Items handled</span>
              <b>{curr.handled}</b>
            </div>
            {improvement !== null && (
              <div className="stat-row">
                <span>Change vs round {prev.n}</span>
                <b className={improvement > 0 ? "good" : ""}>
                  {improvement > 0 ? `${improvement}% faster` : `${Math.abs(improvement)}% slower`}
                </b>
              </div>
            )}
          </div>

          <div className="panel panel-quiet">
            <h2>Where you are in 5S</h2>
            <FiveSStrip
              active={round.sIndex}
              done={ROUNDS.slice(0, roundIdx).map((r) => r.sIndex).filter((i) => i >= 0 && i !== round.sIndex)}
            />
            {round.sIndex < 0 && (
              <p style={{ marginTop: 10, color: STEEL }}>Round 1 is the before picture — no S applied yet.</p>
            )}
          </div>

          {round.n === 2 && (
            <div className="panel">
              <h2>Two cards just left the building</h2>
              <div className="joker-row">
                <div className="joker-card">
                  <span>★</span>
                  <div className="joker-x" />
                </div>
                <div className="joker-card">
                  <span>★</span>
                  <div className="joker-x" />
                </div>
                <div className="joker-txt">
                  <p>
                    <b>Two jokers were in that deck the whole time.</b> They're not parts. No work order can ever call
                    for one. They sat in the aisles taking up space and making every search bigger.
                  </p>
                  <p style={{ color: AMBER, marginBottom: 0 }}>
                    Sort found them. Next round the deck is 52 — you search 4% less floor without moving a rack or
                    spending a dollar.
                  </p>
                </div>
              </div>
              <p style={{ marginTop: 12, color: STEEL, marginBottom: 0 }}>
                That's <b>Inventory waste</b>: stuff you're storing, walking around and looking past that nobody will
                ever pull. Every shop has jokers. They just don't have stars on them.
              </p>
            </div>
          )}

          {round.n === 1 && (
            <div className="panel">
              <h2>What that cost you — TIMWOODS</h2>
              <p style={{ color: STEEL }}>Seven wastes, your numbers, one search.</p>
              <table>
                <tbody>
                  {wastes.map(([name, detail]) => (
                    <tr key={name}>
                      <td className="waste-name">{name}</td>
                      <td>{detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ marginTop: 12, color: AMBER }}>
                Overproduction is the eighth and it doesn't show up in a search — you can't make too many of something you
                never found. The other seven were all on that floor at the same time.
              </p>
            </div>
          )}

          <div className="split">
            <div className="panel panel-quiet">
              <h2>{round.tag}</h2>
              <p>{round.after}</p>
              <p style={{ color: AMBER }}>{round.waste}</p>
            </div>
            <div className="panel panel-quiet">
              <h2>Out in the real world</h2>
              <p>{round.parallel}</p>
              {round.n >= 3 && (
                <p style={{ color: STEEL }}>
                  You worked that layout out in a few seconds. The people who walk this floor every day have been
                  carrying the answer around for years.
                </p>
              )}
            </div>
          </div>

          <button className="btn" onClick={() => (last ? setPhase("final") : startRound(roundIdx + 1))}>
            {last ? "See the full results" : `Walk out to round ${round.n + 1}`}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- final ---------- */
  const maxT = Math.max(...results.map((r) => r.timeUsed), 1);
  const first = results[0];
  const lastR = results[results.length - 1];
  const savedMin = Math.max(0, Math.round(first.timeUsed - lastR.timeUsed));
  const stepsSaved = Math.max(0, first.steps - lastR.steps);
  const chartW = 320;
  const chartH = 150;
  const barW = chartW / results.length;

  return (
    <div className="aci-root">
      <style>{styles}</style>
      <div className="wrap">
        <Header />
        <div className="panel">
          <div className="eyebrow">Shift complete</div>
          <h1>
            Same deck.<br />
            <em>{savedMin} minutes back.</em>
          </h1>
          <p>
            Nothing about the cards changed. Fifty-two pieces of cardboard, start to finish. What changed was the floor
            they sat on — and that was worth {savedMin} minutes and {stepsSaved} steps on every single search.
          </p>
        </div>

        <div className="split">
          <div className="panel panel-quiet">
            <h2>Search time by round</h2>
            <svg viewBox={`0 0 ${chartW} ${chartH + 34}`} width="100%" role="img" aria-label="Search time by round">
              <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke={STEEL} strokeWidth="2" />
              {results.map((r, i) => {
                const h = Math.max(4, (r.timeUsed / maxT) * (chartH - 22));
                const x = i * barW + barW * 0.18;
                const w = barW * 0.64;
                return (
                  <g key={i}>
                    <rect x={x} y={chartH - h} width={w} height={h} fill={i === results.length - 1 ? AMBER : RED} stroke={INK} strokeWidth="2" />
                    <text x={x + w / 2} y={chartH - h - 6} fill={BONE} fontSize="11" fontFamily={MONO} textAnchor="middle">
                      {Math.round(r.timeUsed)}m
                    </text>
                    <text x={x + w / 2} y={chartH + 15} fill={STEEL} fontSize="10" fontFamily={MONO} textAnchor="middle">
                      R{r.n}
                    </text>
                    <text x={x + w / 2} y={chartH + 28} fill={STEEL} fontSize="8" fontFamily={MONO} textAnchor="middle">
                      {ROUNDS[i].tag.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p style={{ fontSize: 11, color: STEEL }}>Bars show equivalent floor time at 60:1 compression.</p>
          </div>

          <div className="panel panel-quiet">
            <h2>Round by round</h2>
            <table>
              <thead>
                <tr>
                  <th>RD</th>
                  <th>STEP</th>
                  <th>TIME</th>
                  <th>STEPS</th>
                  <th>HANDLED</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.n}</td>
                    <td>{ROUNDS[i].tag}</td>
                    <td>{r.timeUsed.toFixed(1)}s</td>
                    <td>{r.steps}</td>
                    <td>{r.handled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="sup" style={{ border: "none", padding: 0, background: "transparent", marginBottom: 14 }}>
            <Supervisor mood={4} size={96} />
            <div>
              <div className="sup-cap">{MOOD_CAPTION[4]}</div>
              <div className="sup-role">SHOP SUPERVISOR</div>
            </div>
          </div>
          <h2>All five</h2>
          <FiveSStrip active={-1} done={[0, 1, 2, 3, 4]} />
          <h2 style={{ marginTop: 18 }}>Shine and sustain</h2>
          <p>
            Two S's never showed up on the board, because a five-minute game can't fake either one. <b>Shine</b> is what
            keeps a layout readable — a clean bay shows you what's missing before you go looking for it.{" "}
            <b>Sustain</b> is the hard one, and you already met it: second shift moved things in Round 1 and the whole
            floor went back to chaos in two seconds. A layout only holds if the next person puts it back.
          </p>
          <p>
            You just felt what a lot of people feel all day. Thirty minutes gone in the aisles. Five when it's
            organized. Under a minute when there's one way to do it.
          </p>
          <p style={{ color: AMBER }}>
            You sorted this floor yourself. Nobody handed you the system. Out in your own area you already know what's in
            the way, what's never used, and what should have moved a year ago — you've been walking around it this whole
            time. 5S isn't done to you. It's done by you, because you're the one who knows.
          </p>
        </div>

        <button className="btn btn-ghost" onClick={reset}>
          Run it again
        </button>
      </div>
    </div>
  );
}
