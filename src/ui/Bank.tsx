import { useState } from 'react';
import { C } from '../data';
import { branchKey, houseName, pressure, shortDate, type GameState, type House } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section } from './widgets';

export function Bank({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const [amt, setAmt] = useState(100);
  const loc = g.player.location;
  const n = g.note;
  const atTong = loc === n.seat || n.agents.includes(loc);
  const pr = pressure(g);
  return (
    <div className="grid xl:grid-cols-2 gap-3">
      <Section title="Your debt (Camonna Tong)">
        {n.cleared ? <p className="text-moss">Paid off. You owe the Camonna Tong nothing.</p> : (
          <>
            <p className="text-sm text-parchment">You owe <b>Gavas Drelloth</b> <Money v={n.balance} className="text-ember" />. Interest: {(n.rate * 100).toFixed(2)}% a day. Last payment: {shortDate(n.lastPaymentDay)}. You can pay in <b>{C.locs[n.seat].name}</b>{n.agents.length > 0 && <> or {n.agents.map(a => C.locs[a].name).join(', ')}</>}.</p>
            <p className="text-sm mt-1">{pr === 0 ? 'The Tong is patient, for now.' : pr === 1 ? 'Drelloth is getting impatient. Pay something soon.' : pr === 2 ? 'Debt collectors are looking for you on the roads.' : 'The Tong has sent killers after you. Pay now.'}</p>
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <input className="input w-28 num" type="number" min={1} value={amt} onChange={e => setAmt(Math.max(1, Number(e.target.value) || 1))} aria-label="Amount" />
              <button className="btn btn-ember" disabled={!atTong} onClick={() => act({ t: 'pay', amount: amt })}>Pay</button>
              <button className="btn" disabled={!atTong} onClick={() => act({ t: 'pay', amount: Math.min(g.player.cash, Math.ceil(n.balance)) })}>Pay all you can</button>
              <button className="btn btn-ghost" disabled={loc !== n.seat} onClick={() => act({ t: 'borrow', amount: amt })} title="Borrow more (raises the interest rate)">Borrow</button>
            </div>
            {!atTong && <p className="text-xs text-ash-400 mt-2">You can’t pay here. Travel to {C.locs[n.seat].name}{n.agents.length > 0 ? ` or ${n.agents.map(a => C.locs[a].name).join(', ')}` : ''}.</p>}
          </>
        )}
        <p className="text-xs text-ash-400 mt-3"><CodexLink id="faction:tong">About the Camonna Tong</CodexLink></p>
      </Section>
      {(['hlaalu', 'eec'] as House[]).map(h => {
        const here = g.world.branches[branchKey(h, loc)] === 'open';
        return (
          <Section key={h} title={houseName(h)}>
            <ul className="text-sm space-y-1">{C.branches[h].map(b => {
              const k = branchKey(h, b); const open = g.world.branches[k] === 'open'; const amtB = Math.floor(g.deposits[k] ?? 0);
              return <li key={b} className="flex items-center gap-2"><span className={open ? 'text-bone' : 'text-ash-400 line-through'}>{C.locs[b].name}</span><span className="ml-auto"><Money v={amtB} /></span>
                {here && open && b !== loc && amtB > 0 && <button className="btn btn-ghost" onClick={() => act({ t: 'writ', house: h, from: b, amount: Math.min(amt, amtB) })} title={`Move this money to the branch here (${h === 'hlaalu' ? 3 : 4}% fee)`}>Transfer here</button>}
              </li>;
            })}</ul>
            {here ? (
              <div className="flex flex-wrap gap-2 mt-3">
                <button className="btn" onClick={() => act({ t: 'deposit', house: h, amount: amt })}>Deposit {amt}</button>
                <button className="btn" onClick={() => act({ t: 'deposit', house: h, amount: g.player.cash })}>Deposit all</button>
                <button className="btn btn-ghost" onClick={() => act({ t: 'withdraw', house: h, amount: Math.min(amt, Math.floor(g.deposits[branchKey(h, loc)] ?? 0)) })}>Withdraw {amt}</button>
                <button className="btn btn-ghost" onClick={() => act({ t: 'withdraw', house: h, amount: Math.floor(g.deposits[branchKey(h, loc)] ?? 0) })}>Withdraw all</button>
              </div>
            ) : <p className="text-xs text-ash-400 mt-2">No branch of this bank here. You can only use money at the branch where you deposited it.</p>}
            <p className="text-xs text-ash-400 mt-2">{h === 'hlaalu' ? 'Pays 0.03% interest a day. 1% fee to withdraw. Branches in Vvardenfell and southern Morrowind.' : 'No interest. 2% fee to withdraw. Branches in Imperial ports.'} A <CodexLink id="topic:writ-of-coin">transfer</CodexLink> moves money between branches of the same bank.</p>
          </Section>
        );
      })}
      {g.frozen.length > 0 && (
        <Section title="Frozen accounts">
          {g.frozen.map((f, i) => <p key={i} className="text-sm"><Money v={f.amount} /> at {houseName(f.house)}: the bank promises to repay {Math.round(f.ratio * 100)}% at {C.locs[f.settleAt].name} on {shortDate(f.settleDay)}.</p>)}
        </Section>
      )}
    </div>
  );
}
