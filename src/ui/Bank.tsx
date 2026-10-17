import { useState } from 'react';
import { C } from '../data';
import { branchKey, houseName, pressure, shortDate, type GameState, type House } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section } from './widgets';

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
              <div key={id} className="flex items-center gap-2 text-sm py-0.5"><span className="flex-1">{C.goods[id].name} ×{lot.qty}</span>
                <button className="btn btn-ghost py-0" disabled={!atWarehouse} onClick={() => act({ t: 'unstash', good: id, qty: lot.qty })}>Take all</button></div>
            ))}
          </div>
          <div>
            <div className="h-display text-xs uppercase text-ash-400 mb-1">Your cargo</div>
            {!atWarehouse ? <p className="text-xs text-ash-400">You can store and collect goods only in {whName}. Stored goods do not spoil and count toward your net worth.</p>
              : !carried.length ? <p className="text-xs text-ash-400">You carry nothing.</p>
              : carried.map(([id, lot]) => (
                <div key={id} className="flex items-center gap-2 text-sm py-0.5"><span className="flex-1">{C.goods[id].name} ×{lot.qty}</span>
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
  const [amt, setAmt] = useState<Record<string, number>>({ hlaalu: 100, eec: 100 });
  const loc = g.player.location;
  const n = g.note;
  const atTong = loc === n.seat || n.agents.includes(loc);
  const pr = pressure(g);
  const places = [n.seat, ...n.agents].map(a => C.locs[a].name).join(' or ');
  const payAll = Math.min(g.player.cash, Math.ceil(n.balance));
  return (
    <div className="grid xl:grid-cols-2 gap-3">
      <Section title="Your debt (Camonna Tong)">
        {n.cleared ? <p className="text-moss">Paid off. You owe the Camonna Tong nothing.</p> : (
          <>
            <p className="text-sm text-parchment">You owe <b>Gavas Drelloth</b> <Money v={n.balance} className="text-ember" />. Interest is {(n.rate * 100).toFixed(2)}% a day: about <Money v={n.balance * n.rate} /> a day right now. Last payment: {shortDate(n.lastPaymentDay)}.</p>
            <p className="text-sm mt-1">{pr === 0 ? 'The Tong is patient, for now.' : pr === 1 ? 'Drelloth is getting impatient. Pay something soon.' : pr === 2 ? 'Debt collectors are looking for you on the roads.' : 'The Tong has sent killers after you. Pay now.'}</p>
            {atTong ? (
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                <input className="input w-28 num" type="number" min={1} value={pay} onChange={e => setPay(toInt(e.target.value))} aria-label="Payment amount" />
                <button className="btn btn-ember" onClick={() => act({ t: 'pay', amount: pay })}>Pay</button>
                <button className="btn" disabled={payAll < 1} onClick={() => act({ t: 'pay', amount: payAll })}>Pay all you can (<Money v={payAll} />)</button>
                {loc === n.seat && <button className="btn btn-ghost" onClick={() => act({ t: 'borrow', amount: pay })} title="Borrow the amount in the box. This raises your interest rate.">Borrow</button>}
              </div>
            ) : <p className="text-sm text-ash-400 mt-2">You can’t pay here. Pay in {places}.</p>}
          </>
        )}
        <p className="text-xs text-ash-400 mt-3"><CodexLink id="faction:tong">About the Camonna Tong</CodexLink></p>
      </Section>
      {(['hlaalu', 'eec'] as House[]).map(h => {
        const name = houseName(h);
        const key = branchKey(h, loc);
        const here = g.world.branches[key] === 'open';
        const held = Math.floor(g.deposits[key] ?? 0);
        const a = amt[h] ?? 100;
        return (
          <Section key={h} title={name}>
            <ul className="text-sm space-y-1">{C.branches[h].map(b => {
              const k = branchKey(h, b); const open = g.world.branches[k] === 'open'; const amtB = Math.floor(g.deposits[k] ?? 0);
              return <li key={b} className="flex items-center gap-2"><span className={open ? 'text-bone' : 'text-ash-400 line-through'}>{C.locs[b].name}</span>{b === loc && <span className="text-xs text-gold">(here)</span>}<span className="ml-auto"><Money v={amtB} /></span>
                {here && open && b !== loc && amtB > 0 && <button className="btn btn-ghost" onClick={() => act({ t: 'writ', house: h, from: b, amount: amtB })} title={`Move all of it to the branch here (${h === 'hlaalu' ? 3 : 4}% fee)`}>Transfer here</button>}
              </li>;
            })}</ul>
            {here ? (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <input className="input w-28 num" type="number" min={1} value={a} onChange={e => setAmt({ ...amt, [h]: toInt(e.target.value) })} aria-label={`${name} amount`} />
                  <button className="btn" onClick={() => act({ t: 'deposit', house: h, amount: a })}>Deposit</button>
                  <button className="btn btn-ghost" disabled={held < 1} onClick={() => act({ t: 'withdraw', house: h, amount: Math.min(a, held) })}>Withdraw</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button className="btn" disabled={g.player.cash < 1} onClick={() => act({ t: 'deposit', house: h, amount: g.player.cash })}>Deposit all cash</button>
                  <button className="btn btn-ghost" disabled={held < 1} onClick={() => act({ t: 'withdraw', house: h, amount: held })}>Withdraw all (<Money v={held} />)</button>
                </div>
              </div>
            ) : <p className="text-xs text-ash-400 mt-2">No branch of this bank here. You can only use money at the branch where you deposited it.</p>}
            <p className="text-xs text-ash-400 mt-2">{h === 'hlaalu' ? 'Pays 0.03% interest a day. 1% fee to withdraw. Branches in Vvardenfell and southern Morrowind.' : 'No interest. 2% fee to withdraw. Branches in Imperial ports.'} A <CodexLink id="topic:writ-of-coin">transfer</CodexLink> moves money between branches of the same bank.</p>
          </Section>
        );
      })}
      <CharterSection g={g} />
      {g.frozen.length > 0 && (
        <Section title="Frozen accounts">
          {g.frozen.map((f, i) => <p key={i} className="text-sm"><Money v={f.amount} /> at {houseName(f.house)}: the bank promises to repay {Math.round(f.ratio * 100)}% at {C.locs[f.settleAt].name} on {shortDate(f.settleDay)}.</p>)}
        </Section>
      )}
    </div>
  );
}
