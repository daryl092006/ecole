import { Children, cloneElement, isValidElement, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react';

interface Props extends ComponentPropsWithoutRef<'table'> {
  mobileLayout?: 'records' | 'scroll';
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

export default function ResponsiveTable({ children, className = '', mobileLayout = 'records', ...props }: Props) {
  const sections = Children.toArray(children);
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

  const content = !canAdapt ? children : sections.map(section => {
    if (isTag<ComponentPropsWithoutRef<'thead'>>(section, 'thead')) {
      return cloneElement(section, { role: 'rowgroup' }, cloneElement(row!, { role: 'row' },
        headers.map(header => cloneElement(header, { scope: 'col', role: 'columnheader' }))));
    }
    if (isTag<ComponentPropsWithoutRef<'tbody'>>(section, 'tbody')) {
      return cloneElement(section, { role: 'rowgroup' }, Children.toArray(section.props.children).map(decorateRow));
    }
    return section;
  });

  return <table {...props} role="table" className={`${className} ${canAdapt ? 'mobile-record-table' : ''}`.trim()}
    data-mobile-layout={canAdapt ? 'records' : 'scroll'}>{content}</table>;
}
