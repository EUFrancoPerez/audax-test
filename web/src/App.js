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
import { TextField, Typography, Paper, Container } from '@mui/material';

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
      breakdown {
        type
        value
        percentage
      }
    }
  }
`;

function BreakdownChart({ data }) {
  // Extract unique generation types
  const types = [
    ...new Set(data.flatMap((item) => item.breakdown.map((b) => b.type))),
  ];

  const chartData = data.map((item) => ({
    timestamp: new Date(item.timestamp).toLocaleDateString(),
    ...item.breakdown.reduce((acc, b) => {
      acc[b.type] = b.value;
      return acc;
    }, {}),
  }));

  return (
    <div className='breakdown-chart'>
      <h2>Breakdown by Generation Type</h2>
      <LineChart width={800} height={400} data={chartData}>
        <CartesianGrid strokeDasharray='3 3' />
        <XAxis dataKey='timestamp' />
        <YAxis />
        <Tooltip />
        <Legend />
        {types.map((type) => (
          <Line
            key={type}
            type='monotone'
            dataKey={type}
            stroke={`#${Math.floor(Math.random() * 16777215).toString(16)}`}
            name={type}
          />
        ))}
      </LineChart>
    </div>
  );
}

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

  if (loading) return <Typography>Loading...</Typography>;
  if (error)
    return <Typography color='error'>Error: {error.message}</Typography>;

  const chartData = data.electricalBalance.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp).toLocaleDateString(),
  }));

  // Calculate average demand
  const totalDemand = chartData.reduce((sum, item) => sum + item.demand, 0);
  const averageDemand = totalDemand / chartData.length;

  return (
    <Container>
      <Paper elevation={3} style={{ padding: 20, margin: 20 }}>
        <Typography variant='h4' gutterBottom>
          REE Balance Monitor
        </Typography>
        <div className='date-range'>
          <TextField
            label='Start Date'
            type='date'
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, startDate: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
            style={{ marginRight: 10 }}
          />
          <TextField
            label='End Date'
            type='date'
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange({ ...dateRange, endDate: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
          />
        </div>
        <div className='average-demand'>
          <Typography variant='h6'>
            Average Demand: {averageDemand.toFixed(2)}
          </Typography>
          <Typography variant='body2'>
            Calculated as the sum of all demand values divided by the number of
            days in the selected date range.
          </Typography>
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
          <Line
            type='monotone'
            dataKey='demand'
            stroke='#82ca9d'
            name='Demand'
          />
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
        <BreakdownChart data={data.electricalBalance} />
      </Paper>
    </Container>
  );
}

function App() {
  return (
    <ApolloProvider client={client}>
      <BalanceChart />
    </ApolloProvider>
  );
}

export default App;
