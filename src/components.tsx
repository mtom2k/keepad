import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from '@floating-ui/react';
import {
  Globe,
  Folder,
  File,
  AppWindow,
  Copy,
  Mail,
  Music,
  Code2,
  CalendarDays,
  Camera,
  Pencil,
  Coffee,
  BookOpen,
  Terminal,
  Heart,
  Video,
  Download,
  MessageSquare,
  Grid2X2,
  Search,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { actionNames, type MacroButton, type Pad } from '../shared/model';
import { placeButton } from './pad-layout';
export const iconMap = {
  globe: Globe,
  folder: Folder,
  file: File,
  app: AppWindow,
  copy: Copy,
  mail: Mail,
  music: Music,
  code: Code2,
  calendar: CalendarDays,
  camera: Camera,
  pen: Pencil,
  coffee: Coffee,
  book: BookOpen,
  terminal: Terminal,
  heart: Heart,
  video: Video,
  download: Download,
  message: MessageSquare,
  grid: Grid2X2,
  search: Search,
};
export function Glyph({
  name,
  size = 20,
  ...props
}: {
  name: keyof typeof iconMap | 'none';
  size?: number;
  className?: string;
}) {
  if (name === 'none') return null;
  const Component = iconMap[name] || Grid2X2;
  return <Component size={size} strokeWidth={1.7} {...props} />;
}
export function Logo() {
  return (
    <span className="logo">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
export function Tip({
  text,
  children,
  disabled = false,
}: {
  text: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(9), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { enabled: !disabled, delay: { open: 450, close: 0 } }),
    focus = useFocus(context, { enabled: !disabled }),
    dismiss = useDismiss(context),
    role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);
  return (
    <>
      <span className="tip-anchor" ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </span>
      {open && !disabled && (
        <FloatingPortal root={refs.domReference.current?.closest('dialog') ?? undefined}>
          <div
            className="tooltip"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {text}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>,
    document.body,
  );
}
export function MacroKey({
  button,
  slot,
  editing,
  onClick,
  selected = false,
  dragProps,
  dragging = false,
  dropTarget = false,
  draggingAny = false,
  onContextMenu,
}: {
  button?: MacroButton;
  slot: number;
  editing: boolean;
  onClick: () => void;
  selected?: boolean;
  dragProps?: Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'draggable' | 'onDragStart' | 'onDragEnd' | 'onDragOver' | 'onDragLeave' | 'onDrop'
  >;
  dragging?: boolean;
  dropTarget?: boolean;
  draggingAny?: boolean;
  onContextMenu?: ButtonHTMLAttributes<HTMLButtonElement>['onContextMenu'];
}) {
  return (
    <Tip
      disabled={draggingAny}
      text={
        button
          ? editing
            ? `${actionNames[button.type]} · Click to edit ${button.label}${dragProps ? ' · Drag to move; drop on a button to swap' : ''}`
            : button.description || `${actionNames[button.type]}: ${button.target}`
          : editing
            ? 'Add an action, or drop a file here'
            : 'An empty button. Add an action in the editor.'
      }
    >
      <button
        {...dragProps}
        className={`macro-key ${button ? '' : 'empty'} ${selected ? 'selected' : ''} ${dragging ? 'dragging' : ''} ${dropTarget ? 'drop-target' : ''}`}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onKeyDown={(event) => {
          if (
            onContextMenu &&
            (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
          ) {
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            event.currentTarget.dispatchEvent(
              new MouseEvent('contextmenu', {
                bubbles: true,
                clientX: bounds.left + 12,
                clientY: bounds.top + 12,
              }),
            );
          }
        }}
        disabled={!button && !editing}
        aria-label={
          button ? `${editing ? 'Edit' : 'Run'} ${button.label}` : `Add button ${slot + 1}`
        }
      >
        {button ? (
          <>
            <span className={`key-icon tone-${button.color}`}>
              {button.image ? (
                <img src={button.image} alt="" draggable={false} />
              ) : (
                <Glyph name={button.icon} size={26} />
              )}
            </span>
            <span className="key-label">{button.label}</span>
          </>
        ) : (
          <>
            <Plus size={20} strokeWidth={1.3} />
          </>
        )}
      </button>
    </Tip>
  );
}
export function ButtonMenu({
  x,
  y,
  trigger,
  items,
  onClose,
}: {
  x: number;
  y: number;
  trigger: HTMLElement;
  items: { label: string; disabled?: boolean; danger?: boolean; onSelect: () => void }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const menu = ref.current!;
    setPosition({
      left: Math.max(8, Math.min(x, innerWidth - menu.offsetWidth - 8)),
      top: Math.max(8, Math.min(y, innerHeight - menu.offsetHeight - 8)),
    });
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [x, y]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);
  return createPortal(
    <div
      ref={ref}
      className="button-context-menu"
      role="menu"
      aria-label="Button actions"
      style={position}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          trigger.focus();
          return;
        }
        const buttons = Array.from(
          ref.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
        );
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        let next = current;
        if (event.key === 'ArrowDown') next = (current + 1) % buttons.length;
        else if (event.key === 'ArrowUp') next = (current + buttons.length - 1) % buttons.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = buttons.length - 1;
        else return;
        event.preventDefault();
        buttons[next]?.focus();
      }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          disabled={item.disabled}
          className={item.danger ? 'danger-text' : ''}
          onClick={() => {
            onClose();
            trigger.focus();
            item.onSelect();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
export function PositionPicker({
  pad,
  button,
  origin,
  disabled,
  onChange,
}: {
  pad: Pad;
  button: MacroButton;
  origin: number;
  disabled: boolean;
  onChange: (slot: number) => void;
}) {
  const preview = placeButton(pad, button, origin);
  return (
    <div
      className="position-picker"
      role="group"
      aria-label="Position"
      style={{ '--pad-columns': pad.columns } as React.CSSProperties}
    >
      {Array.from({ length: pad.columns * pad.rows }, (_, slot) => {
        const occupant = pad.buttons.find((item) => item.slot === slot && item.id !== button.id);
        const displayed = preview.buttons.find((item) => item.slot === slot);
        const selected = button.slot === slot;
        const hint = `Row ${Math.floor(slot / pad.columns) + 1}, column ${(slot % pad.columns) + 1}${occupant ? ` · Swap with ${occupant.label}` : ''}`;
        return (
          <Tip key={slot} text={hint}>
            <button
              type="button"
              className={`position-cell ${selected ? 'selected' : ''}`}
              aria-label={`Position ${slot + 1}${occupant ? `: ${occupant.label}` : ''}`}
              aria-pressed={selected}
              disabled={disabled}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(slot)}
              onKeyDown={(event) => {
                let next = slot;
                if (event.key === 'ArrowLeft' && slot % pad.columns > 0) next--;
                else if (event.key === 'ArrowRight' && slot % pad.columns < pad.columns - 1) next++;
                else if (event.key === 'ArrowUp') next = Math.max(0, slot - pad.columns);
                else if (event.key === 'ArrowDown')
                  next = Math.min(pad.columns * pad.rows - 1, slot + pad.columns);
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = pad.columns * pad.rows - 1;
                else return;
                event.preventDefault();
                onChange(next);
                event.currentTarget
                  .closest('.position-picker')
                  ?.querySelectorAll<HTMLButtonElement>('button')
                  [next]?.focus();
              }}
            >
              <span className="position-number">{slot + 1}</span>
              {displayed ? (
                displayed.image ? (
                  <img src={displayed.image} alt="" draggable={false} />
                ) : (
                  <Glyph name={displayed.icon} size={18} />
                )
              ) : (
                <Plus size={14} />
              )}
            </button>
          </Tip>
        );
      })}
    </div>
  );
}
const shortcutKeys: Record<string, [mac: string, other: string]> = {
  CommandOrControl: ['⌘', 'Ctrl'],
  Super: ['⌘', 'Win'],
  Control: ['⌃', 'Ctrl'],
  Shift: ['⇧', 'Shift'],
  Alt: ['⌥', 'Alt'],
};
export function Shortcut({ value, mac }: { value: string; mac: boolean }) {
  return (
    <span className="shortcut">
      {value.split('+').map((key, i) => (
        <kbd key={i}>{shortcutKeys[key]?.[mac ? 0 : 1] ?? key}</kbd>
      ))}
    </span>
  );
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  disabled,
  decreaseDisabledReason,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  decreaseDisabledReason?: string;
  onChange: (value: number) => void;
}) {
  const unit = label.toLowerCase();
  return (
    <div className="layout-control" role="group" aria-label={label}>
      <span className="stepper-label">{label}</span>
      <div className="number-stepper">
        <Tip
          text={
            value <= min ? `Minimum ${min} ${unit}` : decreaseDisabledReason || `Decrease ${unit}`
          }
        >
          <button
            type="button"
            aria-label={`Decrease ${unit}`}
            disabled={disabled || value <= min || Boolean(decreaseDisabledReason)}
            onClick={() => onChange(value - 1)}
          >
            <Minus size={15} />
          </button>
        </Tip>
        <output aria-label={`${label} count`} aria-live="polite">
          {value}
        </output>
        <Tip text={value >= max ? `Maximum ${max} ${unit}` : `Increase ${unit}`}>
          <button
            type="button"
            aria-label={`Increase ${unit}`}
            disabled={disabled || value >= max}
            onClick={() => onChange(value + 1)}
          >
            <Plus size={15} />
          </button>
        </Tip>
      </div>
    </div>
  );
}
