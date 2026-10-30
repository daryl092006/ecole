'use client';
import { Children, cloneElement, isValidElement, useState, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react';

/** Default number of body rows shown per page in every list. */
export const DEFAULT_TABLE_PAGE_SIZE = 10;

interface Props extends ComponentPropsWithoutRef<'table'> {
  mobileLayout?: 'records' | 'scroll';
  /** Rows per page. Use 0 when the caller already paginates (server pages, custom offsets). */
  pageSize?: number;
}
interface CellProps extends ComponentPropsWithoutRef<'td'> {
  'data-label'?: string;
}

function textContent(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? textContent(child.props.children) : '';
  }).join(' ').trim();
}

function isTag<P>(node: ReactNode, tag: string): node is ReactElement<P> {
  return isValidElement<P>(node) && node.type === tag;
}

export default function ResponsiveTable({ children, className = '', mobileLayout = 'records', pageSize = DEFAULT_TABLE_PAGE_SIZE, ...props }: Props) {
  const rawSections = Children.toArray(children);
  const body = rawSections.find(section => isTag<ComponentPropsWithoutRef<'tbody'>>(section, 'tbody'));
  const bodyRows = body ? Children.toArray(body.props.children) : [];
  const paginated = pageSize > 0 && bodyRows.length > pageSize;
  const pageCount = paginated ? Math.ceil(bodyRows.length / pageSize) : 1;
  // A new row set (filter, search, refresh with other records) restarts on the first page.
  const signature = bodyRows.map(row => isValidElement(row) ? String(row.key) : '').join('|');
  const [pagination, setPagination] = useState({ page: 0, signature });
  if (pagination.signature !== signature) setPagination({ page: 0, signature });
  const page = pagination.signature === signature ? Math.min(pagination.page, pageCount - 1) : 0;
  const start = page * pageSize;
  const sections = !paginated ? rawSections : rawSections.map(section => section === body
    ? cloneElement(body, undefined, bodyRows.slice(start, start + pageSize))
    : section);

  const head = sections.find(section => isTag<ComponentPropsWithoutRef<'thead'>>(section, 'thead'));
  const headerRows = head ? Children.toArray(head.props.children) : [];
  const row = headerRows.length === 1 && isTag<ComponentPropsWithoutRef<'tr'>>(headerRows[0], 'tr') ? headerRows[0] : null;
  const headers = row ? Children.toArray(row.props.children).filter(cell => isTag<ComponentPropsWithoutRef<'th'>>(cell, 'th')) : [];
  const labels = headers.map(header => textContent(header.props.children));
  const canAdapt = mobileLayout === 'records' && labels.length > 0 && labels.every(Boolean)
    && headers.every(header => (header.props.colSpan ?? 1) === 1 && (header.props.rowSpan ?? 1) === 1);

  function decorateRow(child: ReactNode): ReactNode {
    if (!isTag<ComponentPropsWithoutRef<'tr'>>(child, 'tr')) return child;
    const cells = Children.toArray(child.props.children);
    const regular = cells.length === labels.length && cells.every(cell => isTag<CellProps>(cell, 'td')
      && (cell.props.colSpan ?? 1) === 1 && (cell.props.rowSpan ?? 1) === 1);
    return cloneElement(child, { role: 'row', className: `${child.props.className ?? ''} ${regular ? 'mobile-record-row' : 'mobile-summary-row'}`.trim() },
      cells.map((cell, index) => isTag<CellProps>(cell, 'td') ? cloneElement(cell, {
        role: 'cell', 'data-label': regular ? labels[index] : undefined,
      }) : cell));
  }

  const content = !canAdapt ? sections : sections.map(section => {
    if (isTag<ComponentPropsWithoutRef<'thead'>>(section, 'thead')) {
      return cloneElement(section, { role: 'rowgroup' }, cloneElement(row!, { role: 'row' },
        headers.map(header => cloneElement(header, { scope: 'col', role: 'columnheader' }))));
    }
    if (isTag<ComponentPropsWithoutRef<'tbody'>>(section, 'tbody')) {
      return cloneElement(section, { role: 'rowgroup' }, Children.toArray(section.props.children).map(decorateRow));
    }
    return section;
  });

  const goTo = (next: number) => setPagination({ page: Math.max(0, Math.min(pageCount - 1, next)), signature });
  const table = <table {...props} role="table" className={`${className} ${canAdapt ? 'mobile-record-table' : ''}`.trim()}
    data-mobile-layout={canAdapt ? 'records' : 'scroll'}>{content}</table>;
  if (!paginated) return table;
  return <>
    {table}
    <nav className="browser-pagination table-pagination" aria-label="Pagination de la liste">
      <span aria-live="polite">{start + 1}–{Math.min(start + pageSize, bodyRows.length)} sur {bodyRows.length} · page {page + 1} / {pageCount}</span>
      <div className="btn-group">
        <button type="button" className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => goTo(0)} aria-label="Première page">«</button>
        <button type="button" className="btn btn-sm btn-outline" disabled={page === 0} onClick={() => goTo(page - 1)}>Précédent</button>
        <button type="button" className="btn btn-sm btn-outline" disabled={page >= pageCount - 1} onClick={() => goTo(page + 1)}>Suivant</button>
        <button type="button" className="btn btn-sm btn-outline" disabled={page >= pageCount - 1} onClick={() => goTo(pageCount - 1)} aria-label="Dernière page">»</button>
      </div>
    </nav>
  </>;
}
