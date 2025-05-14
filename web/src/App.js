import React from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { gql, useQuery } from '@apollo/client';

const client = new ApolloClient({
  uri: process.env.REACT_APP_API_URL || 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
});

const GET_BALANCE_DATA = gql`
  query GetBalanceData($startDate: String!, $endDate: String!) {
    electricalBalance(startDate: $startDate, endDate: $endDate) {
      timestamp
      generation
      demand
      imports
      exports
    }
  }
`;

function BalanceChart() {
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { loading, error, data } = useQuery(GET_BALANCE_DATA, {
    variables: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    },
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  const chartData = data.electricalBalance.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp).toLocaleString(),
  }));

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type='date'
          value={dateRange.startDate}
          onChange={(e) =>
            setDateRange({ ...dateRange, startDate: e.target.value })
          }
        />
        <input
          type='date'
          value={dateRange.endDate}
          onChange={(e) =>
            setDateRange({ ...dateRange, endDate: e.target.value })
          }
        />
      </div>
      <LineChart width={800} height={400} data={chartData}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='timestamp' />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type='monotone'
          dataKey='generation'
          stroke='#8884d8'
          name='Generation'
        />
        <Line type='monotone' dataKey='demand' stroke='#82ca9d' name='Demand' />
        <Line
          type='monotone'
          dataKey='imports'
          stroke='#ffc658'
          name='Imports'
        />
        <Line
          type='monotone'
          dataKey='exports'
          stroke='#ff7300'
          name='Exports'
        />
      </LineChart>
    </div>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <div style={{ padding: '20px' }}>
        <h1>REE Balance Monitor</h1>
        <BalanceChart />
      </div>
    </ApolloProvider>
  );
}

export default App;
