const express = require('express');
const { ApolloServer } = require('apollo-server-express');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const models = require('./models');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const DB_HOST = process.env.DB_HOST;
const port = process.env.PORT || 4000;

const app = express();
mongoose.connect(DB_HOST).then( () => {
    console.log('MongoDB Connected');
});
mongoose.connection.on('error', err => {
    console.error(err);
    console.log(
        'MongoDB connection error. Please make sure MongoDB is running.'
    );
    process.exit();
})

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({req}) => {
        const token = req.headers.authorization;
        let user;
        if (token) {
            try {
                user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {
                throw new Error('Session invalid');
            }
        }
        console.log(user);
        return { models, user };
    }
});

server.start().then(() => {
    server.applyMiddleware({ app, path: '/api' });
    app.listen({ port }, () =>
        console.log(
            `GraphQL Server running at http://localhost:${port}${server.graphqlPath}`
        )
    );
});