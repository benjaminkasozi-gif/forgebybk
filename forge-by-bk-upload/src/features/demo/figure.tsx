import { FLOOR, H, W, type JointName, type Solved, type V } from "./rig";
import type { Line, Load, SceneItem } from "./motions";

/** Avatar palette, taken from the athlete's photo: warm brown skin, short dark hair, goatee, black polo. */
const C = {
  skin: "#b67a58",
  skinFar: "#8f5c40",
  skinShade: "#9b6446",
  hair: "#17110e",
  polo: "#18191d",
  poloFar: "#0f1013",
  poloEdge: "#2c2f36",
  shorts: "#2c313b",
  shortsFar: "#1d2129",
  sock: "#e7e7e7",
  shoe: "#f1f1f1",
  shoeEdge: "#8d949e",
  badge: "#a3232f",
  metal: "#aab3bd",
  plate: "#1f2329",
  rim: "#3c424c",
  pad: "#2b2f37",
  padEdge: "#3a3f49",
  frame: "#4d5561",
  cable: "#c7cfd8",
};

const P = (v: V) => `${v[0].toFixed(1)},${v[1].toFixed(1)}`;
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s];
const mix = (a: V, b: V, u: number): V => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const unit = (a: V): V => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const rad = (d: number) => (d * Math.PI) / 180;

function Seg({ a, b, w, c }: { a: V; b: V; w: number; c: string }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap="round" />;
}

/* ─────────────── Background & equipment ─────────────── */

export function GymBackdrop() {
  return (
    <g>
      <defs>
        <linearGradient id="fg-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1e24" />
          <stop offset="1" stopColor="#14161a" />
        </linearGradient>
        <linearGradient id="fg-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#101114" />
          <stop offset="1" stopColor="#0b0c0e" />
        </linearGradient>
        <radialGradient id="fg-light" cx="0.5" cy="0" r="0.8">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={FLOOR} fill="url(#fg-wall)" />
      <rect width={W} height={FLOOR} fill="url(#fg-light)" />
      {/* Mirror panels and brand stripe */}
      {[18, 112, 206].map((x) => <rect key={x} x={x} y={26} width={84} height={120} rx={2} fill="#ffffff" opacity={0.025} />)}
      <rect x={0} y={160} width={W} height={2} fill="hsl(var(--accent))" opacity={0.35} />
      <rect x={0} y={FLOOR - 6} width={W} height={6} fill="#22252b" />
      <rect y={FLOOR} width={W} height={H - FLOOR} fill="url(#fg-floor)" />
      {[0, 60, 120, 180, 240].map((x) => <line key={x} x1={x} y1={FLOOR} x2={x - 18} y2={H} stroke="#1a1c20" strokeWidth={1} />)}
    </g>
  );
}

