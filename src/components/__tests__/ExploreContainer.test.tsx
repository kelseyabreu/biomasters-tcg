import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ExploreContainer from '../ExploreContainer';

describe('ExploreContainer', () => {
  it('renders without crashing', () => {
    render(<ExploreContainer name="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('displays the provided name', () => {
    const testName = 'BioMasters TCG';
    render(<ExploreContainer name={testName} />);
    expect(screen.getByText(testName)).toBeInTheDocument();
  });
});
