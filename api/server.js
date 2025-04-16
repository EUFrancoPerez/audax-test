const express = require("express");
const { ruruHTML } = require("ruru/server");
const { graphql, buildSchema } = require("graphql");
const { createHandler } = require("graphql-http/lib/use/express");

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`type Query { hello: String }`);

// The rootValue provides a resolver function for each API endpoint
const rootValue = {
  hello() {
    // fetch from db
    // process
    // return data
    return "Hello world!";
  },
};

const app = express();

app.all("/graphql", createHandler({ schema, rootValue }));
app.get("/", (_req, res) => {
  res.type("html"), res.end(ruruHTML({ endpoint: "/graphql" }));
});

app.listen(4000);
console.log(`
Api running on: http://localhost:4000
Test: http://localhost:4000/graphql?query={hello}
`);