function Bench({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return (
    <g>
      <Seg a={[x1 + 12, y + 8]} b={[x1 + 8, FLOOR]} w={4} c={C.frame} />
      <Seg a={[x2 - 12, y + 8]} b={[x2 - 8, FLOOR]} w={4} c={C.frame} />
      <Seg a={[x1 + 2, FLOOR - 1]} b={[x1 + 18, FLOOR - 1]} w={3} c={C.frame} />
      <Seg a={[x2 - 18, FLOOR - 1]} b={[x2 - 2, FLOOR - 1]} w={3} c={C.frame} />
      <rect x={x1} y={y} width={x2 - x1} height={9} rx={4} fill={C.pad} stroke={C.padEdge} strokeWidth={1} />
    </g>
  );
}

export function SceneItemView({ s }: { s: SceneItem }) {
  switch (s.k) {
    case "bench":
      return <Bench {...s} />;
    case "seat":
      return (
        <g>
          <Seg a={[s.x + s.w / 2, s.y + 6]} b={[s.x + s.w / 2, FLOOR]} w={5} c={C.frame} />
          <Seg a={[s.x + s.w / 2 - 16, FLOOR - 1]} b={[s.x + s.w / 2 + 16, FLOOR - 1]} w={3} c={C.frame} />
          <rect x={s.x} y={s.y} width={s.w} height={9} rx={4} fill={C.pad} stroke={C.padEdge} />
        </g>
      );
    case "box":
      return (
        <g>
          <rect x={s.x} y={s.top} width={s.w} height={FLOOR - s.top} rx={2} fill="#2a2d33" stroke="#3a3e46" />
          <rect x={s.x} y={s.top} width={s.w} height={3} rx={1.5} fill="hsl(var(--accent))" opacity={0.5} />
        </g>
      );
    case "rack":
      return (
        <g opacity={0.75}>
          <rect x={s.x - 3.5} y={30} width={7} height={FLOOR - 30} fill={C.frame} />
          {Array.from({ length: 14 }, (_, i) => <circle key={i} cx={s.x} cy={44 + i * 11} r={1} fill="#2a2f37" />)}
          <rect x={s.x - 14} y={FLOOR - 4} width={28} height={4} fill={C.frame} />
        </g>
      );
    case "smith":
      return (
        <g opacity={0.6}>
          <rect x={s.x - 2.5} y={10} width={5} height={FLOOR - 10} fill={C.metal} />
          <rect x={s.x - 16} y={6} width={32} height={6} rx={2} fill={C.frame} />
        </g>
      );
    case "pullbar":
      return (
        <g>
          <Seg a={[s.x + 48, s.y - 6]} b={[s.x + 48, FLOOR]} w={7} c={C.frame} />
          <Seg a={[s.x + 48, s.y]} b={[s.x, s.y]} w={4} c={C.frame} />
          <circle cx={s.x} cy={s.y} r={3.5} fill={C.metal} />
        </g>
      );
    case "dipbars":
      return (
        <g>
          <Seg a={[s.x1 + 10, s.y]} b={[s.x1 + 10, FLOOR]} w={5} c={C.frame} />
          <Seg a={[s.x2 - 10, s.y]} b={[s.x2 - 10, FLOOR]} w={5} c={C.frame} />
          <Seg a={[s.x1, s.y]} b={[s.x2, s.y]} w={5} c={C.metal} />
        </g>
      );
    case "stack": {
      const side = s.x < W / 2 ? 1 : -1;
      return (
        <g>
          <rect x={s.x - 11} y={16} width={22} height={FLOOR - 16} rx={2} fill="#21252b" stroke="#30353d" />
          {Array.from({ length: 9 }, (_, i) => <rect key={i} x={s.x - 8} y={FLOOR - 10 - i * 5.5} width={16} height={4.5} rx={1} fill={C.plate} stroke={C.rim} strokeWidth={0.6} />)}
          <circle cx={s.x + side * 11} cy={s.pulley} r={4.5} fill={C.frame} stroke={C.metal} strokeWidth={1} />
        </g>
      );
    }
    case "pad":
      return (
        <g>
          <Seg a={[s.x, s.y]} b={[s.x, FLOOR]} w={5} c={C.frame} />
          <rect x={-s.len / 2} y={-5} width={s.len} height={10} rx={5} fill={C.pad} stroke={C.padEdge} transform={`translate(${s.x} ${s.y}) rotate(${s.angle})`} />
        </g>
      );
    case "plate":
      return <rect x={-17} y={-2.5} width={34} height={5} rx={2} fill={C.metal} transform={`translate(${s.x} ${s.y}) rotate(${s.angle})`} />;
    case "rail":
      return <Seg a={[s.x1, s.y1]} b={[s.x2, s.y2]} w={6} c={C.frame} />;
    case "mat":
      return <rect x={s.x} y={FLOOR - 3} width={s.w} height={4} rx={2} fill="#1d2b2a" />;
    case "bike":
      return (
        <g>
          <circle cx={s.cx + 50} cy={s.cy - 8} r={22} fill="#1f2328" stroke={C.frame} strokeWidth={3} />
          <Seg a={[s.cx, s.cy]} b={s.seat} w={6} c={C.frame} />
          <Seg a={[s.cx, s.cy]} b={[s.cx + 50, s.cy - 8]} w={6} c={C.frame} />
          <Seg a={[s.cx + 30, s.cy - 4]} b={add(s.bars, [-6, 8])} w={6} c={C.frame} />
          <Seg a={[s.cx - 40, FLOOR - 2]} b={[s.cx + 80, FLOOR - 2]} w={5} c={C.frame} />
          <Seg a={[s.cx - 10, s.cy]} b={[s.cx - 30, FLOOR - 2]} w={5} c={C.frame} />
          <rect x={s.seat[0] - 12} y={s.seat[1] - 2} width={24} height={6} rx={3} fill={C.pad} />
          <Seg a={add(s.bars, [-8, 0])} b={add(s.bars, [8, -2])} w={4} c={C.metal} />
          <circle cx={s.cx} cy={s.cy} r={16} fill="none" stroke={C.frame} strokeWidth={1} opacity={0.6} />
        </g>
      );
    case "rower":
      return (
        <g>
          <Seg a={[40, 208]} b={[214, 208]} w={6} c={C.frame} />
          <Seg a={[44, 208]} b={[44, FLOOR]} w={4} c={C.frame} />
          <circle cx={228} cy={188} r={22} fill="#1f2328" stroke={C.frame} strokeWidth={3} />
          <Seg a={[210, 204]} b={[230, FLOOR]} w={4} c={C.frame} />
          <rect x={-14} y={-2.5} width={28} height={5} rx={2} fill={C.metal} transform="translate(180 204) rotate(-70)" />
        </g>
      );
    case "sled":
      return (
        <g>
          <rect x={s.x} y={FLOOR - 10} width={62} height={10} rx={2} fill={C.frame} />
          <rect x={s.x + 16} y={FLOOR - 30} width={8} height={20} rx={2} fill={C.plate} stroke={C.rim} />
          <rect x={s.x + 26} y={FLOOR - 30} width={8} height={20} rx={2} fill={C.plate} stroke={C.rim} />
          <Seg a={[s.x + 6, FLOOR - 10]} b={[s.x - 10, 150]} w={5} c={C.metal} />
        </g>
      );
  }
}

/* ─────────────── Loads & attachments ─────────────── */

function Plate({ c, r }: { c: V; r: number }) {
  return (
    <g>
      <circle cx={c[0]} cy={c[1]} r={r} fill={C.plate} stroke={C.rim} strokeWidth={1.5} />
      <circle cx={c[0]} cy={c[1]} r={r * 0.68} fill="none" stroke="hsl(var(--accent))" strokeWidth={1} opacity={0.55} />
      <circle cx={c[0]} cy={c[1]} r={Math.max(1.6, r * 0.2)} fill={C.metal} />
    </g>
  );
}

function LoadView({ l, s }: { l: Load; s: Solved }) {
  const { j } = s;
  const front = s.view === "front";
  const at = l.at ?? "hands";
  const points: V[] = at === "hands" ? (front ? [mix(j.hand, j.hand2, 0.5)] : [j.hand]) : [j[at]];
  const forearm = unit(sub(j.hand, j.elbow));
  switch (l.kind) {
    case "barbell":
      if (front && at === "hands") {
        const a = j.hand2, b = j.hand;
        const d = unit(sub(b, a));
        const e1 = sub(a, mul(d, 46)), e2 = add(b, mul(d, 46));
        return (
          <g>
            <Seg a={e1} b={e2} w={3} c={C.metal} />
            {[e1, e2].map((e, i) => <rect key={i} x={-4} y={-17} width={8} height={34} rx={2} fill={C.plate} stroke={C.rim} transform={`translate(${P(add(e, mul(d, i ? -6 : 6)))}) rotate(${(Math.atan2(d[1], d[0]) * 180) / Math.PI})`} />)}
          </g>
        );
      }
      return <>{points.map((p, i) => <Plate key={i} c={p} r={16} />)}</>;
    case "trapbar":
      return <>{points.map((p, i) => <g key={i}><Plate c={add(p, [0, 10])} r={16} /><Seg a={add(p, [-6, 0])} b={add(p, [6, 0])} w={3} c={C.metal} /></g>)}</>;
    case "dumbbell": {
      const pts = front && at === "hands" ? [j.hand, j.hand2] : points;
      return (
        <>
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={7} fill={C.plate} stroke={C.rim} strokeWidth={1.2} />
              <circle cx={p[0]} cy={p[1]} r={2} fill={C.metal} />
            </g>
          ))}
        </>
      );
    }
    case "kettlebell":
      return (
        <>
          {points.map((p, i) => {
            const c = forearm[1] < -0.3 ? add(p, add(mul(forearm, -7), [-8, 2])) : add(p, [0, 11]);
            return (
              <g key={i}>
                <path d={`M${P(add(p, [-5, 1]))} Q${P(add(p, [0, -6]))} ${P(add(p, [5, 1]))}`} fill="none" stroke={C.plate} strokeWidth={2.5} />
                <circle cx={c[0]} cy={c[1]} r={9} fill={C.plate} stroke={C.rim} strokeWidth={1.2} />
                <rect x={c[0] - 4} y={c[1] + 5} width={8} height={4} rx={1} fill={C.rim} />
              </g>
            );
          })}
        </>
      );
    case "medball": {
      const p = front ? mix(j.hand, j.hand2, 0.5) : add(j.hand, mul(forearm, 6));
      return (
        <g>
          <circle cx={p[0]} cy={p[1]} r={11} fill="#3a2b25" stroke="#58423a" strokeWidth={1.2} />
          <path d={`M${p[0] - 11},${p[1]} Q${p[0]},${p[1] - 6} ${p[0] + 11},${p[1]}`} fill="none" stroke="hsl(var(--volt))" strokeWidth={1} opacity={0.7} />
        </g>
      );
    }
    case "handle":
      return <>{points.map((p, i) => <rect key={i} x={p[0] - 5} y={p[1] - 2.5} width={10} height={5} rx={2.5} fill={C.plate} stroke={C.metal} strokeWidth={1} />)}</>;
    case "rope":
      return (
        <>
          {points.map((p, i) => (
            <g key={i}>
              <Seg a={p} b={add(p, [-3, 8])} w={3} c="#3a3f47" />
              <Seg a={p} b={add(p, [3, 8])} w={3} c="#3a3f47" />
              <circle cx={p[0]} cy={p[1] - 2} r={2.5} fill={C.metal} />
            </g>
          ))}
        </>
      );
    case "wheel":
      return <>{points.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1] + 4} r={9} fill={C.plate} stroke={C.rim} strokeWidth={2} /><circle cx={p[0]} cy={p[1] + 4} r={2.5} fill={C.metal} /></g>)}</>;
    case "ball":
      return <>{points.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1] + 14} r={14} fill="#2f4a68" /><circle cx={p[0] - 4} cy={p[1] + 9} r={4} fill="#ffffff" opacity={0.12} /></g>)}</>;
    case "pad":
      return <>{points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={6} fill={C.pad} stroke={C.padEdge} strokeWidth={1.2} />)}</>;
    case "platform": {
      const c = add(points[0], mul(unit(sub(j.ankle, j.knee)), 6));
      return <rect x={-24} y={-3.5} width={48} height={7} rx={2} fill={C.metal} transform={`translate(${P(c)}) rotate(${l.angle ?? 0})`} />;
    }
    case "yoke": {
      const p = points[0];
      return <g><rect x={p[0] - 12} y={p[1] - 9} width={24} height={8} rx={4} fill={C.pad} stroke={C.padEdge} /><Seg a={[p[0] + 8, p[1] - 6]} b={[p[0] + 40, p[1] - 6]} w={4} c={C.frame} /><Seg a={[p[0] + 40, 10]} b={[p[0] + 40, FLOOR]} w={6} c={C.frame} /></g>;
    }
    case "landmine": {
      const pivot: V = [36, FLOOR - 3];
      const p = points[0];
      const end = add(p, mul(unit(sub(p, pivot)), 22));
      return <g><Seg a={pivot} b={end} w={4} c={C.metal} /><circle cx={pivot[0]} cy={pivot[1]} r={4} fill={C.frame} /><Plate c={end} r={13} /></g>;
    }
    case "jumprope": {
      const p = j.hand;
      return <path d={`M${P(p)} C${p[0] + 18},${FLOOR + 14} ${p[0] - 46},${FLOOR + 14} ${p[0] - 10},${p[1] + 2}`} fill="none" stroke="hsl(var(--volt))" strokeWidth={1.6} opacity={0.85} />;
    }
    case "slide":
      return <rect x={j.hip[0] - 13} y={j.hip[1] + 8} width={26} height={6} rx={3} fill={C.pad} stroke={C.padEdge} />;
  }
}

