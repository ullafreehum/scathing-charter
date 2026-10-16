import { useState } from 'react';
import { C } from '../data';
import { branchKey, houseName, pressure, shortDate, type GameState, type House } from '../engine';
import { useGame } from '../store/game';
import { Badge, CodexLink, Money, Section } from './widgets';

export function Bank({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const [amt, setAmt] = useState(100);
  const loc = g.player.location;
  const n = g.note;
  const atTong = loc === n.seat || n.agents.includes(loc);
  const pr = pressure(g);
  return (
    <div className="grid xl:grid-cols-2 gap-3">
      <Section title="The Tong’s note" right={<Badge canon="invented" />}>
        {n.cleared ? <p className="text-moss">The note is ash in a tavern hearth. You owe the Camonna Tong nothing.</p> : (
          <>
            <p className="text-sm text-parchment">You owe <b>Gavas Drelloth</b> <Money v={n.balance} className="text-ember" />, compounding at {(n.rate * 100).toFixed(2)}% a day. Last payment: {shortDate(n.lastPaymentDay)}. Collectors answer at <b>{C.locs[n.seat].name}</b>{n.agents.length > 0 && <> and {n.agents.map(a => C.locs[a].name).join(', ')}</>}.</p>
            <p className="text-sm mt-1">{pr === 0 ? 'The Tong is patient, for now.' : pr === 1 ? 'Drelloth has started asking after you.' : pr === 2 ? 'His collectors are on the roads.' : 'The Tong wants blood or septims, and does not much mind which.'}</p>
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <input className="input w-28 num" type="number" min={1} value={amt} onChange={e => setAmt(Math.max(1, Number(e.target.value) || 1))} aria-label="Amount" />
              <button className="btn btn-ember" disabled={!atTong} onClick={() => act({ t: 'pay', amount: amt })}>Pay</button>
              <button className="btn" disabled={!atTong} onClick={() => act({ t: 'pay', amount: Math.min(g.player.cash, Math.ceil(n.balance)) })}>Pay all you can</button>
              <button className="btn btn-ghost" disabled={loc !== n.seat} onClick={() => act({ t: 'borrow', amount: amt })} title="Borrow more (raises the rate)">Borrow</button>
            </div>
            {!atTong && <p className="text-xs text-ash-400 mt-2">No Tong collector here.</p>}
          </>
        )}
        <p className="text-xs text-ash-400 mt-3">Gavas Drelloth and his Council Club operation are invented for this game. The Camonna Tong is canon: <CodexLink id="faction:tong">read more</CodexLink>.</p>
      </Section>
      {(['hlaalu', 'eec'] as House[]).map(h => {
        const here = g.world.branches[branchKey(h, loc)] === 'open';
        return (
          <Section key={h} title={houseName(h)} right={<Badge canon="invented" />}>
            <ul className="text-sm space-y-1">{C.branches[h].map(b => {
              const k = branchKey(h, b); const open = g.world.branches[k] === 'open'; const amtB = Math.floor(g.deposits[k] ?? 0);
              return <li key={b} className="flex items-center gap-2"><span className={open ? 'text-bone' : 'text-ash-400 line-through'}>{C.locs[b].name}</span><span className="ml-auto"><Money v={amtB} /></span>
                {here && open && b !== loc && amtB > 0 && <button className="btn btn-ghost" onClick={() => act({ t: 'writ', house: h, from: b, amount: Math.min(amt, amtB) })} title={`Writ of coin: move funds here (${h === 'hlaalu' ? 3 : 4}% fee)`}>Writ here</button>}
              </li>;
            })}</ul>
            {here ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="btn" onClick={() => act({ t: 'deposit', house: h, amount: amt })}>Deposit {amt}</button>
                <button className="btn" onClick={() => act({ t: 'deposit', house: h, amount: g.player.cash })}>Deposit all</button>
                <button className="btn btn-ghost" onClick={() => act({ t: 'withdraw', house: h, amount: Math.min(amt, Math.floor(g.deposits[branchKey(h, loc)] ?? 0)) })}>Withdraw {amt}</button>
                <button className="btn btn-ghost" onClick={() => act({ t: 'withdraw', house: h, amount: Math.floor(g.deposits[branchKey(h, loc)] ?? 0) })}>Withdraw all</button>
              </div>
            ) : <p className="text-xs text-ash-400 mt-2">No branch of this house here. Deposits can only be touched where they are held.</p>}
            <p className="text-xs text-ash-400 mt-2">{h === 'hlaalu' ? 'Pays 0.03% a day. Withdrawal 1%. Its branches stand in Vvardenfell and the Hlaalu south.' : 'No interest. Withdrawal 2%. Company strongrooms in Imperial ports.'} A <CodexLink id="topic:writ-of-coin">writ of coin</CodexLink> moves money between branches of one house.</p>
          </Section>
        );
      })}
      {g.frozen.length > 0 && (
        <Section title="Frozen accounts">
          {g.frozen.map((f, i) => <p key={i} className="text-sm"><Money v={f.amount} /> at {houseName(f.house)}: the House promises {Math.round(f.ratio * 100)} drakes on the hundred, payable at {C.locs[f.settleAt].name} on {shortDate(f.settleDay)}.</p>)}
        </Section>
      )}
    </div>
  );
}
