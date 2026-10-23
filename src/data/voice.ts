// The trader's own words (0.10.6). Everything the game says about you in your own Ledger, in two registers:
// `before` is the naive first-person voice used until the eruption, `after` the sober one. Never state the eruption
// date in a `before` line. Draft text; the final strings come from Sorcerer (handoff/0.10.6-text.md).

export const LOG_VOICE = {
  borrow: { before: (n: number) => `Took ${n} more from the Tong. Gavas was kind about it.`, after: (n: number) => `Borrowed ${n} more from the Tong. I knew what it would cost.` },
  payPart: { before: (n: number) => `Paid the Tong ${n}. One more step toward owing no one.`, after: (n: number) => `Paid the Tong ${n}. Drelloth wrote it down without looking up.` },
  payOff: { before: () => 'Paid off the Camonna Tong. I owe no one.', after: () => 'Paid off the Camonna Tong. I owe no one, and I am no longer sure that is the same as being safe.' },
  delivered: { before: (qty: number, good: string, issuer: string, reward: number) => `Delivered ${qty} ${good} for ${issuer}: ${reward} septims. Easy work.`, after: (qty: number, good: string, issuer: string, reward: number) => `Delivered ${qty} ${good} for ${issuer}: ${reward} septims. Somebody needed them.` },
  contractFailed: { before: (qty: number, good: string, dest: string) => `Contract failed: ${qty} ${good} never reached ${dest}. I will do better.`, after: (qty: number, good: string, dest: string) => `Contract failed: ${qty} ${good} never reached ${dest}. I will not be sure where they went.` },
  tradeTip: { before: (tip: string) => `Paid for a trade tip, and a good one: ${tip}`, after: (tip: string) => `Bought a trade tip: ${tip}` },
  warning: { before: (text: string) => `Paid a few septims for a drunk's talk. ${text} Priests' nonsense, I am sure.`, after: (text: string) => `Heard it said: ${text} I should have listened.` },
  tale: { before: () => 'Heard an old tale over my drink. I wrote it down for later.', after: () => 'Heard an old tale over my drink. I wrote it down, in case someone asks.' },
  taleDispute: { before: () => 'Two scholars quarrelled over their drink. I kept the best of it.', after: () => 'Two scholars quarrelled over their drink. Nobody could say who was right.' },
  bigSale: { before: (qty: number, good: string, total: number) => `Sold ${qty} ${good} for ${total} septims. A good day.`, after: (qty: number, good: string, total: number) => `Sold ${qty} ${good} for ${total} septims. I did not ask what they were for.` },
  ruinedArrival: { before: (town: string) => `${town} looks poor.`, after: (town: string) => `Reached ${town}. What is left of it.` },
  walkOff: { before: () => 'My porters and sellswords left in the night when I could not pay them.', after: () => 'My porters and sellswords left in the night. I do not blame them.' },
  roughSleep: { before: () => 'Could not pay for a bed. I slept rough in the ash.', after: () => 'Could not pay for a bed. I slept rough in the ash, and the ash does not forgive.' },
} as const;

export type LogKey = keyof typeof LOG_VOICE;

/** Gavas Drelloth speaking on the Bank tab, chosen by how hard the Tong is pressing and how you have paid. */
export const DRELLOTH = {
  patient: 'Drelloth sends word: he has not forgotten your name.',
  paying: 'Drelloth calls you a careful man. From him that is not praise.',
  pressed: 'Drelloth is getting impatient. Pay something soon.',
  lateAgain: 'Drelloth reminds you that you borrowed more than once, and that he counts.',
  collectors: 'Debt collectors are looking for you on the roads.',
  killers: 'The Tong has sent killers after you. Pay now.',
  halved: 'Drelloth says you have paid down half of what you took. He says it as though it were a complaint.',
  cleared: 'Drelloth’s clerk crosses your name out. He does not look up.',
} as const;

/** The paragraph on the end screen about what you knew, and when. */
export const KNEW = {
  warned: (n: number) => `You were warned ${n} time${n === 1 ? '' : 's'}.`,
  nobody: 'Nobody warned you. Nobody could.',
  lost: (n: number) => `You left ${n} septims in the Vivec and Ebonheart vaults anyway.`,
  kept: 'You kept nothing in Vvardenfell when the moon fell.',
  cargo: (n: number) => ` The ash took ${n} septims of cargo with it.`,
} as const;

/** What a closed market says when no town-specific line exists. */
export const CLOSED = {
  holiday: (town: string, date: string, name: string) => `${town}, ${date}. The stalls are shuttered for ${name}. Nothing is sold today.`,
  closed: (town: string, date: string) => `${town}, ${date}. Nobody trades here any more.`,
  ruined: (town: string, date: string) => `${town}, ${date}. The market is rubble. Nothing is sold here.`,
  camp: (town: string, date: string) => `${town}, ${date}. The market is a camp of the homeless. Nothing is sold here.`,
  sacked: (town: string, date: string) => `${town}, ${date}. The stalls were burned. Nothing is sold here.`,
  occupied: (town: string, date: string) => `${town}, ${date}. Soldiers hold the square. Nothing is sold here.`,
} as const;
