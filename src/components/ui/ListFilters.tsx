import type { ReactNode } from 'react';

/** Keep small, unfiltered lists immediately readable; never hide an active filter. */
export default function ListFilters({ count, active = false, children }: {
  count: number; active?: boolean; children: ReactNode;
}) {
  return count > 1 || active ? <div className="list-filters">{children}</div> : null;
}
