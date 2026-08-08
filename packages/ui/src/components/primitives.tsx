/**
 * Core primitives — 04 §9 component library, §10 buttons and controls.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react';

// --------------------------------------------------------------- Button

export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'danger' | 'quiet';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  /**
   * 04 §10: "Disable actions only when the reason is visible nearby."
   * Supplying a reason renders it beside the control and wires it to the button
   * with aria-describedby, so a screen-reader user hears why it is unavailable.
   */
  disabledReason?: string | null;
}

export function Button({
  variant = 'neutral',
  size = 'md',
  disabledReason,
  disabled,
  children,
  ...rest
}: ButtonProps): React.JSX.Element {
  const reasonId = useId();
  const isDisabled = disabled ?? Boolean(disabledReason);

  const button = (
    <button
      type="button"
      {...rest}
      disabled={isDisabled}
      aria-describedby={disabledReason ? reasonId : rest['aria-describedby']}
      className={`btn btn--${variant}${size === 'sm' ? ' btn--sm' : ''}${rest.className ? ` ${rest.className}` : ''}`}
    >
      {children}
    </button>
  );

  if (!disabledReason) return button;

  return (
    <span className="btn-with-reason">
      {button}
      <span id={reasonId} className="btn-reason">
        {disabledReason}
      </span>
    </span>
  );
}

// ----------------------------------------------------------------- Card

export function Card({
  title,
  hint,
  selected,
  actions,
  children,
  as: Tag = 'section',
}: {
  title?: ReactNode;
  hint?: ReactNode;
  selected?: boolean;
  actions?: ReactNode;
  children?: ReactNode;
  as?: 'section' | 'article' | 'div';
}): React.JSX.Element {
  return (
    <Tag className={`card${selected ? ' card--selected' : ''}`}>
      {(title || actions) && (
        <header className="row row--between" style={{ marginBottom: 'var(--space-3)' }}>
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {hint && <p className="card__hint">{hint}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </Tag>
  );
}

// ----------------------------------------------------------- Empty state

/**
 * 05 §18: "Every route has populated demo fixtures... Skeletons preserve the
 * final structure rather than displaying a blank white panel." An empty state
 * always explains how the list gets filled and offers the action that does it.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}): React.JSX.Element {
  return (
    <div className="empty">
      <h2 className="empty__title">{title}</h2>
      <p className="empty__body">{body}</p>
      {action}
    </div>
  );
}

// --------------------------------------------------------------- Banner

export function Banner({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'review' | 'danger';
  title?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <div className={`banner banner--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <div>
        {title && <strong>{title} </strong>}
        {children}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Dialog

/**
 * 04 §15 / 15 §19: "Dialogs trap focus and return it to the invoking control."
 * Built on the native <dialog> element so focus trapping, Escape handling and
 * the top layer come from the platform rather than a hand-rolled loop.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}): React.JSX.Element | null {
  const ref = useRef<HTMLDialogElement>(null);
  const invoker = useRef<Element | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) {
      invoker.current = document.activeElement;
      node.showModal();
    } else if (!open && node.open) {
      node.close();
      // Return focus to whatever opened the dialog.
      (invoker.current as HTMLElement | null)?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <h2 className="dialog__title">{title}</h2>
      {children}
      {actions && <div className="dialog__actions">{actions}</div>}
    </dialog>
  );
}

// ------------------------------------------------------- Live announcer

/**
 * 05 §1 / 09 §18: a global announcement region that reports completed uploads,
 * processing and saves, and the overall verification result.
 *
 * 09 §18 also warns against over-announcing, so this is polite and only receives
 * deliberate messages — never per-keystroke or per-tick updates.
 */
export function LiveRegion({ message }: { message: string | null }): React.JSX.Element {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message ?? ''}
    </div>
  );
}
