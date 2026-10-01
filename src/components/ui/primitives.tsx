import {
  cloneElement,
  isValidElement,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TableHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import Link, { type LinkProps } from "next/link";

type Variant = "primary" | "secondary" | "quiet" | "destructive";
type Size = "compact" | "default" | "large";

function classes(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

function actionClass(variant: Variant, size: Size, className?: string) {
  return classes("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  variant = "secondary",
  size = "default",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={actionClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || props["aria-busy"]}
    >
      {loading && <Spinner className="ui-button__spinner" label="Loading" />}
      <span>{children}</span>
    </button>
  );
}

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  "aria-label": string;
  children: ReactNode;
};

export function IconButton({ "aria-label": label, title, children, size = "compact", ...props }: IconButtonProps) {
  return (
    <Button
      {...props}
      size={size}
      className={classes("ui-icon-button", props.className)}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </Button>
  );
}

export type LinkButtonProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & Pick<LinkProps, "href"> & {
  variant?: Variant;
  size?: Size;
};

export function LinkButton({ variant = "secondary", size = "default", className, ...props }: LinkButtonProps) {
  return <Link {...props} className={classes(actionClass(variant, size), className)} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classes("ui-input", className)} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={classes("ui-textarea", className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={classes("ui-select", className)} />;
}

export function Checkbox({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type="checkbox" className={classes("ui-checkbox", className)} />;
}

export function Switch({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} type="checkbox" role="switch" className={classes("ui-switch", className)} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={classes("ui-label", className)} />;
}

export function HelperText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} className={classes("ui-helper-text", className)} />;
}

export function ErrorText({ className, role = "alert", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} role={role} className={classes("ui-error-text", className)} />;
}

export type FormFieldProps = {
  id: string;
  label: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function FormField({ id, label, helper, error, required = false, children, className }: FormFieldProps) {
  const messageId = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  let control = children;

  if (isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const existingDescription = typeof child.props["aria-describedby"] === "string" ? child.props["aria-describedby"] : "";
    control = cloneElement(child, {
      id: typeof child.props.id === "string" ? child.props.id : id,
      required: required || child.props.required,
      "aria-describedby": [existingDescription, messageId].filter(Boolean).join(" ") || undefined,
      "aria-invalid": error ? true : child.props["aria-invalid"],
    });
  }

  return (
    <div className={classes("ui-form-field", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="ui-required" aria-hidden="true">*</span>}
      </Label>
      {control}
      {error ? <ErrorText id={`${id}-error`}>{error}</ErrorText> : helper ? <HelperText id={`${id}-helper`}>{helper}</HelperText> : null}
    </div>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={classes("ui-card", className)} />;
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={classes("ui-badge", className)} />;
}

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "success" | "warning" | "error";
  title?: ReactNode;
  live?: "polite" | "assertive" | "off";
};

export function Alert({ tone = "info", title, live, className, children, ...props }: AlertProps) {
  const isError = tone === "error";
  return (
    <div
      {...props}
      className={classes("ui-alert", `ui-alert--${tone}`, className)}
      role={props.role ?? (isError ? "alert" : "status")}
      aria-live={live ?? (isError ? "assertive" : "polite")}
    >
      {title && <strong className="ui-alert__title">{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={classes("ui-empty-state", className)}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return <span className={classes("ui-spinner", className)} role="status" aria-label={label} />;
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} aria-hidden="true" className={classes("ui-skeleton", className)} />;
}

export function TableScroll({ label, className, children, ...props }: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return (
    <div {...props} className={classes("table-scroll", className)} role="region" aria-label={label} tabIndex={props.tabIndex ?? 0}>
      {children}
    </div>
  );
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={classes("ui-table", className)} />;
}

export function PageHeader({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <header {...props} className={classes("ui-page-header", className)} />;
}

export function Section({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={classes("ui-section", className)} />;
}

export function SectionHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes("ui-section-header", className)} />;
}

export function Stack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes("ui-stack", className)} />;
}

export function Grid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classes("ui-grid", className)} />;
}

export type PaginationProps = {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
};

export function Pagination({ page, pages, onPageChange, pageSize, pageSizeOptions, onPageSizeChange, className }: PaginationProps) {
  return (
    <nav className={classes("pager", "ui-pagination", className)} aria-label="Table pagination">
      {pageSize !== undefined && onPageSizeChange && (
        <label className="ui-pagination__size">
          Rows per page
          <Select aria-label="Rows per page" value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>
            {(pageSizeOptions ?? [25, 50, 100]).map(size => <option key={size} value={size}>{size}</option>)}
          </Select>
        </label>
      )}
      <div className="ui-pagination__controls">
        <span aria-live="polite">Page {page} of {pages}</span>
        <Button size="compact" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">Previous</Button>
        <Button size="compact" onClick={() => onPageChange(page + 1)} disabled={page >= pages} aria-label="Next page">Next</Button>
      </div>
    </nav>
  );
}
