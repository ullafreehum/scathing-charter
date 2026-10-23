import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { C } from '../data';
import { DEPTH, bulkBuyTotal, bulkSellTotal, capacity, cargoWeight, fairValue, maxBuyQty, quotes, routeOptions, FREIGHT, holidayAt, marketOpen, satRecoveryDays, canContest, closedParagraph, courtCost, formatDate, ruinLine, type GameState, type Quote } from '../engine';
import { useGame } from '../store/game';
import { CodexLink, Money, Section } from './widgets';
import { GoodIcon } from './GoodIcon';
import { coinBurst, coinsFor } from './fx';
import { onLongPress } from './Tooltip';
import { PHONE, usePhone } from './phone';
import { Sheet } from './Game';
import { AnimatePresence, motion } from 'framer-motion';
import { ago, bestSeenSell } from './prices';

const LEG: Record<string, { label: string; cls: string; tip: string }> = {
  legal: { label: '', cls: '', tip: '' },
  restricted: { label: 'EEC only', cls: 'text-ice', tip: 'East Empire Company monopoly here: only a Company agent buys it openly (at 75%), or a fence at the risk of an informer.' },
  contraband: { label: 'Contraband', cls: 'text-danger', tip: 'Illegal here: only fences deal in it, and customs may search you on arrival.' },
};
const AMOUNTS = [1, 5, 10, 25];
type Filter = 'all' | 'cargo' | 'cheap';
type Sort = 'usual' | 'name' | 'price' | 'gain';

