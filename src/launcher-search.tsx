import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type MouseEvent,
} from 'react';
import { Search, X } from 'lucide-react';
import { Glyph, Tip } from './components';
import { actionNames, type Pad, type MacroButton } from '../shared/model';
import { searchButtons } from './search';

export function LauncherSearch({
  pads,
  children,
  onRun,
  onMenu,
  menuOpen,
  invocation,
}: {
  pads: Pad[];
  menuOpen: boolean;
  invocation: number;
  children: ReactNode;
  onRun: (padId: string, button: MacroButton) => void;
  onMenu: (pad: Pad, button: MacroButton, event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const results = searchButtons(pads, query);
  const searching = query.trim().length > 0;
  const index = Math.min(selected, Math.max(0, results.length - 1));
  const clear = () => {
    setQuery('');
    setSelected(0);
    input.current?.focus();
  };
  useLayoutEffect(() => {
    // Parent dismisses pending modals in the same commit before search takes focus.
    setQuery('');
    setSelected(0);
    input.current?.focus({ preventScroll: true });
  }, [invocation]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index, query]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.isComposing &&
        query &&
        !document.querySelector('dialog[open], [role="menu"]')
      ) {
        event.preventDefault();
        event.stopPropagation();
        setQuery('');
        setSelected(0);
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [query]);
  return (
    <div className="launcher-search">
      <div className="launcher-search-field">
        <Search size={16} aria-hidden="true" />
        <input
          ref={input}
          id="launcher-search"
          role="combobox"
          aria-label="Search all buttons"
          aria-autocomplete="list"
          aria-expanded={searching}
          aria-controls={searching ? 'search-results' : undefined}
          aria-activedescendant={searching && results.length ? `search-result-${index}` : undefined}
          placeholder="Search all pads…"
          autoComplete="off"
          spellCheck={false}
          maxLength={200}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(0);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (
              searching &&
              results[index] &&
              (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
            ) {
              event.preventDefault();
              const option =
                list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[index];
              if (option) {
                const bounds = option.getBoundingClientRect();
                option.dispatchEvent(
                  new window.MouseEvent('contextmenu', {
                    bubbles: true,
                    clientX: bounds.left + 12,
                    clientY: bounds.top + 12,
                  }),
                );
              }
              return;
            }
            if (searching && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              event.preventDefault();
              setSelected(
                Math.max(
                  0,
                  Math.min(results.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                ),
              );
            } else if (searching && event.key === 'Enter') {
              event.preventDefault();
              if (!event.repeat && results[index])
                onRun(results[index].pad.id, results[index].button);
            }
          }}
        />
        {query && (
          <Tip text="Clear search">
            <button className="icon-button" aria-label="Clear search" onClick={clear}>
              <X size={15} />
            </button>
          </Tip>
        )}
      </div>
      {searching ? (
        <>
          <div className="search-count" role="status">
            {results.length
              ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
              : 'No matching buttons'}
          </div>
          <div
            ref={list}
            className="search-results"
            id="search-results"
            role="listbox"
            aria-label="Matching buttons"
          >
            {results.map(({ pad, button }, i) => (
              <Tip
                key={JSON.stringify([pad.id, button.id])}
                disabled={menuOpen}
                text={`${button.label} · ${pad.name}${button.description ? ` — ${button.description}` : ''}`}
              >
                <button
                  id={`search-result-${i}`}
                  role="option"
                  aria-selected={index === i}
                  tabIndex={-1}
                  aria-label={`Run ${button.label} — ${pad.name}`}
                  className="search-result"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSelected(i);
                    onRun(pad.id, button);
                  }}
                  onFocus={() => {
                    setSelected(i);
                    input.current?.focus();
                  }}
                  onContextMenu={(event) => onMenu(pad, button, event)}
                >
                  <span className={`key-icon tone-${button.color}`}>
                    {button.image ? (
                      <img src={button.image} alt="" draggable={false} />
                    ) : (
                      <Glyph name={button.icon} size={22} />
                    )}
                  </span>
                  <span className="search-result-copy">
                    <strong>{button.label}</strong>
                    <span>
                      {pad.name} · {actionNames[button.type]}
                    </span>
                    {button.description && <span>{button.description}</span>}
                  </span>
                </button>
              </Tip>
            ))}
          </div>
        </>
      ) : (
        <div className="launcher-pad">{children}</div>
      )}
    </div>
  );
}
