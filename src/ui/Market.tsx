import { useState } from 'react';
import { C } from '../data';
import { capacity, cargoWeight, fairValue, quotes, holidayAt, marketOpen, type GameState } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section } from './widgets';

const LEG: Record<string, { label: string; cls: string; tip: string }> = {
  legal: { label: '', cls: '', tip: '' },
  restricted: { label: 'EEC only', cls: 'text-ice', tip: 'East Empire Company monopoly here: only a Company agent buys it openly (at 75%), or a fence at the risk of an informer.' },
  contraband: { label: 'Contraband', cls: 'text-danger', tip: 'Illegal here: only fences deal in it, and customs may search you on arrival.' },
};

export function Market({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const [qty, setQty] = useState<Record<string, number>>({});
  const loc = g.player.location;
  const qs = quotes(g, loc);
  const hol = holidayAt(g, loc);
  const free = capacity(g) - cargoWeight(g);
  const tend = g.player.books.includes('pocket-guide');
  const cargoGoods = Object.keys(g.player.cargo).filter(id => !qs.find(q => q.good === id));
  return (
    <div className="flex flex-col gap-3">
      {!marketOpen(g, loc) && <div className="panel p-3 text-gold">{hol?.marketClosed ? `${hol.name}: the market is closed today. Rest, visit the tavern, or travel.` : 'Nobody trades here any more.'}</div>}
      {hol && !hol.marketClosed && <div className="panel p-3 text-sm"><span className="text-gold h-display">{hol.name}.</span> {hol.text}</div>}
      {(loc === 'lilmoth' || loc === 'stormhold') && !g.player.licence && <div className="panel p-3 text-sm text-ember">Foreigners need a trade licence here. Buy one at the Lilmoth gate (Shop & Temple tab) or from the Argonian agent in Leyawiin.</div>}
      <Section title="Goods" right={<span className="text-xs text-ash-400">Cargo space left: {free}</span>}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs h-display uppercase text-ash-400">
              <th className="py-1">Good</th><th>Weight</th><th className="text-right pl-2">You buy</th><th className="text-right pl-3">You sell</th><th className="text-right pl-3">Owned</th><th className="pl-3">Qty</th><th></th>
            </tr></thead>
            <tbody>
              {qs.map(q => {
                const G = C.goods[q.good]; const lot = g.player.cargo[q.good];
                const fv = fairValue(g, q.good); const ratio = q.mid / fv;
                const n = Math.max(1, qty[q.good] ?? 1);
                const maxBuy = q.buy ? Math.max(0, Math.min(Math.floor(g.player.cash / (q.buy * 1.02)), Math.floor(free / G.weight))) : 0;
                const l = LEG[q.legality];
                return (
                  <tr key={q.good} className="border-t border-ash-700/60 hover:bg-ash-700/30">
                    <td className="py-1.5 pr-2">
                      <CodexLink id={`good:${q.good}`} className="text-bone">{G.name}</CodexLink>
                      {l.label && <span title={l.tip} className={`ml-1 text-[.7rem] h-display uppercase ${l.cls}`}>{l.label}</span>}
                      <div className="text-xs text-ash-400">{G.short}{tend && <span className="text-gold"> · {(C.locs[loc].tendencies[q.good] ?? 1) < 0.9 ? 'usually cheap here' : (C.locs[loc].tendencies[q.good] ?? 1) > 1.2 ? 'usually expensive here' : 'usual price here'}</span>}</div>
                    </td>
                    <td className="num text-ash-400">{G.weight}</td>
                    <td className="text-right whitespace-nowrap">{q.buy !== null ? <span title={`from ${q.buyFrom}`}><Money v={q.buy} /> {ratio < 0.8 ? <span className="text-moss" title="Cheap: well below the usual price">▼</span> : ratio > 1.25 ? <span className="text-danger" title="Expensive: well above the usual price">▲</span> : null}</span> : <span className="text-ash-400 text-xs">{q.stock ? '—' : 'out of stock'}</span>}</td>
                    <td className="text-right whitespace-nowrap">{q.sell !== null ? <span title={`to ${q.sellTo}${q.sellNote ? ` (${q.sellNote})` : ''}`}><Money v={q.sell} />{q.sellNote && <span className="text-ice text-xs">*</span>}</span> : <span className="text-ash-400 text-xs">no buyer</span>}</td>
                    <td className="text-right num pl-3">{lot ? <span title={`Average cost ${Math.round(lot.cost)}`}>{lot.qty}</span> : <span className="text-ash-400">0</span>}</td>
                    <td className="pl-3"><input aria-label={`Quantity of ${G.name}`} className="input w-16 num py-0.5" type="number" min={1} value={n} onChange={e => setQty({ ...qty, [q.good]: Math.max(1, Number(e.target.value) || 1) })} /></td>
                    <td className="whitespace-nowrap pl-2 space-x-1">
                      <button className="btn" disabled={q.buy === null || maxBuy < 1} onClick={() => act({ t: 'buy', good: q.good, qty: n })}>Buy</button>
                      <button className="btn btn-ghost" disabled={q.buy === null || maxBuy < 1} onClick={() => act({ t: 'buy', good: q.good, qty: maxBuy })} title={`Buy as many as you can (${maxBuy})`}>Max</button>
                      <button className="btn" disabled={q.sell === null || !lot} onClick={() => act({ t: 'sell', good: q.good, qty: Math.min(n, lot?.qty ?? 0) })}>Sell</button>
                      <button className="btn btn-ghost" disabled={q.sell === null || !lot} onClick={() => act({ t: 'sell', good: q.good, qty: lot!.qty })}>All</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ash-400 mt-2">▼ cheap / ▲ expensive compared with the usual price across Tamriel. * sold with a restriction (hover for details). Selling a lot lowers the price; buying a lot raises it.</p>
      </Section>
      {cargoGoods.length > 0 && (
        <Section title="In your cargo, but nobody here buys it">
          <div className="flex flex-wrap gap-3 text-sm">{cargoGoods.map(id => <span key={id}><CodexLink id={`good:${id}`}>{C.goods[id].name}</CodexLink> ×{g.player.cargo[id].qty}</span>)}</div>
        </Section>
      )}
    </div>
  );
}