/** A town notice. On the phone it opens in full the first time you see it in a town, then folds to one line (tap to open). */
function Notice({ id, className = '', children }: { id: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState<boolean>(() => PHONE && !usePhone.getState().seen[id]);
  useEffect(() => { if (PHONE) usePhone.getState().see(id); }, [id]);
  return <div className={`market-notice panel p-3 text-sm ${className} ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}>{children}</div>;
}

export function Market({ g }: { g: GameState }) {
  const { act, setTab, tradeQty: amt, setTradeQty: setAmt, undo, undoTrade } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const arriving = useGame(s => s.trip !== null);
  const [glow, setGlow] = useState<{ good: string; n: number } | null>(null);
  const traded = (good: string) => setGlow(x => ({ good, n: (x?.n ?? 0) + 1 }));
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('usual');
  // Holding Shift turns the Buy and Sell of the row under the cursor (or the last one it was on) into Buy max and Sell max.
  const lastRow = useRef<string | null>(null);
  const [maxRow, setMaxRow] = useState<string | null>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => setMaxRow(e.shiftKey ? lastRow.current : null);
    const off = () => setMaxRow(null);
    window.addEventListener('keydown', key); window.addEventListener('keyup', key); window.addEventListener('blur', off);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('keyup', key); window.removeEventListener('blur', off); };
  }, []);
  const enterRow = (good: string, e: PointerEvent) => { lastRow.current = good; if (e.shiftKey) setMaxRow(good); };
  const loc = g.player.location;
  const closed = closedParagraph(g, loc);
  const qs = quotes(g, loc);
  const hol = holidayAt(g, loc);
  const free = capacity(g) - cargoWeight(g);
  // Cheapest trip out of here, with `extra` more stone aboard: "Keep fare" holds this back when buying.
  const legs = routeOptions(g);
  const fareWith = (extra: number) => legs.length ? Math.min(...legs.map(o => o.fare + Math.ceil(FREIGHT[o.mode] * extra))) : 0;
  const [keepFare, setKeepFare] = useState(true);
  const tend = true; // the Pocket Guide's perk, always on since 0.10
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
  // Phone: the Show, Sort and Keep fare choices live in a sheet, and each trade shows an Undo bar for 3 seconds.
  const [filters, setFilters] = useState(false);
  const [done, setDone] = useState<{ text: string; n: number } | null>(null);
  useEffect(() => { if (!done) return; const t = setTimeout(() => setDone(null), 3000); return () => clearTimeout(t); }, [done]);
  const tell = (text: string) => { if (PHONE) setDone(d => ({ text, n: (d?.n ?? 0) + 1 })); };
  const showSort = <>
    <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Show">
      <span className="text-ash-400 mr-1">Show</span>
      {([['all', 'All'], ['cargo', 'My cargo'], ['cheap', 'Cheap here ▼']] as const).map(([f, l]) => <button key={f} role="radio" aria-checked={filter === f} className={chip(filter === f)} onClick={() => setFilter(f)}>{l}</button>)}
    </div>
    <label className="flex items-center gap-1"><span className="text-ash-400">Sort</span>
      <select className="input w-auto py-0.5" value={sort} onChange={e => setSort(e.target.value as Sort)}><option value="usual">Usual</option><option value="name">Name</option><option value="price">Cheapest first</option><option value="gain">Best profit elsewhere</option></select></label>
    <label className="flex items-center gap-1" title="Buying leaves enough cash for the cheapest trip out of here, with the new cargo aboard"><input type="checkbox" checked={keepFare} onChange={e => setKeepFare(e.target.checked)} /><span className="text-ash-400">Keep fare</span></label>
  </>;
  const help = `Buy and Sell use the amount chosen above, capped by your cash, cargo space and what you own.${PHONE ? ' Hold a Buy or Sell button for the most on that row; hold a good for its Codex entry; tap a row for its details.' : ' Hold Shift to make them Buy max and Sell max on the row under your cursor.'} ▼ cheap / ▲ expensive compared with the usual price across Tamriel. * sold with a restriction.${PHONE ? '' : ' ▸ opens a good\'s details.'} “Best seen elsewhere” comes from towns you have visited, so it can be out of date. Selling a lot lowers the price; buying a lot raises it.`;
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
      {(() => { const r = ruinLine(g, loc); return r && marketOpen(g, loc) ? <Notice id={`${loc}:${g.world.status[loc]}`} className="italic">{r}</Notice> : null; })()}
      {hol && !hol.marketClosed && <Notice id={`${loc}:${hol.name}`}><span className="text-gold h-display">{hol.name}.</span> {hol.text}</Notice>}
      {(loc === 'lilmoth' || loc === 'stormhold') && !g.player.licence && <Notice id={`${loc}:licence`} className="text-ember">Foreigners need a trade licence here. Buy one at the Lilmoth gate (Shop & Temple tab) or from the Argonian agent in Leyawiin.</Notice>}
      {canContest(g) && g.appeal && (
        <div className={`panel p-3 flex ${PHONE ? '' : 'flex-wrap'} items-center gap-2 text-sm`}>
          {PHONE ? (() => { // two lines on the phone (Sorcerer's wording); the full sentence on desktop
            const goods = Object.keys(g.appeal.goods).length > 0, fine = g.appeal.fine > 0, cost = <Money v={courtCost(g.appeal)} />;
            return <span className="flex-1 min-w-0"><span className="text-gold h-display">{goods && fine ? 'Seized goods and a fine.' : goods ? 'Seized goods.' : 'A fine to contest.'}</span>{' '}
              {goods && fine ? <>Win and you get both back, lose and you pay {cost} more.</> : goods ? <>Contest them before the magistrate: win and you get them back, lose and you pay {cost} more.</> : <>Win and the <Money v={g.appeal.fine} /> fine is returned, lose and you pay {cost} more.</>}
              {' '}Until {formatDate(g.appeal.until ?? g.day)}, here or at Vivec, Ebonheart, Narsis or Mournhold.</span>;
          })() : <>
            <span className="text-gold h-display">{Object.keys(g.appeal.goods).length ? 'Seized goods.' : 'A fine to contest.'}</span>
            <span>You may take it before the magistrate, a card hearing. Win and you get back {Object.keys(g.appeal.goods).length ? 'your goods' : ''}{Object.keys(g.appeal.goods).length && g.appeal.fine ? ' and ' : ''}{g.appeal.fine ? <>the <Money v={g.appeal.fine} /> fine</> : ''}; lose and you pay <Money v={courtCost(g.appeal)} /> more. You can contest it until {formatDate(g.appeal.until ?? g.day)}, in the town where it happened or at the courts of Vivec, Ebonheart, Narsis and Mournhold.</span>
          </>}
          <button className={`btn btn-ember ml-auto ${PHONE ? 'shrink-0 min-w-[120px] justify-center' : ''}`} onClick={() => act({ t: 'appeal' })}>Contest</button>
        </div>
      )}
      {deliverable.map(c => { const t = C.contracts.find(x => x.id === c.templateId)!; return (
        <div key={c.id} className="panel p-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gold h-display">Contract ready.</span> <span>{t.title}: {c.qty} {C.goods[c.good].name}, pays <Money v={c.reward} />.</span>
          <button className="btn btn-ember ml-auto" onClick={() => act({ t: 'deliver', id: c.id })}>Deliver</button>
        </div>
      ); })}
      {closed ? <div className="panel p-4 fell text-parchment">{closed}</div> : <Section className="market-sec" title={PHONE ? '' : 'Goods'} right={<span className="text-xs text-ash-400">Cash <Money v={g.player.cash} className="text-gold" /> · <span title="The fare grows with your cargo: the second figure is the fare with your hold full">cheapest trip <Money v={fareWith(0)} /> (full load <Money v={fareWith(free)} />)</span> · space left {free}</span>}>
        <div className="market-head flex flex-wrap items-center gap-x-4 gap-y-2 mb-2 text-sm">
          {PHONE && <button className="btn" onClick={() => usePhone.getState().setSheet('town')}>Town ▾</button>}
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Trade amount">
            <span className="amount-label text-ash-400 mr-1">Amount</span>
            {AMOUNTS.map(n => <button key={n} role="radio" aria-checked={amt === n} className={chip(amt === n)} onClick={() => setAmt(n)}><span className="font-body num">{n}</span></button>)}
            <button role="radio" aria-checked={amt === 'max'} className={chip(amt === 'max')} onClick={() => setAmt('max')} title="Buy as many as you can afford and carry; sell everything">Max</button>
            {!PHONE && <input aria-label="Custom amount" type="number" min={1} placeholder="other" className="input w-20 num py-0.5"
              value={typeof amt === 'number' && !AMOUNTS.includes(amt) ? amt : ''} onChange={e => setAmt(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />}
          </div>
          {PHONE ? <button className="btn" onClick={() => setFilters(true)}>Filter ▾{filter !== 'all' && <span className="text-gold" aria-label="(on)"> •</span>}</button> : showSort}
          <button className="btn ml-auto" disabled={!profitable.length} onClick={e => { const el = e.currentTarget; let sum = 0; for (const q of profitable) { const n = g.player.cargo[q.good].qty; if (act({ t: 'sell', good: q.good, qty: n })) sum += n * (q.sell ?? 0); } if (sum) { coinBurst(el, 'cash', coinsFor(sum)); tell(`Sold ${profitable.length} goods at a profit`); } }}
            title="Sell every good whose price here is above what you paid">{PHONE ? 'Sell all' : 'Sell all at a profit'}{profitable.length ? ` (${profitable.length})` : ''}</button>
          {PHONE ? <button className="btn btn-ghost" disabled={!undo.length} onClick={undoTrade}>↶ Undo</button> : undo.length > 0 && <button className="btn btn-ghost" onClick={undoTrade} title="Take back your last buy or sell. Works until you travel, wait or do anything else.">↶ Undo last trade{undo.length > 1 ? ` (${undo.length})` : ''}</button>}
        </div>
        <div className="overflow-x-auto">
          <table className="market-table w-full text-sm">
            <thead><tr className="text-left text-xs h-display uppercase text-ash-400">
              <th className="py-1">Good</th>{!PHONE && <th>Weight</th>}<th className="text-right pl-2">You buy</th><th className="text-right pl-3">You sell</th><th className="text-right pl-3">Owned</th>{!PHONE && <th className="text-right pl-3" title="The highest price you have seen for it in another town">Best seen elsewhere</th>}<th></th>
            </tr></thead>
            <tbody>
              <AnimatePresence initial={false}>
              {rows.map((q, i) => {
                const G = C.goods[q.good]; const lot = g.player.cargo[q.good];
                const r = ratio(q);
                const maxBuy = maxBuyQty(q.buy, DEPTH[G.category], keepFare ? Math.max(0, g.player.cash - fareWith(free)) : g.player.cash, free, G.weight);
                const asMax = amt === 'max' || maxRow === q.good;
                const nBuy = asMax ? maxBuy : Math.min(amt as number, maxBuy);
                const nSell = lot && q.sell !== null ? (asMax ? lot.qty : Math.min(amt as number, lot.qty)) : 0;
                const maxWord = maxRow === q.good || (PHONE && amt === 'max') ? 'max ' : '';
                // Phone: a button that can't act says why, in words, instead of a tooltip.
                const whyBuy = q.buy === null ? 'Not for sale' : g.player.cash < q.buy ? `Need ${Math.ceil(q.buy - g.player.cash)} more` : free < G.weight ? 'Hold full' : 'Saving the fare';
                const whySell = 'Nobody buys this'; // a good you don't carry gets no Sell button on the phone at all
                const margin = lot && q.sell !== null ? Math.round(q.sell - lot.cost) : null;
                const l = LEG[q.legality];
                const sat = g.markets[loc]?.[q.good]?.sat ?? 1;
                const best = bestSeenSell(g, q.good, loc);
                const edge = best && q.buy !== null ? best.price - q.buy : null;
                const buyTotal = nBuy > 0 ? bulkBuyTotal(q.buy!, nBuy, DEPTH[G.category]) : 0;
                const sellTotal = nSell > 0 ? bulkSellTotal(q.sell!, nSell, DEPTH[G.category]) : 0;
                const isOpen = open === q.good;
                // Buy and Sell, also used by the long-press shortcut (max for this row) on touch screens.
                const buy = (n: number, el: Element) => { if (n >= 1 && act({ t: 'buy', good: q.good, qty: n })) { coinBurst('cash', el, coinsFor(n * (q.buy ?? 0))); traded(q.good); tell(`Bought ${n} ${G.name} for ${bulkBuyTotal(q.buy!, n, DEPTH[G.category]).toLocaleString('en-US')} septims`); } };
                const sell = async (n: number, el: Element) => {
                  if (n < 1 || q.sell === null) return;
                  if (margin !== null && margin < 0 && !(await useGame.getState().confirm({ title: `Sell at a loss?`, text: `${n} ${G.name} at ${-margin} below what you paid each: ${-margin * n} septims lost in all.`, yes: 'Sell anyway' }))) return;
                  if (act({ t: 'sell', good: q.good, qty: n })) { coinBurst(el, 'cash', coinsFor(n * (q.sell ?? 0))); traded(q.good); tell(`Sold ${n} ${G.name} for ${bulkSellTotal(q.sell, n, DEPTH[G.category]).toLocaleString('en-US')} septims`); }
                };
                // Everything the row's hover tips say, written out for touch and keyboard players.
                const details = [
                  PHONE && G.short,
                  PHONE && tend && `${(C.locs[loc].tendencies[q.good] ?? 1) < 0.9 ? 'Usually cheap here' : (C.locs[loc].tendencies[q.good] ?? 1) > 1.2 ? 'Usually expensive here' : 'The usual price here'}.`,
                  l.tip,
                  sat < 0.85 && `So much has been sold here lately that the price is down. Back to normal in about ${satRecoveryDays(sat)} days.`,
                  sat > 1.2 && `So much has been bought here lately that the price is up. Back to normal in about ${satRecoveryDays(sat)} days.`,
                  q.buy !== null && `Buy from ${q.buyFrom}${r < 0.8 ? ', well below the usual price' : r > 1.25 ? ', well above the usual price' : ''}. You can afford and carry ${maxBuy}.`,
                  nBuy > 1 && `Buying ${nBuy} at once costs ${buyTotal.toLocaleString('en-US')} (${Math.round(buyTotal / nBuy)} each instead of ${q.buy}).`,
                  q.sell !== null && `Sell to ${q.sellTo}${q.sellNote ? ` (${q.sellNote})` : ''}.`,
                  nSell > 1 && `Selling ${nSell} at once brings ${sellTotal.toLocaleString('en-US')} (${Math.round(sellTotal / nSell)} each instead of ${q.sell}).`,
                  lot && `You own ${lot.qty}, bought at ${Math.round(lot.cost)} each on average.`,
                  PHONE && `Weight ${G.weight} each.${nBuy > 0 ? ` Buying ${nBuy} costs ${buyTotal.toLocaleString('en-US')} and leaves ${free - nBuy * G.weight} space.` : ''}${nSell > 0 ? ` Selling ${nSell} brings ${sellTotal.toLocaleString('en-US')}.` : ''}`,
                  best && `Best price seen elsewhere: ${best.price} in ${C.locs[best.loc].name}, ${ago(best.age)}. Prices move, so older figures are less reliable.`,
                ].filter((x): x is string => !!x);
                return [
                  <motion.tr key={q.good} onPointerEnter={e => enterRow(q.good, e)}
                    onClick={PHONE ? e => { if (!(e.target as Element).closest('button, a')) setOpen(isOpen ? null : q.good); } : undefined}
                    ref={PHONE ? onLongPress<HTMLTableRowElement>(() => useGame.getState().openCodex(`good:${q.good}`)) : undefined} className={`relative border-t border-ash-700 hover:bg-ash-800 ${lot ? 'bg-ash-800/60' : ''}`}
                    initial={arriving ? { opacity: 0, x: -10 } : { opacity: 0 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.28, delay: arriving ? Math.min(i, 15) * 0.028 : 0, ease: [0.22, 1, 0.36, 1] }}>
                    <td className="py-1.5 pr-2">
                      {glow?.good === q.good && <span key={glow.n} className="row-glow" aria-hidden="true" />}
                      <GoodIcon id={q.good} category={G.category} /> <CodexLink id={`good:${q.good}`} className="text-bone">{G.name}</CodexLink>
                      {l.label && <span title={l.tip} className={`ml-1 text-[.7rem] h-display uppercase ${l.cls}`}>{l.label}</span>}
                      {sat < 0.85 && <span className="ml-1 text-[.7rem] h-display uppercase text-danger" title={`So much has been sold here lately that the price is down. Back to normal in about ${satRecoveryDays(sat)} days.`}>Flooded · {satRecoveryDays(sat)}d</span>}
                      {sat > 1.2 && <span className="ml-1 text-[.7rem] h-display uppercase text-gold" title={`So much has been bought here lately that the price is up. Back to normal in about ${satRecoveryDays(sat)} days.`}>Bought out · {satRecoveryDays(sat)}d</span>}
                      {!PHONE && <button className="ml-1 px-1 text-ash-400 hover:text-bone" aria-expanded={isOpen} aria-label="Details" title={`${isOpen ? 'Hide' : 'Show'} details`} onClick={() => setOpen(isOpen ? null : q.good)}>{isOpen ? '▾' : '▸'}</button>}
                      {!PHONE && <div className="text-xs text-ash-400">{G.short}{tend && <span className="text-gold"> · {(C.locs[loc].tendencies[q.good] ?? 1) < 0.9 ? 'usually cheap here' : (C.locs[loc].tendencies[q.good] ?? 1) > 1.2 ? 'usually expensive here' : 'usual price here'}</span>}</div>}
                    </td>
                    {!PHONE && <td className="num text-ash-400">{G.weight}</td>}
                    <td className="text-right whitespace-nowrap">{q.buy !== null ? <span title={`from ${q.buyFrom}`}><Money v={q.buy} /> {r < 0.8 ? <span className="text-moss" title="Cheap: well below the usual price">▼</span> : r > 1.25 ? <span className="text-danger" title="Expensive: well above the usual price">▲</span> : null}</span> : <span className="text-ash-400 text-xs">{q.stock ? '—' : 'out of stock'}</span>}</td>
                    <td className="text-right whitespace-nowrap">{q.sell !== null ? <span title={`to ${q.sellTo}${q.sellNote ? ` (${q.sellNote})` : ''}`}><Money v={q.sell} />{q.sellNote && <span className="text-ice text-xs">*</span>}</span> : <span className="text-ash-400 text-xs">no buyer</span>}
                      {margin !== null && <div className={`text-xs ${margin >= 0 ? 'text-moss' : 'text-danger'}`} title={`You paid ${Math.round(lot!.cost)} each`}>{margin >= 0 ? '+' : ''}{margin} each</div>}</td>
                    <td className="text-right num pl-3">{lot ? <motion.span key={lot.qty} className="inline-block" initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }} title={`You paid ${Math.round(lot.cost)} each on average`}>{lot.qty}</motion.span> : <span className="text-ash-400">0</span>}</td>
                    {!PHONE && <td className="text-right pl-3 whitespace-nowrap">{best ? <span title={`Seen in ${C.locs[best.loc].name} ${ago(best.age)}. Prices move, so older figures are less reliable.`}><Money v={best.price} />{edge !== null && edge > 0 && <span className="text-moss text-xs"> (+{Math.round(edge)})</span>}<span className="block text-xs text-ash-400">{C.locs[best.loc].name}, {ago(best.age)}</span></span> : <span className="text-ash-400 text-xs">not seen yet</span>}</td>}
                    <td className="whitespace-nowrap pl-3 text-right space-x-1">
                      <button className="btn" disabled={nBuy < 1} ref={onLongPress(el => buy(maxBuy, el))} onClick={e => buy(nBuy, e.currentTarget)} title={nBuy < 1 ? (q.buy === null ? 'Not for sale here' : 'No money or cargo space for this') : `Buy ${nBuy} for ${bulkBuyTotal(q.buy!, nBuy, DEPTH[G.category]).toLocaleString('en-US')} septims (the most you can afford and carry: ${maxBuy}). Buying many at once raises the price a little.`}>{PHONE && nBuy < 1 ? whyBuy : <>Buy {maxWord}{nBuy > 0 ? <span className="font-body num">{nBuy}</span> : ''}</>}</button>
                      {PHONE && !lot ? <span className="phone-nosell" aria-hidden="true" /> : <button className="btn" disabled={nSell < 1} ref={onLongPress(el => void sell(lot?.qty ?? 0, el))} onClick={e => void sell(nSell, e.currentTarget)} title={nSell < 1 ? (lot ? 'Nobody here buys this' : 'You have none') : `Sell ${nSell}`}>{PHONE && nSell < 1 ? whySell : <>{PHONE && amt === 'max' ? 'Sell all ' : `Sell ${maxWord}`}{nSell > 0 ? <span className="font-body num">{nSell}</span> : ''}</>}</button>}
                      {!PHONE && (nBuy > 0 || nSell > 0) && <div className="text-xs text-ash-400 mt-0.5">{nBuy > 0 && <span title="Total cost, and cargo space left after buying">−<span className="num">{buyTotal.toLocaleString('en-US')}</span> · {free - nBuy * G.weight} space left</span>}{nBuy > 0 && nSell > 0 && ' | '}{nSell > 0 && <span title="What this sale brings in">+<span className="num">{sellTotal.toLocaleString('en-US')}</span></span>}</div>}
                    </td>
                  </motion.tr>,
                  isOpen && <tr key={`${q.good}-details`} className="bg-ash-800/40"><td colSpan={PHONE ? 5 : 7} className="px-6 pb-2 text-xs text-parchment"><ul className="list-disc pl-4 space-y-0.5">{details.map((d, j) => <li key={j}>{d}</li>)}</ul></td></tr>,
                ];
              })}
              </AnimatePresence>
              {!rows.length && <tr><td colSpan={PHONE ? 5 : 7} className="py-3 text-ash-400">Nothing matches this filter.</td></tr>}
            </tbody>
          </table>
        </div>
        {!PHONE && <p className="text-xs text-ash-400 mt-2">{help}</p>}
      </Section>}
      {!closed && cargoGoods.length > 0 && (
        <Section title="In your cargo, but nobody here buys it">
          <div className="flex flex-wrap gap-3 text-sm">{cargoGoods.map(id => <span key={id}><GoodIcon id={id} category={C.goods[id].category} /> <CodexLink id={`good:${id}`}>{C.goods[id].name}</CodexLink> ×{g.player.cargo[id].qty}</span>)}</div>
        </Section>
      )}
      {filters && <Sheet title="Filter & more" onClose={() => setFilters(false)}><div className="flex flex-col items-start gap-3 text-sm">{showSort}<p className="text-xs text-ash-400">{help}</p></div></Sheet>}
      <AnimatePresence>{done && (
        <motion.div key={done.n} role="status" className="phone-undo panel-solid" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
          <span className="min-w-0 truncate">{done.text}</span>
          <button className="btn ml-auto" disabled={!undo.length} onClick={() => { undoTrade(); setDone(null); }}>Undo</button>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}