function LineView({ line, s }: { line: Line; s: Solved }) {
  const a = s.j[line.from];
  const b = typeof line.to === "string" ? s.j[line.to as JointName] : line.to;
  if (line.kind === "band") return <Seg a={a} b={b} w={2.6} c="hsl(var(--volt))" />;
  if (line.kind === "chain") return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.metal} strokeWidth={1.6} strokeDasharray="2 1.5" />;
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={C.cable} strokeWidth={1.2} opacity={0.9} />;
}

/* ─────────────── The athlete ─────────────── */

function Leg({ hip, knee, ankle, toe, far }: { hip: V; knee: V; ankle: V; toe: V; far?: boolean }) {
  const shinDir = unit(sub(ankle, knee));
  return (
    <g>
      <Seg a={hip} b={knee} w={13} c={far ? C.skinFar : C.skin} />
      <Seg a={knee} b={ankle} w={10.5} c={far ? C.skinFar : C.skin} />
      <Seg a={hip} b={mix(hip, knee, 0.72)} w={17} c={far ? C.shortsFar : C.shorts} />
      <Seg a={sub(ankle, mul(shinDir, 7))} b={ankle} w={10} c={far ? "#bdbdbd" : C.sock} />
      <Seg a={sub(ankle, mul(unit(sub(toe, ankle)), 3))} b={toe} w={9.5} c={C.shoeEdge} />
      <Seg a={sub(ankle, mul(unit(sub(toe, ankle)), 3))} b={toe} w={7.5} c={far ? "#cfcfcf" : C.shoe} />
    </g>
  );
}

