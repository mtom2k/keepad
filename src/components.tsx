import { useEffect, useRef, useState, type ReactNode } from 'react';
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
import { actionNames, type MacroButton } from '../shared/model';
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
  name: keyof typeof iconMap;
  size?: number;
  className?: string;
}) {
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
export function Tip({ text, children }: { text: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'top',
    middleware: [offset(9), flip({ padding: 12 }), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });
  const hover = useHover(context, { delay: { open: 450, close: 0 } }),
    focus = useFocus(context),
    dismiss = useDismiss(context),
    role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);
  return (
    <>
      <span className="tip-anchor" ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </span>
      {open && (
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
}: {
  button?: MacroButton;
  slot: number;
  editing: boolean;
  onClick: () => void;
  selected?: boolean;
}) {
  return (
    <Tip
      text={
        button
          ? editing
            ? `${actionNames[button.type]} · Click to edit ${button.label}`
            : button.description || `${actionNames[button.type]}: ${button.target}`
          : editing
            ? 'Add an action to this button'
            : 'An empty button. Add an action in the editor.'
      }
    >
      <button
        className={`macro-key ${button ? '' : 'empty'} ${selected ? 'selected' : ''}`}
        onClick={onClick}
        disabled={!button && !editing}
        aria-label={
          button ? `${editing ? 'Edit' : 'Run'} ${button.label}` : `Add button ${slot + 1}`
        }
      >
        {button ? (
          <>
            <span className={`key-icon tone-${button.color}`}>
              {button.image ? (
                <img src={button.image} alt="" />
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
export function Shortcut({ value, mac }: { value: string; mac: boolean }) {
  return (
    <span className="shortcut">
      {value.split('+').map((key, i) => (
        <kbd key={i}>
          {key === 'CommandOrControl'
            ? mac
              ? '⌘'
              : 'Ctrl'
            : key === 'Shift'
              ? '⇧'
              : key === 'Alt'
                ? mac
                  ? '⌥'
                  : 'Alt'
                : key === 'Space'
                  ? 'Space'
                  : key}
        </kbd>
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
