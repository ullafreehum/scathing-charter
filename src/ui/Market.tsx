import { useState } from 'react';
import { C } from '../data';
import { capacity, cargoWeight, fairValue, quotes, holidayAt, marketOpen, satRecoveryDays, type GameState, type Quote } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section } from './widgets';
import { ago, bestSeenSell } from './prices';

const LEG: Record<string, { label: string; cls: string; tip: string }> = {
  legal: { label: '', cls: '', tip: '' },
  restricted: { label: 'EEC only', cls: 'text-ice', tip: 'East Empire Company monopoly here: only a Company agent buys it openly (at 75%), or a fence at the risk of an informer.' },
  contraband: { label: 'Contraband', cls: 'text-danger', tip: 'Illegal here: only fences deal in it, and customs may search you on arrival.' },
};
const AMOUNTS = [1, 5, 10, 25];
type Filter = 'all' | 'cargo' | 'cheap';
type Sort = 'usual' | 'name' | 'price' | 'gain';

export function Market({ g }: { g: GameState }) {
  const { act, setTab, tradeQty: amt, setTradeQty: setAmt } = useGame();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('usual');
  const loc = g.player.location;
  const qs = quotes(g, loc);
  const hol = holidayAt(g, loc);
  const free = capacity(g) - cargoWeight(g);
  const tend = g.player.books.includes('pocket-guide');
  const cargoGoods = Object.keys(g.player.cargo).filter(id => !qs.find(q => q.good === id));
  const ratio = (q: Quote) => q.mid / fairValue(g, q.good);
  const deliverable = g.contracts.filter(c => c.destination === loc && (g.player.cargo[c.good]?.qty ?? 0) >= c.qty);
  const profitable = qs.filter(q => q.sell !== null && g.player.cargo[q.good] && q.sell > g.player.cargo[q.good].cost);
  let rows = qs.filter(q => filter === 'all' || (filter === 'cargo' ? !!g.player.cargo[q.good] : ratio(q) < 0.8));
  if (sort === 'name') rows = [...rows].sort((a, b) => C.goods[a.good].name.localeCompare(C.goods[b.good].name));
  if (sort === 'price') rows = [...rows].sort((a, b) => (a.buy ?? Infinity) - (b.buy ?? Infinity));
  const gain = (q: Quote) => (q.buy === null ? -Infinity : (bestSeenSell(g, q.good, loc)?.price ?? -Infinity) - q.buy) / C.goods[q.good].weight;
  if (sort === 'gain') rows = [...rows].sort((a, b) => gain(b) - gain(a));
  const chip = (on: boolean) => `btn px-2 py-0.5 ${on ? 'btn-ember' : 'btn-ghost'}`;
  return (
    <div className="flex flex-col gap-3">
      {!marketOpen(g, loc) && (
        <div className="panel p-3 flex flex-wrap items-center gap-2">
          <span className="text-gold">{hol?.marketClosed ? `${hol.name}: the market is closed today.` : 'Nobody trades here any more.'}</span>
          <span className="ml-auto flex gap-2">
            {hol?.marketClosed && <button className="btn" onClick={() => act({ t: 'wait', days: 1 })}>Rest 1 day</button>}
            <button className="btn btn-ember" onClick={() => setTab('map')}>Travel</button>
          </span>
        </div>
      )}
      {hol && !hol.marketClosed && <div className="panel p-3 text-sm"><span className="text-gold h-display">{hol.name}.</span> {hol.text}</div>}
      {(loc === 'lilmoth' || loc === 'stormhold') && !g.player.licence && <div className="panel p-3 text-sm text-ember">Foreigners need a trade licence here. Buy one at the Lilmoth gate (Shop & Temple tab) or from the Argonian agent in Leyawiin.</div>}
      {deliverable.map(c => { const t = C.contracts.find(x => x.id === c.templateId)!; return (
        <div key={c.id} className="panel p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gold h-display">Contract ready.</span> <span>{t.title}: {c.qty} {C.goods[c.good].name}, pays <Money v={c.reward} />.</span>
          <button className="btn btn-ember ml-auto" onClick={() => act({ t: 'deliver', id: c.id })}>Deliver</button>
        </div>
      ); })}
      <Section title="Goods" right={<span className="text-xs text-ash-400">Cargo space left: {free}</span>}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 text-sm">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Trade amount">
            <span className="text-ash-400 mr-1">Amount</span>
            {AMOUNTS.map(n => <button key={n} role="radio" aria-checked={amt === n} className={chip(amt === n)} onClick={() => setAmt(n)}><span className="font-body num">{n}</span></button>)}
            <button role="radio" aria-checked={amt === 'max'} className={chip(amt === 'max')} onClick={() => setAmt('max')} title="Buy as many as you can afford and carry; sell everything">Max</button>
            <input aria-label="Custom amount" type="number" min={1} placeholder="other" className="input w-20 num py-0.5"
              value={typeof amt === 'number' && !AMOUNTS.includes(amt) ? amt : ''} onChange={e => setAmt(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
          </div>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Show">
            <span className="text-ash-400 mr-1">Show</span>
            {([['all', 'All'], ['cargo', 'My cargo'], ['cheap', 'Cheap here ▼']] as const).map(([f, l]) => <button key={f} role="radio" aria-checked={filter === f} className={chip(filter === f)} onClick={() => setFilter(f)}>{l}</button>)}
          </div>
          <label className="flex items-center gap-1"><span className="text-ash-400">Sort</span>
            <select className="input w-auto py-0.5" value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="usual">Usual</option><option value="name">Name</option><option value="price">Cheapest first</option><option value="gain">Best profit elsewhere</option></select></label>
          <button className="btn ml-auto" disabled={!profitable.length} onClick={() => { for (const q of profitable) act({ t: 'sell', good: q.good, qty: g.player.cargo[q.good].qty }); }}
            title="Sell every good whose price here is above what you paid">Sell all at a profit{profitable.length ? ` (${profitable.length})` : ''}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs h-display uppercase text-ash-400">
              <th className="py-1">Good</th><th>Weight</th><th className="text-right pl-2">You buy</th><th className="text-right pl-3">You sell</th><th className="text-right pl-3">Owned</th><th className="text-right pl-3" title="The highest price you have seen for it in another town">Best seen elsewhere</th><th></th>
            </tr></thead>
            <tbody>
              {rows.map(q => {
                const G = C.goods[q.good]; const lot = g.player.cargo[q.good];
                const r = ratio(q);
                const maxBuy = q.buy ? Math.max(0, Math.min(Math.floor(g.player.cash / (q.buy * 1.02)), Math.floor(free / G.weight))) : 0;
                const nBuy = amt === 'max' ? maxBuy : Math.min(amt, maxBuy);
                const nSell = lot && q.sell !== null ? (amt === 'max' ? lot.qty : Math.min(amt, lot.qty)) : 0;
                const margin = lot && q.sell !== null ? Math.round(q.sell - lot.cost) : null;
                const l = LEG[q.legality];
                const sat = g.markets[loc]?.[q.good]?.sat ?? 1;
                const best = bestSeenSell(g, q.good, loc);
                const edge = best && q.buy !== null ? best.price - q.buy : null;
                return (
                  <tr key={q.good} className={`border-t border-ash-700 hover:bg-ash-800 ${lot ? 'bg-ash-800/60' : ''}`}>
                    <td className="py-1.5 pr-2">
                      <CodexLink id={`good:${q.good}`} className="text-bone">{G.name}</CodexLink>
                      {l.label && <span title={l.tip} className={`ml-1 text-[.7rem] h-display uppercase ${l.cls}`}>{l.label}</span>}
                      {sat < 0.85 && <span className="ml-1 text-[.7rem] h-display uppercase text-danger" title={`So much has been sold here lately that the price is down. Back to normal in about ${satRecoveryDays(sat)} days.`}>Flooded · {satRecoveryDays(sat)}d</span>}
                      {sat > 1.2 && <span className="ml-1 text-[.7rem] h-display uppercase text-gold" title={`So much has been bought here lately that the price is up. Back to normal in about ${satRecoveryDays(sat)} days.`}>Bought out · {satRecoveryDays(sat)}d</span>}
                      <div className="text-xs text-ash-400">{G.short}{tend && <span className="text-gold"> · {(C.locs[loc].tendencies[q.good] ?? 1) < 0.9 ? 'usually cheap here' : (C.locs[loc].tendencies[q.good] ?? 1) > 1.2 ? 'usually expensive here' : 'usual price here'}</span>}</div>
                    </td>
                    <td className="num text-ash-400">{G.weight}</td>
                    <td className="text-right whitespace-nowrap">{q.buy !== null ? <span title={`from ${q.buyFrom}`}><Money v={q.buy} /> {r < 0.8 ? <span className="text-moss" title="Cheap: well below the usual price">▼</span> : r > 1.25 ? <span className="text-danger" title="Expensive: well above the usual price">▲</span> : null}</span> : <span className="text-ash-400 text-xs">{q.stock ? '—' : 'out of stock'}</span>}</td>
                    <td className="text-right whitespace-nowrap">{q.sell !== null ? <span title={`to ${q.sellTo}${q.sellNote ? ` (${q.sellNote})` : ''}`}><Money v={q.sell} />{q.sellNote && <span className="text-ice text-xs">*</span>}</span> : <span className="text-ash-400 text-xs">no buyer</span>}
                      {margin !== null && <div className={`text-xs ${margin >= 0 ? 'text-moss' : 'text-danger'}`} title={`You paid ${Math.round(lot!.cost)} each`}>{margin >= 0 ? '+' : ''}{margin} each</div>}</td>
                    <td className="text-right num pl-3">{lot ? <span title={`You paid ${Math.round(lot.cost)} each on average`}>{lot.qty}</span> : <span className="text-ash-400">0</span>}</td>
                    <td className="text-right pl-3 whitespace-nowrap">{best ? <span title={`Seen in ${C.locs[best.loc].name} ${ago(best.age)}. Prices move, so older figures are less reliable.`}><Money v={best.price} />{edge !== null && edge > 0 && <span className="text-moss text-xs"> (+{Math.round(edge)})</span>}<span className="block text-xs text-ash-400">{C.locs[best.loc].name}, {ago(best.age)}</span></span> : <span className="text-ash-400 text-xs">not seen yet</span>}</td>
                    <td className="whitespace-nowrap pl-3 text-right space-x-1">
                      <button className="btn" disabled={nBuy < 1} onClick={() => act({ t: 'buy', good: q.good, qty: nBuy })} title={nBuy < 1 ? (q.buy === null ? 'Not for sale here' : 'No money or cargo space for this') : `Buy ${nBuy} (max ${maxBuy})`}>Buy {nBuy > 0 ? <span className="font-body num">{nBuy}</span> : ''}</button>
                      <button className="btn" disabled={nSell < 1} onClick={() => act({ t: 'sell', good: q.good, qty: nSell })} title={nSell < 1 ? (lot ? 'Nobody here buys this' : 'You have none') : `Sell ${nSell}`}>Sell {nSell > 0 ? <span className="font-body num">{nSell}</span> : ''}</button>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={7} className="py-3 text-ash-400">Nothing matches this filter.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ash-400 mt-2">Buy and Sell use the amount chosen above, capped by your cash, cargo space and what you own. ▼ cheap / ▲ expensive compared with the usual price across Tamriel. * sold with a restriction (hover for details). “Best seen elsewhere” comes from towns you have visited, so it can be out of date. Selling a lot lowers the price; buying a lot raises it.</p>
      </Section>
      {cargoGoods.length > 0 && (
        <Section title="In your cargo, but nobody here buys it">
          <div className="flex flex-wrap gap-3 text-sm">{cargoGoods.map(id => <span key={id}><CodexLink id={`good:${id}`}>{C.goods[id].name}</CodexLink> ×{g.player.cargo[id].qty}</span>)}</div>
        </Section>
      )}
    </div>
  );
}
