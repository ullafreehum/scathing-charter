import { useState } from 'react';
import { C } from '../data';
import { DEPOSIT_RATE, WITHDRAW_FEE, houseName, pressure, shortDate, strongboxCities, type GameState } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section } from './widgets';
import { GoodIcon } from './GoodIcon';
import { coinBurst, coinsFor } from './fx';

const toInt = (v: string) => Math.max(1, Math.floor(Number(v) || 1));

function CharterSection({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const ch = g.charter; const loc = g.player.location;
  const atOffice = C.charter.offices.includes(loc);
  const atWarehouse = loc === C.charter.warehouse;
  const offices = C.charter.offices.map(o => C.locs[o].name).join(', ');
  const whName = C.locs[C.charter.warehouse].name;
  const next = C.charter.tiers[ch.tier];
  const stored = Object.entries(g.warehouse);
  const carried = Object.entries(g.player.cargo);
  if (!g.world.flags.relief && ch.tier === 0) return null;
  const fee = Math.round(ch.paid * C.charter.renewalFee);
  const why = !g.note.cleared ? 'Pay off the Camonna Tong first.' : !atOffice ? `Sold in ${offices}.` : next && g.player.cash < next.price ? `You need ${Math.ceil(next.price - g.player.cash).toLocaleString('en-US')} more.` : '';
  return (
    <Section title="The Scathing Charter" className="xl:col-span-2">
      <p className="text-sm text-parchment">Rights to supply and rebuild the ruined Vivec region, sold by the Grand Council in {offices}. <CodexLink id="topic:scathing-charter">More</CodexLink></p>
      <ol className="mt-2 space-y-1.5">
        {C.charter.tiers.map(t => { const owned = ch.tier >= t.tier; return (
          <li key={t.tier} className="text-sm flex items-start gap-2">
            <span className={`num w-4 ${owned ? 'text-moss' : 'text-ash-400'}`} aria-hidden="true">{owned ? '✓' : t.tier}</span>
            <div className="flex-1"><span className={owned ? 'text-moss' : 'text-bone'}>{t.name}</span> <span className="text-ash-400">· <Money v={t.price} />{owned ? ' · yours' : ''}</span><div className="text-xs text-ash-400">{t.text}</div></div>
          </li>
        ); })}
      </ol>
      {ch.renewDue !== null && (
        <div className="mt-3 p-2 rounded border border-ember text-sm flex flex-wrap items-center gap-2">
          <span>The new council wants a renewal fee of <Money v={fee} /> by {shortDate(ch.renewDue)}, or you lose your highest tier.</span>
          {atOffice ? <button className="btn btn-ember ml-auto" disabled={g.player.cash < fee} onClick={() => act({ t: 'renew' })}>Renew</button> : <span className="text-ash-400">Pay in {offices}.</span>}
        </div>
      )}
      {next ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <button className="btn btn-ember" disabled={!!why || ch.renewDue !== null || !g.world.flags.relief} onClick={() => act({ t: 'charter' })}>Buy {next.name} (<Money v={next.price} />)</button>
          {why && <span className="text-xs text-ash-400">{why}</span>}
        </div>
      ) : <p className="mt-3 text-sm text-moss">You hold the full charter. Dividends so far: <Money v={ch.dividends} />{ch.nextDividend !== null && <>; next on {shortDate(ch.nextDividend)}</>}.</p>}
      {(ch.tier >= 2 || stored.length > 0) && (
        <div className="mt-4 border-t border-ash-700 pt-3 grid sm:grid-cols-2 gap-3">
          <div>
            <div className="h-display text-xs uppercase text-ash-400 mb-1">Stored in {whName}</div>
            {!stored.length && <p className="text-xs text-ash-400">Nothing yet.</p>}
            {stored.map(([id, lot]) => (
              <div key={id} className="flex items-center gap-2 text-sm py-0.5"><span className="flex-1"><GoodIcon id={id} category={C.goods[id].category} /> {C.goods[id].name} ×{lot.qty}</span>
                <button className="btn btn-ghost py-0" disabled={!atWarehouse} onClick={() => act({ t: 'unstash', good: id, qty: lot.qty })}>Take all</button></div>
            ))}
          </div>
          <div>
            <div className="h-display text-xs uppercase text-ash-400 mb-1">Your cargo</div>
            {!atWarehouse ? <p className="text-xs text-ash-400">You can store and collect goods only in {whName}. Stored goods do not spoil and count toward your net worth.</p>
              : !carried.length ? <p className="text-xs text-ash-400">You carry nothing.</p>
              : carried.map(([id, lot]) => (
                <div key={id} className="flex items-center gap-2 text-sm py-0.5"><span className="flex-1"><GoodIcon id={id} category={C.goods[id].category} /> {C.goods[id].name} ×{lot.qty}</span>
                  <button className="btn py-0" disabled={ch.tier < 2} onClick={() => act({ t: 'stash', good: id, qty: lot.qty })}>Store all</button></div>
              ))}
          </div>
        </div>
      )}
    </Section>
  );
}

