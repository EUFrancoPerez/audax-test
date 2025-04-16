const express = require('express');
const { ruruHTML } = require('ruru/server');
const { graphql, buildSchema } = require('graphql');
const { createHandler } = require('graphql-http/lib/use/express');

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type Query { 
    hello(name: String!): String 
    age: Int
    weight: Float!
    isOver18: Boolean
    hobbies: [String!]!
  }
`);

// The rootValue provides a resolver function for each API endpoint
const rootValue = {
  hello: ({ name }) => {
    // fetch from db
    // process
    // return data
    return 'Hello ' + name;
  },
  age: () => {
    return 25;
  },
  weight: 83,
  isOver18: true,
  hobbies: () => {
    return ['Carting', 'F1', 'Simulator'];
  },
};

const app = express();

app.all('/graphql', createHandler({ schema, rootValue }));
app.get('/', (_req, res) => {
  res.type('html'), res.end(ruruHTML({ endpoint: '/graphql' }));
});

app.listen(4000);
console.log(`
Api running on: http://localhost:4000
Test: http://localhost:4000/graphql?query={hello}
`);
