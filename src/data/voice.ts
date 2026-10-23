// The trader's own words (0.10.6). Everything the game says about you in your own Ledger, in two registers:
// `before` is the naive first-person voice used until the eruption, `after` the sober one. Never state the eruption
// date in a `before` line. Text by Sorcerer (handoff/0.10.6-text.md); each `{x}` there is a parameter here.

export const LOG_VOICE = {
  newGame: { before: (debt: number) => `New Life Festival in Balmora, and I am already in debt: ${debt} septims to Gavas Drelloth. Every trader starts somewhere.`, after: (debt: number) => `New Life Festival in Balmora, and I am already in debt: ${debt} septims to Gavas Drelloth. Every trader starts somewhere.` },
  borrow: { before: (amt: number) => `Borrowed ${amt} more from the Tong. Drelloth smiled, which I took for friendship.`, after: (amt: number) => `Borrowed ${amt} more from the Tong. I know what the smile costs now.` },
  payOff: { before: () => `Paid off the Camonna Tong. I owe no one, and the sky is very blue.`, after: () => `Paid off the Camonna Tong in full. Few in this country can say that, and I feel no pride in it.` },
  delivered: { before: (qty: number, good: string, issuer: string, reward: number) => `Delivered ${qty} ${good} for ${issuer}. ${reward} septims and a handshake. Easy work.`, after: (qty: number, good: string, issuer: string, reward: number) => `Delivered ${qty} ${good} for ${issuer}: ${reward} septims. They needed it more than they said.` },
  contractFailed: { before: (qty: number, good: string, dest: string) => `${qty} ${good} never reached ${dest}. Bad luck, nothing more.`, after: (qty: number, good: string, dest: string) => `${qty} ${good} never reached ${dest}. The roads are not what they were, and someone there is still waiting.` },
  walkOff: { before: () => `My porters and sellswords left in the night, unpaid. Ungrateful lot.`, after: () => `I could not pay my porters and sellswords, and they left in the night. I cannot blame them.` },
  passage: { before: (fare: number, job: string) => `Could not pay the ${fare}-septim fare, so I worked my passage as a ${job}. Honest labour, I suppose.`, after: (fare: number, job: string) => `Could not pay the ${fare}-septim fare. I worked my passage as a ${job} and did not complain.` },
  roughSleep: { before: () => `No coin for a bed, so I slept out in the ash. It is only ash.`, after: () => `No coin for a bed. I slept in the ash. It was warm, which is the worst of it.` },
  job: { before: (job: string, days: string, pay: number) => `Worked as a ${job} for ${days} and earned ${pay} septims. Not so bad.`, after: (job: string, days: string, pay: number) => `Worked as a ${job} for ${days} and earned ${pay} septims. Everyone needs hands now.` },
  informer: { before: (fine: number) => `An EEC informer, of all things. Fined ${fine} septims. I will be more careful.`, after: (fine: number) => `An EEC informer was watching and I paid ${fine} septims. There are worse things than a fine.` },
  tradeTip: { before: (tip: string) => `Paid for a drink and got a tip with it: ${tip} Tavern keepers know everything.`, after: (tip: string) => `Bought a drink, got a tip: ${tip} I take them seriously now.` },
  tale: { before: () => `Over my drink I heard an old tale. It is in my Codex, for company.`, after: () => `Over my drink I heard an old tale. It is in my Codex, for whatever it is worth.` },
  taleDispute: { before: () => `Two scholars quarrelled over my drink. I put it in the Codex, since no one else will.`, after: () => `I listened to historians quarrel over a drink. It is in the Codex. They are quieter these days.` },
  book: { before: (title: string) => `Read ${title} in a bookshop. It is in my Codex now, and I feel cleverer.`, after: (title: string) => `Read ${title} in a bookshop. It is in my Codex. I will need to know such things.` },
  dividend: { before: (amt: number) => `Charter dividend: ${amt} septims. Money for nothing, which is the best kind.`, after: (amt: number) => `Charter dividend: ${amt} septims. Money still arrives, which is more than most can say.` },
  buySeat: { before: (name: string, price: number) => `Bought the ${name} for ${price} septims. Now I am somebody.`, after: (name: string, price: number) => `Bought the ${name} for ${price} septims. A seat is a seat, even now.` },
  bigSale: { before: (qty: number, good: string, amt: number, town: string) => `Sold ${qty} ${good} for ${amt} septims in ${town}. This is what the trade is for.`, after: (qty: number, good: string, amt: number, town: string) => `Sold ${qty} ${good} for ${amt} septims in ${town}. I did not haggle.` },
  payPart: { before: (amt: number) => `Paid ${amt} to the Tong. Drelloth thanked me kindly.`, after: (amt: number) => `Paid ${amt} to the Tong. Drelloth did not thank me. He wrote it down.` },
  warning: { before: (text: string) => `Paid for a drunk’s talk, and it was gloomy: “${text}” Nonsense, surely.`, after: (text: string) => `Heard it said: “${text}” I know better than to laugh now.` },
} as const;

export type LogKey = keyof typeof LOG_VOICE;

