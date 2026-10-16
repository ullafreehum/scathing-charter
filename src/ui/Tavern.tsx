import { C } from '../data';
import { holidayAt, shortDate, RUMOR_PRICE, WAGES, BOARD_PER_DAY, type GameState } from '../engine';
import { useGame } from '../store/game';
import { Badge, CodexLink, Money, Section } from './widgets';

export function Tavern({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const L = C.locs[g.player.location];
  const hol = holidayAt(g, L.id);
  const offers = g.offers.filter(o => o.origin === L.id);
  const heard = g.heard.slice(-6).reverse().map(id => C.rumors.find(r => r.id === id)!).filter(Boolean);
  return (
    <div className="grid xl:grid-cols-2 gap-3">
      <Section title={`Tavern: ${L.tavern}`}>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ember" onClick={() => act({ t: 'rumor' })}>Stand a round {hol?.freeRumor ? '(free tonight)' : <>(<Money v={RUMOR_PRICE} />)</>}</button>
          {[1, 3, 7].map(d => <button key={d} className="btn" onClick={() => act({ t: 'wait', days: d })} title={hol?.freeRest ? 'Free rooms today' : `Board ${BOARD_PER_DAY * d * g.timeScale} dr`}>Rest {d} day{d > 1 ? 's' : ''}{g.timeScale > 1 ? ` (×${g.timeScale})` : ''}</button>)}
        </div>
        <div className="mt-3 space-y-2">{heard.map(r => (
          <div key={r.id} className="text-sm border-l-2 border-ash-600 pl-2"><span className="fell italic text-parchment">{r.voice ? `${r.voice}: ` : ''}“{r.text}”</span> <Badge canon={r.canon} />
            {r.dispute && <> <CodexLink id={`dispute:${r.dispute}`} className="text-lilac text-xs">({r.dispute}: historians disagree)</CodexLink></>}</div>
        ))}{!heard.length && <p className="text-sm text-ash-400">Buy a drink and listen. Rumours hold price tips, omens of what is coming, and arguments about what really happened.</p>}</div>
      </Section>
      <Section title="Contracts">
        {offers.length === 0 && <p className="text-sm text-ash-400">No one here has work for you today.</p>}
        {offers.map(o => { const t = C.contracts.find(x => x.id === o.templateId)!; return (
          <div key={o.id} className="border-t border-ash-700/60 py-2 text-sm">
            <div className="flex items-center gap-2"><span className="text-bone">{t.title}</span> <Badge canon={t.canon} /><button className="btn ml-auto" onClick={() => act({ t: 'accept', id: o.id })}>Accept</button></div>
            <div className="text-parchment/85">{t.text}</div>
            <div className="text-xs text-ash-400">{t.issuer}: {o.qty} <CodexLink id={`good:${o.good}`}>{C.goods[o.good].name}</CodexLink> to {C.locs[o.destination].name} by {shortDate(o.deadline)}. Pays <Money v={o.reward} />{t.mercy > 0 && <span className="text-moss"> · Mercy +{t.mercy}</span>}</div>
          </div>
        ); })}
        {g.contracts.length > 0 && <div className="mt-3"><div className="h-display text-xs uppercase text-ash-400">Your contracts</div>
          {g.contracts.map(c => { const t = C.contracts.find(x => x.id === c.templateId)!; const can = c.destination === L.id && (g.player.cargo[c.good]?.qty ?? 0) >= c.qty; return (
            <div key={c.id} className="flex items-center gap-2 text-sm py-1"><span>{t.title}: {c.qty} {C.goods[c.good].name} → {C.locs[c.destination].name}, by {shortDate(c.deadline)}</span>
              <button className="btn ml-auto" disabled={!can} onClick={() => act({ t: 'deliver', id: c.id })}>Deliver</button></div>
          ); })}</div>}
      </Section>
      <Section title="Hire hands">
        <p className="text-sm">Porters: {g.player.porters}/{WAGES.porter.max} (+12 stone each, <Money v={WAGES.porter.hire} /> to hire, <Money v={WAGES.porter.day} />/day). Sellswords: {g.player.sellswords}/{WAGES.sellsword.max} (<Money v={WAGES.sellsword.hire} />, <Money v={WAGES.sellsword.day} />/day).</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button className="btn" onClick={() => act({ t: 'hire', who: 'porter', delta: 1 })}>Hire porter</button>
          <button className="btn btn-ghost" onClick={() => act({ t: 'hire', who: 'porter', delta: -1 })}>Dismiss porter</button>
          <button className="btn" onClick={() => act({ t: 'hire', who: 'sellsword', delta: 1 })}>Hire sellsword</button>
          <button className="btn btn-ghost" onClick={() => act({ t: 'hire', who: 'sellsword', delta: -1 })}>Dismiss sellsword</button>
        </div>
        <p className="text-xs text-ash-400 mt-2">Unpaid for three days, hirelings walk off.</p>
      </Section>
      {L.books && (
        <Section title="Bookseller">
          {C.books.filter(b => b.from === undefined || g.day >= b.from).map(b => (
            <div key={b.id} className="border-t border-ash-700/60 py-2 text-sm">
              <div className="flex items-center gap-2"><CodexLink id={`book:${b.id}`} className="text-bone">{b.title}</CodexLink> <Badge canon={b.canon} />
                <button className="btn ml-auto" aria-label={g.player.books.includes(b.id) ? `${b.title}: owned` : `Buy ${b.title} for ${b.price} septims`} disabled={g.player.books.includes(b.id)} onClick={() => act({ t: 'book', id: b.id })}>{g.player.books.includes(b.id) ? 'Owned' : <>Buy <Money v={b.price} /></>}</button></div>
              <div className="text-xs text-ash-400">{b.author}{b.perk && b.perk !== 'none' ? ` · reading helps: ${b.perk === 'tendencies' ? 'shows where goods are cheap or dear' : b.perk === 'customs' ? 'fewer customs searches' : 'more omens in rumours'}` : ''}</div>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
