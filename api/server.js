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
  breakdown: [
    {
      type: { type: String, required: true },
      value: { type: Number, required: true },
      percentage: { type: Number },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Balance = mongoose.model('Balance', balanceSchema);

// GraphQL Types
const BreakdownType = new GraphQLObjectType({
  name: 'Breakdown',
  fields: {
    type: { type: GraphQLString },
    value: { type: GraphQLFloat },
    percentage: { type: GraphQLFloat },
  },
});

const BalanceType = new GraphQLObjectType({
  name: 'Balance',
  fields: {
    timestamp: { type: GraphQLString },
    generation: { type: GraphQLFloat },
    demand: { type: GraphQLFloat },
    imports: { type: GraphQLFloat },
    exports: { type: GraphQLFloat },
    breakdown: { type: new GraphQLList(BreakdownType) },
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
            await fetchREEData(startDate, endDate);
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
const fetchREEData = async (startDate, endDate) => {
  try {
    const response = await axios.get(
      `https://apidatos.ree.es/es/datos/balance/balance-electrico?start_date=${startDate}&end_date=${endDate}&time_trunc=day`
    );

    // Prepare a map for each day
    const dayMap = {};

    // Helper to get or create a day entry
    function getDayEntry(dateStr) {
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          timestamp: new Date(dateStr),
          generation: 0,
          demand: 0,
          imports: 0,
          exports: 0,
          breakdown: [],
        };
      }
      return dayMap[dateStr];
    }

    // Parse included array
    const included = response.data.included;
    for (const category of included) {
      const attr = category.attributes;
      if (Array.isArray(attr.values)) {
        for (const v of attr.values) {
          const dateStr = v.datetime;
          // Breakdown for all generation types
          if (
            category.groupId === 'Renovable' ||
            category.groupId === 'No-Renovable'
          ) {
            // Only add breakdown for distinct types (not composite)
            if (!attr.composite) {
              getDayEntry(dateStr).breakdown.push({
                type: attr.title,
                value: v.value,
                percentage: v.percentage,
              });
            }
          }
          // Demand
          if (category.groupId === 'Demanda en b.c.') {
            getDayEntry(dateStr).demand = v.value;
          }
          // Imports/Exports (Saldo I. internacionales)
          if (
            category.groupId === 'Demanda en b.c.' &&
            attr.title === 'Saldo I. internacionales'
          ) {
            // Negative is import, positive is export
            if (v.value < 0) {
              getDayEntry(dateStr).imports = Math.abs(v.value);
              getDayEntry(dateStr).exports = 0;
            } else {
              getDayEntry(dateStr).exports = v.value;
              getDayEntry(dateStr).imports = 0;
            }
          }
        }
      }
      // Composite generation totals
      if (
        category.groupId === 'Renovable' &&
        attr.title === 'Generación renovable'
      ) {
        for (const v of attr.values) {
          getDayEntry(v.datetime).generation += v.value;
        }
      }
      if (
        category.groupId === 'No-Renovable' &&
        attr.title === 'Generación no renovable'
      ) {
        for (const v of attr.values) {
          getDayEntry(v.datetime).generation += v.value;
        }
      }
    }

    // Upsert each day's summary and breakdown
    for (const day of Object.values(dayMap)) {
      await Balance.findOneAndUpdate({ timestamp: day.timestamp }, day, {
        upsert: true,
        new: true,
      });
    }
  } catch (error) {
    console.error('Error fetching REE data:', error);
  }
};

// MongoDB Connection with retries
const connectWithRetry = async () => {
  const maxRetries = 5;
  const retryInterval = 5000; // 5 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://mongodb:27017/ree-balance',
        {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        }
      );
      console.log('Connected to MongoDB successfully');

      // Schedule data fetching every hour
      cron.schedule('0 * * * *', () => {
        console.log('Fetching REE data...');
        fetchREEData();
      });

      // Initial data fetch
      await fetchREEData();
      return;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${i + 1} failed:`,
        error.message
      );
      if (i < maxRetries - 1) {
        console.log(`Retrying in ${retryInterval / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      } else {
        console.error('Failed to connect to MongoDB after multiple attempts');
        process.exit(1);
      }
    }
  }
};

// Start MongoDB connection
connectWithRetry();

const app = express();

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Add JSON parsing middleware
app.use(express.json());

// Explicitly handle POST requests for GraphQL
app.post('/graphql', createHandler({ schema }));

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