/** Lines that only exist once the eruption and its aftermath have happened. */
export const LOG_AFTER = {
  renew: (fee: number) => `Renewed my charter with the new council: ${fee} septims. New names on the door, the same fee in the end.`,
  missedRenewal: (name: string) => `Missed the charter renewal and lost the ${name}. A fool’s mistake, and mine.`,
  vaultGone: (house: string, town: string, amt: number) => `The ${house} vault at ${town} is gone, and ${amt} septims with it. I counted that money every night.`,
  depositFrozen: (amt: number, town: string) => `My ${amt} septims at ${town} are frozen. The House promises a settlement. I have heard promises.`,
  depositCarried: (town: string, settle: string) => `My deposit at ${town} was carried by writ to ${settle}. Someone is still keeping books.`,
  noteMoves: (town: string) => `My note now answers to the Tong at ${town}. Drelloth is not a man who loses papers.`,
  frozenSettled: (house: string, amt: number, settle: string) => `The ${house} settles my frozen account: ${amt} septims, payable at ${settle}. I did not expect that.`,
  arriveRuin: (town: string) => `Came to ${town}. The ruin is worse than the rumour.`,
} as const;

/** Gavas Drelloth on the Bank tab (long) and in the phone status strip (short, under 30 characters). */
export const DRELLOTH: Readonly<Record<string, { long: string; short: string }>> = {
  'cleared': { long: 'Drelloth’s clerk crosses your name out. He does not look up.', short: 'Tong: cleared' },
  'p0.borrowed': { long: 'Drelloth lends gladly and counts patiently. Each loan is a longer leash.', short: 'Drelloth lends. Patiently.' },
  'p0.half': { long: 'Drelloth admits you have halved the note. He admits it the way a man admits a bruise.', short: 'Note halved. Drelloth winces.' },
  'p0.paid': { long: 'Drelloth calls you a careful man. From him that is not praise.', short: 'Drelloth: a careful man.' },
  'p0.never': { long: 'Drelloth sends word: he has not forgotten your name.', short: 'Drelloth knows your name.' },
  'p1.half': { long: 'Drelloth has not forgotten that you halved the note. He is asking the clerk how long ago it was.', short: 'Halved once. Drelloth counts.' },
  'p1.paid': { long: 'Your last payment was a while ago. Drelloth has begun to count the days aloud.', short: 'Drelloth counts the days.' },
  'p1.never': { long: 'Drelloth is getting impatient. He has asked the clerk how long since you called. The clerk knew.', short: 'Drelloth is losing patience.' },
  'p2.paid': { long: 'You paid before, and Drelloth remembers it. The collectors are on the roads all the same.', short: 'Collectors are on the roads.' },
  'p2.never': { long: 'The collectors have your description. They do not know your face yet. They will.', short: 'Collectors hold your name.' },
  'p3.paid': { long: 'You were a good account once. Drelloth sent the killers anyway, with regret, he says.', short: 'Killers sent, with regret.' },
  'p3.never': { long: 'Drelloth has stopped writing letters. The men he sent do not write either.', short: 'Drelloth sent the killers.' },
};

/** The end-screen paragraph about what you knew, and when: sentence A (what you were told), then B (what you lost). */
export const KNEW = {
  a: (n: number) => n === 0 ? 'Nobody warned you. Nobody could.' : n === 1 ? 'You were warned once.' : n < 4 ? `You were warned ${n} times.` : `You were warned ${n} times. Anyone who listened in the taverns knew.`,
  b: (n: number, deposits: number, cargo: number, where: string, cargoWhere: string): string => {
    const vaults = where.includes(' and ') ? 'vaults' : 'vault', d = deposits.toLocaleString('en-US'), c = cargo.toLocaleString('en-US');
    if (deposits > 0 && cargo > 0) return `You had ${d} septims in the ${where} ${vaults} and ${c} septims of goods in your hands when the moon fell.`;
    if (deposits > 0) return n > 0 ? `You left ${d} septims in the ${where} ${vaults} anyway.` : `You left ${d} septims in the ${where} ${vaults}, as anyone would have.`;
    if (cargo > 0) return `You were carrying ${c} septims of goods in ${cargoWhere} when the moon fell.`;
    return n > 0 ? 'You kept nothing in Vvardenfell when the moon fell. Perhaps you listened.' : 'You kept nothing in Vvardenfell when the moon fell.';
  },
} as const;

/** A shut market on a holiday (no town-specific text). */
export const HOLIDAY_CLOSED = (town: string, date: string, name: string) => `${town}, ${date}. The stalls are shuttered for ${name}. Nothing is sold today.`;

/** What a town's market paragraph says when it has no text of its own, by status (after the dateline). */
export const RUIN_GENERIC: Readonly<Record<string, string>> = {
  'closed': 'The gates are shut and the stalls are gone. Nothing is sold here.',
  'ruined': 'The ash has buried most of the stalls, and the few traders left charge what they like.',
  'camp': 'Survivors live in tents on the ash, and a few of them sell what they carry.',
  'sacked': 'The war-bands have been through. Doors hang open, and the few stalls left are guarded.',
  'occupied': 'Soldiers hold the square, and traders open only when they allow it.',
  'besieged': 'The gates are barred against the enemy, and trade is thin.',
  'rebuilding': 'Masons are at work on the square, and a few stalls have reopened.',
  'refugee-swollen': 'The square is full of refugees and short of goods.',
};
