import { render, screen } from '@testing-library/react';
import { DataGridPro } from '@mui/x-data-grid-pro';
import { applyMuiXLicence } from './licence';

describe('MUI X licence set-up (decision D4)', () => {
  it('sets nothing when no key is configured', () => {
    expect(applyMuiXLicence(undefined)).toBe(false);
    expect(applyMuiXLicence('   ')).toBe(false);
  });

  it('still draws the Pro grid without a key: a watermark and a console error, but no failure', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <div style={{ height: 300, width: 600 }}>
        <DataGridPro columns={[{ field: 'name', headerName: 'Runbook' }]} rows={[{ id: 'RBK0000001', name: 'Q4 Data Centre Cutover' }]} />
      </div>,
    );
    expect(screen.getByRole('grid')).toBeInTheDocument();
    expect(screen.getByText('MUI X Missing license key')).toBeInTheDocument();
    error.mockRestore();
  });
});
