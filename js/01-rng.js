/* =========================================================================
   KINGDOM MANAGEMENT — SIMULATION ENGINE
   Architecture: STATE -> ENGINE (deterministic calc) -> RENDER (text-only).
   No layer above ENGINE may mutate state directly except through the
   functions in the ENGINE section. Narrative/flavor text is generated
   from state, never the reverse (state never inferred from text).
   ========================================================================= */

/* ---------------------------------------------------------------------
   0. RNG (seeded, deterministic)
--------------------------------------------------------------------- */
function mulberry32(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(Date.now() & 0xffffffff);
const R = () => rand();
const RI = (a,b) => Math.floor(R()*(b-a+1))+a;
const pick = (arr) => arr[Math.floor(R()*arr.length)];
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const fmt = (n) => Math.round(n).toLocaleString();

