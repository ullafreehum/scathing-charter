import { C } from '../data';
import { holidayAt, LICENCE_PRICE, type GameState } from '../engine';
import { useGame } from '../store/game';
import { Badge, CodexLink, Money, Section } from './widgets';

export function Outfitter({ g }: { g: GameState }) {
  const act = useGame(s => s.act);
  const L = C.locs[g.player.location];
  const hol = holidayAt(g, L.id);
  const healCost = hol?.freeHeal ? 0 : Math.round((100 - g.player.health) * 2 * (hol?.templeHalf ? 0.5 : 1));
  const owned = (id: string) => g.player.weapon === id || g.player.armor === id || g.player.conveyance === id;
  return (
    <div className="grid xl:grid-cols-2 gap-3">
      <Section title="Outfitter">
        {!L.outfitter ? <p className="text-sm text-ash-400">No outfitter here.</p> : (['conveyance', 'weapon', 'armor', 'scroll'] as const).map(kind => (
          <div key={kind} className="mb-2">
            <div className="h-display text-xs uppercase text-ash-400 mt-1">{kind === 'conveyance' ? 'Beasts & holds' : kind === 'armor' ? 'Armour' : kind === 'scroll' ? 'Scrolls' : 'Weapons'}</div>
            {C.gearList.filter(x => x.kind === kind && x.price > 0).map(x => (
              <div key={x.id} className="flex items-center gap-2 text-sm py-1 border-t border-ash-700/50">
                <div className="flex-1"><CodexLink id={`gear:${x.id}`} className="text-bone">{x.name}</CodexLink> <Badge canon={x.canon} /><div className="text-xs text-ash-400">{x.text}{x.power ? ` Power ${x.power}.` : ''}{kind === 'scroll' ? ` You carry ${g.player.scrolls[x.id as 'chameleon']}.` : ''}</div></div>
                <button className="btn" aria-label={owned(x.id) ? `${x.name}: owned` : `Buy ${x.name} for ${x.price} septims`} disabled={owned(x.id) || g.player.cash < x.price} onClick={() => act({ t: 'gear', id: x.id })}>{owned(x.id) ? 'Owned' : <Money v={x.price} />}</button>
              </div>
            ))}
          </div>
        ))}
      </Section>
      <div className="flex flex-col gap-3">
        <Section title={L.temple === 'tribunal' ? 'Temple' : L.shrine ? 'Imperial shrine' : L.temple ? 'Healers' : 'No healer'}>
          {(L.temple || L.shrine) ? (
            <>
              <p className="text-sm">Health {g.player.health}/100. {hol?.freeHeal ? 'Free healing today.' : hol?.templeHalf ? 'Half the usual donation today.' : 'The temple asks a “suggested donation”.'}</p>
              <button className="btn btn-ember mt-2" disabled={g.player.health >= 100} onClick={() => act({ t: 'heal' })}>Heal (<Money v={healCost} />)</button>
            </>
          ) : <p className="text-sm text-ash-400">No temple or shrine here.</p>}
          {L.temple === 'tribunal' && <p className="text-xs text-ash-400 mt-2">A Tribunal temple: <CodexLink id="topic:almsivi">Almsivi Intervention</CodexLink> lands here. Its reliability is now {g.world.flags.almsivi ?? 95}% <Badge canon="extrapolation" />.</p>}
        </Section>
        <Section title="Your kit">
          <p className="text-sm">{C.gear[g.player.conveyance].name}, {g.player.porters} porters. {C.gear[g.player.weapon].name}, {C.gear[g.player.armor].name}. Scrolls: Chameleon {g.player.scrolls.chameleon}, Almsivi {g.player.scrolls.almsivi}, Divine {g.player.scrolls.divine}.</p>
          <p className="text-sm mt-1">Reputation: {Object.entries(g.player.rep).map(([f, v]) => <span key={f} className="mr-2"><CodexLink id={`faction:${f}`}>{C.factions[f]?.name ?? f}</CodexLink> <span className={v > 0 ? 'text-moss' : v < 0 ? 'text-[#e2584a]' : ''}>{v > 0 ? '+' : ''}{v}</span></span>)}</p>
          <p className="text-sm mt-1">Mercy {g.player.mercy}. Books: {g.player.books.length}.</p>
        </Section>
        {(L.id === 'lilmoth' || L.id === 'leyawiin') && (
          <Section title="An-Xileel trade licence" right={<Badge canon="extrapolation" />}>
            <p className="text-sm">Only licensed foreigners may trade in Lilmoth (and here, in Stormhold too). <CodexLink id="topic:lilmoth-licence">Why?</CodexLink></p>
            <button className="btn mt-2" disabled={g.player.licence} onClick={() => act({ t: 'licence' })}>{g.player.licence ? 'Licensed' : <>Buy licence <Money v={LICENCE_PRICE} /></>}</button>
          </Section>
        )}
      </div>
    </div>
  );
}
