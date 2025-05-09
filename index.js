const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const depthLimit = require('graphql-depth-limit');
const { createComplexityLimitRule } = require('graphql-validation-complexity')
require('dotenv').config();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');

const models = require('./models');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');

const DB_HOST = process.env.DB_HOST;
const port = process.env.PORT || 4000;

const app = express();
app.use(helmet());
app.use(cors());

mongoose.connect(DB_HOST)
    .then(() => {
        console.log('MongoDB Connected');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // 使用非0退出码表示错误
    });

const server = new ApolloServer({
    typeDefs,
    resolvers,
    validationRules: [depthLimit(5), createComplexityLimitRule(1000)],
    context: async ({req}) => {
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