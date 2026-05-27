"use client";

import * as React from "react";
import { Card } from "@heroui/react";
import { cn } from "@/lib/utils";

const TABLE_SURFACE =
  "overflow-hidden rounded-xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] text-[var(--apple-text)]";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  embedded?: boolean;
};

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, embedded = false, ...props }, reference) => {
    const tableElement = (
      <table
        ref={reference}
        className={cn(
          "w-full caption-bottom text-sm",
          embedded && "table-fixed",
          className,
        )}
        {...props}
      />
    );

    if (embedded) {
      return (
        <div className="relative w-full overflow-x-auto">{tableElement}</div>
      );
    }

    return (
      <Card className={cn(TABLE_SURFACE, "p-0 shadow-none")}>
        <div className="relative w-full overflow-auto">{tableElement}</div>
      </Card>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, reference) => (
  <thead
    ref={reference}
    className={cn("border-b border-[var(--apple-separator)] [&_tr]:border-b", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, reference) => (
  <tbody
    ref={reference}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, reference) => (
  <tfoot
    ref={reference}
    className={cn(
      "border-t border-[var(--apple-separator)] bg-[var(--apple-fill-tertiary)] font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, reference) => (
  <tr
    ref={reference}
    className={cn(
      "border-b border-[var(--apple-separator)] transition-colors hover:bg-[var(--apple-fill-tertiary)] data-[state=selected]:bg-[var(--apple-fill-tertiary)]",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, reference) => (
  <th
    ref={reference}
    className={cn(
      "h-12 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-[var(--apple-text-secondary)] [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, reference) => (
  <td
    ref={reference}
    className={cn(
      "p-4 align-middle text-[var(--apple-text)] [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, reference) => (
  <caption
    ref={reference}
    className={cn("mt-4 text-sm text-[var(--apple-text-secondary)]", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
