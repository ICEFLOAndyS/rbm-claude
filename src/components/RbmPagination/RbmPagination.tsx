import { useId } from 'react';
import { Box, IconButton, MenuItem, Select, Tooltip } from '@mui/material';
import { colour } from '../../theme/tokens';
import { useDensity } from '../../theme/RbmDensity';

/**
 * Pagination for a list page, as drawn on the Page templates board ("1 · List of records", zone 4):
 * the range on the left ("1 to 25 of 128"), "Rows per page" with the page size and the previous and
 * next chevrons on the right. Server-side, with a page size; no infinite scroll (board rule).
 * It sits inside the grid's card (RbmDataGrid's footer). Sizes come from the region's density (D2).
 *
 * Not drawn: the page size picker is MUI's default select (the agreed fallback).
 */

export interface RbmPaginationProps {
  /** Zero-based, as the server returns it. */
  page: number;
  pageSize: number;
  /** Rows matching the search and filters, across every page. */
  total: number;
  pageSizes: readonly number[];
  onPageChange: (page: number) => void;
  /** The page goes back to the first page when the size changes. */
  onPageSizeChange: (pageSize: number) => void;
  /** While the next page is loading, the arrows wait. */
  disabled?: boolean;
}

const number = (n: number) => n.toLocaleString('en-GB');

/** "1 to 25 of 128"; "0 of 0" when nothing matches. */
export function rangeText(page: number, pageSize: number, total: number) {
  if (total === 0) return '0 of 0';
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return `${number(from)} to ${number(to)} of ${number(total)}`;
}

function Chevron({ left, size }: { left?: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d={left ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

export function RbmPagination({ page, pageSize, total, pageSizes, onPageChange, onPageSizeChange, disabled = false }: RbmPaginationProps) {
  const d = useDensity();
  const sizeLabel = useId();
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const atStart = page <= 0;
  const atEnd = page >= lastPage;
  // As drawn: an arrow that can be used is Deep Blue; one that cannot is Slate.
  const arrow = (off: boolean) => ({ width: d.target, height: d.target, color: off ? colour.slate : colour.deepBlue });

  return (
    <Box component="nav" aria-label="Pages" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: `${d.gap}px`, height: d.row, px: `${d.padX}px`, fontSize: d.caption, color: 'text.secondary', boxSizing: 'border-box' }}>
      <Box component="span" aria-live="polite" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {rangeText(page, pageSize, total)}
      </Box>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: `${d.gap}px` }}>
        <Box component="span" id={sizeLabel} sx={{ whiteSpace: 'nowrap' }}>
          Rows per page
        </Box>
        <Select
          variant="standard"
          disableUnderline
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          labelId={sizeLabel}
          sx={{ minHeight: 0, fontSize: d.caption, color: 'text.secondary', '& .MuiSelect-select': { py: 0, fontVariantNumeric: 'tabular-nums' } }}
        >
          {pageSizes.map((n) => (
            <MenuItem key={n} value={n}>
              {n}
            </MenuItem>
          ))}
        </Select>
        <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
          <Tooltip title="Previous page">
            <span style={{ display: 'inline-flex' }}>
              <IconButton aria-label="Previous page" disabled={atStart || disabled} onClick={() => onPageChange(page - 1)} sx={{ ...arrow(atStart), '&.Mui-disabled': { color: colour.slate } }}>
                <Chevron left size={d.icon} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Next page">
            <span style={{ display: 'inline-flex' }}>
              <IconButton aria-label="Next page" disabled={atEnd || disabled} onClick={() => onPageChange(page + 1)} sx={{ ...arrow(atEnd), '&.Mui-disabled': { color: colour.slate } }}>
                <Chevron size={d.icon} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
