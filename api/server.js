const express = require('express');
const { ruruHTML } = require('ruru/server');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');
const {
  graphql,
  buildSchema,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
  GraphQLNonNull,
} = require('graphql');
const { createHandler } = require('graphql-http/lib/use/express');

// MongoDB Schema
const balanceSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true },
  generation: { type: Number, required: true },
  demand: { type: Number, required: true },
  imports: { type: Number, required: true },
  exports: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Balance = mongoose.model('Balance', balanceSchema);

// GraphQL Types
const BalanceType = new GraphQLObjectType({
  name: 'Balance',
  fields: {
    timestamp: { type: GraphQLString },
    generation: { type: GraphQLFloat },
    demand: { type: GraphQLFloat },
    imports: { type: GraphQLFloat },
    exports: { type: GraphQLFloat },
  },
});

// GraphQL Schema
const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      electricalBalance: {
        type: new GraphQLList(BalanceType),
        args: {
          startDate: { type: new GraphQLNonNull(GraphQLString) },
          endDate: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_, { startDate, endDate }) => {
          try {
            const balances = await Balance.find({
              timestamp: {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
              },
            }).sort({ timestamp: 1 });
            return balances;
          } catch (error) {
            console.error('Error fetching balance data:', error);
            throw new Error('Failed to fetch balance data');
          }
        },
      },
    },
  }),
});

// REE API Client
const fetchREEData = async () => {
  try {
    const now = new Date();
    const endDate = now.toISOString();
    const startDate = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();

    const response = await axios.get(
      `https://apidatos.ree.es/es/datos/balance/balance-electrico?start_date=${startDate}&end_date=${endDate}&time_trunc=hour`
    );

    const data = response.data.included[0].attributes.values;

    for (const item of data) {
      await Balance.findOneAndUpdate(
        { timestamp: new Date(item.datetime) },
        {
          timestamp: new Date(item.datetime),
          generation: item.value,
          demand: item.value, // You might want to adjust this based on actual data structure
          imports: 0, // Adjust based on actual data
          exports: 0, // Adjust based on actual data
        },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error('Error fetching REE data:', error);
  }
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ree-balance')
  .then(() => {
    console.log('Connected to MongoDB');

    // Schedule data fetching every hour
    cron.schedule('0 * * * *', () => {
      console.log('Fetching REE data...');
      fetchREEData();
    });

    // Initial data fetch
    fetchREEData();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

const app = express();

app.all('/graphql', createHandler({ schema }));
app.get('/', (_req, res) => {
  res.type('html');
  res.end(ruruHTML({ endpoint: '/graphql' }));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`
API running on: http://localhost:${PORT}
GraphQL Playground: http://localhost:${PORT}/graphql
  `);
});