function Arm({ sh, el, hand, far }: { sh: V; el: V; hand: V; far?: boolean }) {
  const skin = far ? C.skinFar : C.skin;
  return (
    <g>
      <Seg a={sh} b={el} w={9.5} c={skin} />
      <Seg a={el} b={hand} w={8.5} c={skin} />
      <Seg a={sh} b={mix(sh, el, 0.45)} w={13} c={far ? C.poloFar : C.polo} />
      <circle cx={hand[0]} cy={hand[1]} r={5} fill={skin} />
    </g>
  );
}

function SideHead({ at, angle }: { at: V; angle: number }) {
  return (
    <g transform={`translate(${P(at)}) rotate(${angle.toFixed(1)})`}>
      <ellipse cx={0} cy={0} rx={10.5} ry={11.5} fill={C.skin} />
      <path d="M10.3 -1.6 L12.8 2.8 L10.2 3.8 Z" fill={C.skin} />
      <ellipse cx={-2.2} cy={0.8} rx={2.2} ry={3.1} fill={C.skinShade} />
      <path d="M-10.7 2 C-11.6 -9 -4 -13.6 3 -12.4 C7.6 -11.7 10 -9 10.4 -5.4 L8.6 -7 C4 -8.6 -2 -8.3 -6.4 -4.6 L-7.6 2.4 Z" fill={C.hair} />
      <path d="M-7.6 2.4 L-6.4 -4.6 L-3.5 -6.2" fill="none" stroke={C.hair} strokeWidth={0.8} opacity={0.4} />
      <circle cx={6.6} cy={-2.4} r={1.05} fill={C.hair} />
      <path d="M4.6 -5 L8.8 -5.4" stroke={C.hair} strokeWidth={1.3} strokeLinecap="round" />
      <path d="M7.2 4.7 Q9.4 4.1 10.5 5.5" fill="none" stroke={C.hair} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M8.3 7.3 L10 7.3" stroke={C.skinShade} strokeWidth={0.9} strokeLinecap="round" />
      <path d="M2.8 9.4 Q7 12.4 9.8 8.6" fill="none" stroke={C.hair} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M-1.5 7 Q1 10.4 3.4 10" fill="none" stroke={C.hair} strokeWidth={1} opacity={0.35} />
    </g>
  );
}

