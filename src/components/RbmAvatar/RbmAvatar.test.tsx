import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import type { ReactElement } from 'react';
import { RbmAvatar, initialsOf } from './RbmAvatar';
import { rbmTheme } from '../../theme/theme';
import { colour } from '../../theme/tokens';

const renderAvatar = (ui: ReactElement) => render(<ThemeProvider theme={rbmTheme}>{ui}</ThemeProvider>);

describe('initialsOf', () => {
  it.each([
    ['Mary O’Neill', 'MO'],
    ['Tom Baker', 'TB'],
    ['Kai', 'K'],
    ['  karen  de  witt ', 'KW'],
    ['', ''],
  ])('%s gives %s', (name, initials) => {
    expect(initialsOf(name)).toBe(initials);
  });
});

describe('RbmAvatar', () => {
  it('is named by the full name, not the initials', () => {
    renderAvatar(<RbmAvatar name="Tom Baker" />);
    expect(screen.getByRole('img', { name: 'Tom Baker' })).toBeInTheDocument();
    expect(screen.getByText('TB')).toHaveAttribute('aria-hidden', 'true');
  });

  it('takes initials that override the name', () => {
    renderAvatar(<RbmAvatar name="Karen de Witt" initials="KdW" />);
    expect(screen.getByText('KdW')).toBeInTheDocument();
  });

  it('is a 28 px Blue Light circle with Deep Blue initials by default', () => {
    renderAvatar(<RbmAvatar name="Tom Baker" />);
    expect(screen.getByRole('img')).toHaveStyle({ width: '28px', height: '28px', fontSize: '10px', backgroundColor: colour.blueLight, color: colour.deepBlue });
  });

  it.each([
    [20, '7px'],
    [32, '12px'],
    [36, '13px'],
    [40, '15px'],
  ] as const)('at %i px uses %s initials', (size, fontSize) => {
    renderAvatar(<RbmAvatar name="Tom Baker" size={size} />);
    expect(screen.getByRole('img')).toHaveStyle({ width: `${size}px`, fontSize });
  });

  it('is hidden from screen readers when decorative, beside the name in text', () => {
    const { container } = renderAvatar(<RbmAvatar name="Tom Baker" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
