import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from '@mui/material';
import { RbmPagination, type RbmPaginationProps } from './RbmPagination';
import { RbmDensity } from '../../theme/RbmDensity';
import { colour, radius } from '../../theme/tokens';
import { PAGE_SIZES } from '../../data/list/types';

/** Holds the page and size, so the arrows and the size picker can be clicked through. */
function Stateful(props: Partial<RbmPaginationProps>) {
  const [page, setPage] = useState(props.page ?? 0);
  const [pageSize, setPageSize] = useState(props.pageSize ?? 25);
  return (
    <RbmPagination
      total={128}
      pageSizes={PAGE_SIZES}
      {...props}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={(n) => {
        setPageSize(n);
        setPage(0);
      }}
    />
  );
}

const meta: Meta<typeof Stateful> = {
  title: 'List/RbmPagination',
  component: Stateful,
  parameters: { layout: 'padded' },
  // A list page is a D2 Compact region; the pagination sits at the bottom of the grid's card.
  decorators: [
    (Story) => (
      <RbmDensity level="compact">
        <Box sx={{ maxWidth: 1100, border: `1px solid ${colour.rule}`, borderRadius: `${radius.card}px`, overflow: 'hidden', bgcolor: colour.white }}>{Story()}</Box>
      </RbmDensity>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Stateful>;

/** The first page of 128 events: Previous is Slate, Next is Deep Blue. */
export const FirstPage: Story = {};

export const MiddlePage: Story = { args: { page: 2 } };

/** The last page: "126 to 128 of 128", Next is Slate. */
export const LastPage: Story = { args: { page: 5 } };

/** Everything fits on one page: both arrows are Slate. */
export const OnePage: Story = { args: { total: 8 } };

export const Empty: Story = { args: { total: 0 } };

/** A large list: the range uses thousands separators. */
export const LargeList: Story = { args: { total: 15000, page: 41 } };

/** While the next page loads, both arrows wait. */
export const Loading: Story = { args: { page: 2, disabled: true } };
