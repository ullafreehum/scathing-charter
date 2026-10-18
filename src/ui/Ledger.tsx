import { C } from '../data';
import { shortDate, type GameState } from '../engine';
import { Section } from './widgets';
import { FortuneChart } from './FortuneChart';

const TONE: Record<string, string> = { good: 'text-moss', bad: 'text-danger', history: 'text-gold', neutral: 'text-parchment' };

export function Ledger({ g }: { g: GameState }) {
  return (
    <div className="grid xl:grid-cols-[1fr_340px] gap-3">
      <Section title="Your fortune" className="xl:col-span-2"><FortuneChart g={g} /></Section>
      <Section title="Event log">
        <ol className="space-y-1 max-h-[39rem] overflow-auto scroll-thin pr-1">
          {[...g.log].reverse().map((e, i) => <li key={i} className={`text-sm ${TONE[e.tone ?? 'neutral']}`}><span className="text-ash-400 num mr-2">{shortDate(e.day)}</span>{e.text}</li>)}
        </ol>
      </Section>
      <div className="flex flex-col gap-3">
        <Section title="Stats">
          <ul className="text-sm space-y-0.5">
            <li>Trades: {g.stats.trades} · Profit booked: {Math.round(g.stats.profit)}</li>
            <li>Journeys: {g.stats.journeys} · Road events: {g.stats.encounters} · Fights won: {g.stats.fightsWon}</li>
            <li>Contracts done: {g.stats.contractsDone} · Relief runs: {g.stats.reliefDelivered}</li>
            <li>Contraband sold: {g.stats.smuggled} · Places seen: {g.stats.visited.length}/{C.locList.length}</li>
            <li>Codex: {g.codex.filter(id => C.codex[id]).length}/{Object.keys(C.codex).length} · Seed <span className="num text-gold">{g.seed}</span></li>
          </ul>
        </Section>
        <Section title={`Achievements ${g.achievements.length}/${C.achievements.length}`}>
          <ul className="text-sm space-y-1">{C.achievements.map(a => { const got = g.achievements.includes(a.id); return <li key={a.id} className={got ? 'text-gold' : 'text-ash-400'}>{got ? '★' : '☆'} {a.name}<span className="text-xs block text-ash-400">{a.text}</span></li>; })}</ul>
        </Section>
      </div>
    </div>
  );
}
