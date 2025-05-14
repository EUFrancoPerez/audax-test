import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import App from './App';

const mocks = [
  {
    request: {
      query: gql`
        query GetBalanceData($startDate: String!, $endDate: String!) {
          electricalBalance(startDate: $startDate, endDate: $endDate) {
            timestamp
            generation
            demand
            imports
            exports
          }
        }
      `,
      variables: {
        startDate: expect.any(String),
        endDate: expect.any(String),
      },
    },
    result: {
      data: {
        electricalBalance: [
          {
            timestamp: '2023-01-01T00:00:00.000Z',
            generation: 100,
            demand: 90,
            imports: 5,
            exports: 15,
          },
        ],
      },
    },
  },
];

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    );
    expect(screen.getByText('REE Balance Monitor')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('allows date range selection', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <App />
      </MockedProvider>
    );

    const dateInputs = screen.getAllByRole('textbox');
    expect(dateInputs).toHaveLength(2);

    fireEvent.change(dateInputs[0], { target: { value: '2023-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2023-01-02' } });

    expect(dateInputs[0].value).toBe('2023-01-01');
    expect(dateInputs[1].value).toBe('2023-01-02');
  });
});