export function Bank({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const [pay, setPay] = useState(100);
  const [loan, setLoan] = useState(500);
  const borrow = () => { if (loan > 0 && confirm(`Borrow ${loan} septims from the Tong? Every loan raises your interest rate.`)) act({ t: 'borrow', amount: loan }); };
  const [box, setBox] = useState(100);
  const loc = g.player.location;
  const boxHere = g.world.branches[loc] === 'open';
  const held = Math.floor(g.deposits[loc] ?? 0);
  const n = g.note;
  const atTong = loc === n.seat || n.agents.includes(loc);
  const pr = pressure(g);
  const places = [n.seat, ...n.agents].map(a => C.locs[a].name).join(' or ');
  const payAll = Math.min(g.player.cash, Math.ceil(n.balance));
  return (
    <div className="grid xl:grid-cols-2 gap-3">
      <Section title="Your debt (Camonna Tong)">
        {n.cleared ? <><p className="text-moss">Paid off. You owe the Camonna Tong nothing.</p>
          {atTong && <div className="flex flex-wrap gap-2 mt-3 items-center"><input className="input w-28 num" type="number" min={1} value={loan} onChange={e => setLoan(toInt(e.target.value))} aria-label="Loan amount" /><button className="btn btn-ghost" onClick={borrow}>Borrow again</button></div>}</> : (
          <>
            <p className="text-sm text-parchment">You owe <b>Gavas Drelloth</b> <Money v={n.balance} className="text-ember" />. Interest is {(n.rate * 100).toFixed(2)}% a day: about <Money v={n.balance * n.rate} /> a day right now. Last payment: {shortDate(n.lastPaymentDay)}.</p>
            <p className="text-sm mt-1">{pr === 0 ? 'The Tong is patient, for now.' : pr === 1 ? 'Drelloth is getting impatient. Pay something soon.' : pr === 2 ? 'Debt collectors are looking for you on the roads.' : 'The Tong has sent killers after you. Pay now.'}</p>
            {atTong ? (<>
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                <input className="input w-28 num" type="number" min={1} value={pay} onChange={e => setPay(toInt(e.target.value))} aria-label="Payment amount" />
                <button className="btn btn-ember" onClick={() => { if (act({ t: 'pay', amount: pay })) coinBurst('cash', 'debt', coinsFor(pay)); }}>Pay</button>
                <button className="btn" disabled={payAll < 1} onClick={() => { if (act({ t: 'pay', amount: payAll })) coinBurst('cash', 'debt', coinsFor(payAll)); }}>Pay all you can (<Money v={payAll} />)</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <input className="input w-28 num" type="number" min={1} value={loan} onChange={e => setLoan(toInt(e.target.value))} aria-label="Loan amount" />
                <button className="btn btn-ghost" onClick={borrow} title="Borrow the amount in this box. Every loan raises your interest rate, and a bigger debt sends harder collectors.">Borrow</button>
              </div>
            </>) : <p className="text-sm text-ash-400 mt-2">You can’t pay here. Pay in {places}.</p>}
          </>
        )}
        {g.indentured && <p className="text-sm text-danger mt-2">You are indentured: no interest and no collectors, but the Tong takes 30% of every sale until the note is paid.</p>}
        {!!g.milestones?.length && !g.indentured && <div className="mt-3 text-sm"><button className="btn btn-ember" onClick={() => { if (confirm('Retire now? The game ends here with your fortune as it stands.')) act({ t: 'retire' }); }}>Retire</button> <span className="text-ash-400 text-xs">End the game now and read your epilogue.</span></div>}
        <p className="text-xs text-ash-400 mt-3"><CodexLink id="faction:tong">About the Camonna Tong</CodexLink></p>
      </Section>
      <Section title="Strongboxes">
        <ul className="text-sm space-y-1">{strongboxCities(C.branches).map(b => {
          const open = g.world.branches[b] === 'open'; const amtB = Math.floor(g.deposits[b] ?? 0);
          return <li key={b} className="flex items-center gap-2"><span className={open ? 'text-bone' : 'text-ash-400 line-through'}>{C.locs[b].name}</span>{b === loc && <span className="text-xs text-gold">(here)</span>}<span className="ml-auto"><Money v={amtB} /></span></li>;
        })}</ul>
        {boxHere ? (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2 items-center">
              <input className="input w-28 num" type="number" min={1} value={box} onChange={e => setBox(toInt(e.target.value))} aria-label="Strongbox amount" />
              <button className="btn" onClick={e => { const el = e.currentTarget; if (act({ t: 'deposit', amount: box })) coinBurst('cash', el, coinsFor(box)); }}>Deposit</button>
              <button className="btn btn-ghost" disabled={held < 1} onClick={e => { const el = e.currentTarget; if (act({ t: 'withdraw', amount: Math.min(box, held) })) coinBurst(el, 'cash', coinsFor(Math.min(box, held))); }}>Withdraw</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button className="btn" disabled={g.player.cash < 1} onClick={e => { const el = e.currentTarget; const v = g.player.cash; if (act({ t: 'deposit', amount: v })) coinBurst('cash', el, coinsFor(v)); }}>Deposit all cash</button>
              <button className="btn btn-ghost" disabled={held < 1} onClick={e => { const el = e.currentTarget; if (act({ t: 'withdraw', amount: held })) coinBurst(el, 'cash', coinsFor(held)); }}>Withdraw all (<Money v={held} />)</button>
            </div>
          </div>
        ) : <p className="text-xs text-ash-400 mt-2">No strongbox here. Money stays in the city where you left it.</p>}
        <p className="text-xs text-ash-400 mt-2">Strongboxes pay {(DEPOSIT_RATE * 100).toFixed(2)}% a day, keep your money safe from robbers, and charge {Math.round(WITHDRAW_FEE * 100)}% to take it out. A vault can be lost if its city falls.</p>
      </Section>
      <CharterSection g={g} />
      {g.frozen.length > 0 && (
        <Section title="Frozen accounts">
          {g.frozen.map((f, i) => <p key={i} className="text-sm"><Money v={f.amount} /> at {houseName(f.house)}: the bank promises to repay {Math.round(f.ratio * 100)}% at {C.locs[f.settleAt].name} on {shortDate(f.settleDay)}.</p>)}
        </Section>
      )}
    </div>
  );
}
