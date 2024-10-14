const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");
const User = require("./User");
const mongoose = require("mongoose");
const { PubSub } = require("graphql-subscriptions");

const pubsub = new PubSub();
const USER_ADDED = "USER_ADDED";

const db = mongoose
  .connect(
    "mongodb+srv://sunny:sunny@firstcluster.gxsun.mongodb.net/test?retryWrites=true&w=majority&appName=FirstCluster",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then((rs) => {
    console.log("DB connected");
  })
  .catch((er) => {
    console.log("error in connection");
  });

// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// GraphQL schema
const typeDefs = gql`
  type User {
    id: ID!
    name: String!
    email: String!
    age: Int!
  }

  type Query {
    users: [User]
    user(id: ID!): User
  }

  type Mutation {
    addUser(name: String!, email: String!, age: Int!): User
  }

  type Subscription {
    userAdded: User!
  }
`;

// Resolvers
const resolvers = {
  Query: {
    users: async () => await User.find(),
    user: async (_, { id }) => await User.findById(id),
  },
  Mutation: {
    addUser: async (_, { name, email, age }) => {
      const user = new User({ name, email, age });
      await user.save();
      pubsub.publish(USER_ADDED, { userAdded: user });
      return user;
    },
  },
  Subscription: {
    userAdded: {
      subscribe: () => pubsub.asyncIterator([USER_ADDED]),
    },
  },
};

// Apollo server setup
const startServer = async () => {
  const server = new ApolloServer({ typeDefs, resolvers });
  const app = express();
  await server.start();
  server.applyMiddleware({ app });

  // Start the server
  app.get("/", (req, res) => {
    res.send("Hellow");
  });
  app.listen({ port: 4000 }, () =>
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
  );
};
startServer();
