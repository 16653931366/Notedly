const Query = require('./query');
const Mutation = require('./mutation');
const { DateTimeResolver } = require('graphql-scalars');

module.exports = {
    Query,
    Mutation,
    DateTime: DateTimeResolver 
};