function FrontHead({ at, angle }: { at: V; angle: number }) {
  return (
    <g transform={`translate(${P(at)}) rotate(${angle.toFixed(1)})`}>
      <ellipse cx={-10.3} cy={1} rx={2.2} ry={3.2} fill={C.skinShade} />
      <ellipse cx={10.3} cy={1} rx={2.2} ry={3.2} fill={C.skinShade} />
      <ellipse cx={0} cy={0} rx={10.4} ry={12} fill={C.skin} />
      <path d="M-10.4 -1 C-11 -10 -5 -13.4 0 -13.4 C5 -13.4 11 -10 10.4 -1 L9 -4.6 C6 -8 -6 -8 -9 -4.6 Z" fill={C.hair} />
      <circle cx={-3.8} cy={-1.6} r={1.1} fill={C.hair} />
      <circle cx={3.8} cy={-1.6} r={1.1} fill={C.hair} />
      <path d="M-6 -4.6 L-2 -4.9 M2 -4.9 L6 -4.6" stroke={C.hair} strokeWidth={1.2} strokeLinecap="round" />
      <path d="M0 0 L-1.4 3.6 L1.2 3.8" fill="none" stroke={C.skinShade} strokeWidth={0.9} strokeLinecap="round" />
      <path d="M-3.4 6 Q0 5 3.4 6" fill="none" stroke={C.hair} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M-1.8 7.8 L1.8 7.8" stroke={C.skinShade} strokeWidth={0.9} strokeLinecap="round" />
      <path d="M-3.6 10.2 Q0 12.8 3.6 10.2" fill="none" stroke={C.hair} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

function SideFigure({ s }: { s: Solved }) {
  const { j } = s;
  const l = s.lean;
  const up: V = [Math.sin(rad(l)), -Math.cos(rad(l))];
  const face: V = [Math.cos(rad(l)), Math.sin(rad(l))];
  const H = j.hip, S = j.shoulder;
  const torso = [
    add(H, mul(face, -11.5)),
    add(S, add(mul(face, -11), mul(up, -2))),
    add(S, mul(up, 5)),
    add(S, add(mul(face, 9), mul(up, -1))),
    add(mix(H, S, 0.62), mul(face, 13)),
    add(H, mul(face, 11)),
  ];
  const headAngle = (Math.atan2(j.head[0] - S[0], -(j.head[1] - S[1])) * 180) / Math.PI;
  const neckTop = mix(S, j.head, 0.62);
  const badge = add(add(S, mul(up, -12)), mul(face, 8));
  return (
    <g>
      <Leg hip={j.hip2} knee={j.knee2} ankle={j.ankle2} toe={j.toe2} far />
      <Arm sh={j.shoulder2} el={j.elbow2} hand={j.hand2} far />
      <Seg a={S} b={neckTop} w={9} c={C.skinShade} />
      <path d={`M${torso.map(P).join(" L")} Z`} fill={C.polo} stroke={C.polo} strokeWidth={5} strokeLinejoin="round" />
      <Seg a={add(S, mul(face, -9))} b={add(S, mul(face, 5))} w={2.2} c={C.poloEdge} />
      <rect x={-2.3} y={-3} width={4.6} height={6} rx={0.8} fill={C.badge} transform={`translate(${P(badge)}) rotate(${l.toFixed(1)})`} />
      <SideHead at={j.head} angle={headAngle} />
      <Leg hip={j.hip1} knee={j.knee} ankle={j.ankle} toe={j.toe} />
      <Arm sh={j.shoulder} el={j.elbow} hand={j.hand} />
    </g>
  );
}

function FrontFigure({ s }: { s: Solved }) {
  const { j } = s;
  const mid = mix(j.shoulder, j.shoulder2, 0.5);
  const across = unit(sub(j.shoulder, j.shoulder2));
  const down = unit(sub(j.hip, mid));
  const hipAcross = unit(sub(j.hip1, j.hip2));
  const torso = [
    add(j.shoulder, mul(across, 5)),
    add(j.hip1, mul(hipAcross, 4)),
    add(j.hip2, mul(hipAcross, -4)),
    add(j.shoulder2, mul(across, -5)),
  ];
  const angle = (Math.atan2(across[1], across[0]) * 180) / Math.PI;
  const neckTop = mix(mid, j.head, 0.6);
  const badge = add(add(mid, mul(across, 8)), mul(down, 12));
  return (
    <g>
      <Leg hip={j.hip2} knee={j.knee2} ankle={j.ankle2} toe={j.toe2} />
      <Leg hip={j.hip1} knee={j.knee} ankle={j.ankle} toe={j.toe} />
      <path d={`M${P(add(j.hip1, mul(hipAcross, 5)))} L${P(add(j.hip2, mul(hipAcross, -5)))}`} stroke={C.shorts} strokeWidth={14} strokeLinecap="round" />
      <Seg a={mid} b={neckTop} w={10} c={C.skinShade} />
      <path d={`M${torso.map(P).join(" L")} Z`} fill={C.polo} stroke={C.polo} strokeWidth={6} strokeLinejoin="round" />
      <path d={`M${P(add(mid, mul(across, -5)))} L${P(add(mid, mul(down, 7)))} L${P(add(mid, mul(across, 5)))}`} fill="none" stroke={C.poloEdge} strokeWidth={1.6} />
      <rect x={-2.3} y={-3} width={4.6} height={6} rx={0.8} fill={C.badge} transform={`translate(${P(badge)}) rotate(${angle.toFixed(1)})`} />
      <FrontHead at={j.head} angle={angle} />
      <Arm sh={j.shoulder2} el={j.elbow2} hand={j.hand2} />
      <Arm sh={j.shoulder} el={j.elbow} hand={j.hand} />
    </g>
  );
}

function BackPad({ s, side }: { s: Solved; side: "back" | "front" }) {
  const l = s.lean;
  const up: V = [Math.sin(rad(l)), -Math.cos(rad(l))];
  const face: V = [Math.cos(rad(l)), Math.sin(rad(l))];
  const off = mul(face, side === "back" ? -16 : 17);
  const a = add(add(s.j.hip, mul(up, -4)), off);
  const b = add(add(s.j.hip, mul(up, 60)), off);
  return <Seg a={a} b={b} w={10} c={C.pad} />;
}

export function Figure({ s, loads = [], lines = [], backpad }: { s: Solved; loads?: Load[]; lines?: Line[]; backpad?: "back" | "front" }) {
  return (
    <g>
      {backpad && <BackPad s={s} side={backpad} />}
      {lines.map((l, i) => <LineView key={i} line={l} s={s} />)}
      {loads.filter((l) => l.kind === "slide" || l.kind === "landmine" || l.kind === "jumprope").map((l, i) => <LoadView key={i} l={l} s={s} />)}
      {s.view === "side" ? <SideFigure s={s} /> : <FrontFigure s={s} />}
      {loads.filter((l) => l.kind !== "slide" && l.kind !== "landmine" && l.kind !== "jumprope").map((l, i) => <LoadView key={i} l={l} s={s} />)}
    </g>
  );
}
