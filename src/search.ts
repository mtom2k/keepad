import type { Pad, MacroButton } from '../shared/model';
export type SearchResult = { pad: Pad; button: MacroButton };
const normalize = (value: string) =>
  value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** All terms must occur in the name or description; destinations are never indexed. */
export function searchButtons(pads: Pad[], query: string): SearchResult[] {
  const phrase = normalize(query).replace(/\s+/g, ' ');
  if (!phrase) return [];
  const terms = phrase.split(' ');
  return pads
    .flatMap((pad) =>
      [...pad.buttons]
        .sort((a, b) => a.slot - b.slot)
        .map((button) => {
          const name = normalize(button.label),
            description = normalize(button.description);
          const matches = terms.every((term) => name.includes(term) || description.includes(term));
          const rank =
            name === phrase
              ? 0
              : name.startsWith(phrase)
                ? 1
                : terms.every((term) => name.includes(term))
                  ? 2
                  : 3;
          return { pad, button, matches, rank };
        }),
    )
    .filter((result) => result.matches)
    .sort((a, b) => a.rank - b.rank)
    .map(({ pad, button }) => ({ pad, button }));
}
