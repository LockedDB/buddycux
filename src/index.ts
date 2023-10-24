import gql from "graphql-tag";
import {startStandaloneServer} from "@apollo/server/standalone";
import {ApolloServer} from "@apollo/server";
import dotenv from "dotenv";
import {Client, fql} from "fauna";

dotenv.config();

class FaunaDataSource {
    private dbConnection: Client;
    private exercise;
    private error;

    constructor() {
        this.dbConnection = new Client({
            secret: process.env.DATABASE_SERVER_KEY ?? "",
        });
    }

    async getExercise(exerciseId: string) {
        const query = fql`Exercise.byId(${exerciseId}) {
            name,
            description,
            primaryMuscle
        } `;
        try {
            this.exercise = await this.dbConnection.query(query)
        } catch (e) {
            this.error = e
            console.log("Error 👎", e);
        }
        return this.exercise.data
    }
}

export const books = [
    {
        title: 'The Awakening',
        author: 'Kate Chopin',
    },
    {
        title: 'City of Glass',
        author: 'Paul Auster',
    },
];

// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {
    Query: {
        books: () => books,
        getExercise: async (_, __, {dataSources}) => {
            return dataSources.faunaDB.getExercise("378901583609462864")
        }
    },
};

export const typeDefs = gql`

    "TODO: Remove this later"
    type Book {
        title: String
        author: String
    }

    type Query {
        "Get all existing routines"
        allRoutines: [Routine!]!
        
        "Get exercise"
        getExercise: Exercise!
        
        "REMOVE"
        books: [Book]
    }

    "A routine is a group of exercises that are done one after the other"
    type Routine {
        id: ID!
        name: String!
        exercises: [Exercise]
    }

    type Exercise {
        name: String!
        description: String
        "The main muscle the exercise is working"
        primaryMuscle: String!
        "Array of multiple secondary muscles worked on"
        secondaryMuscles: [String]
    }
`

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
    typeDefs,
    resolvers,
});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({req}) => {
        const { cache } = server
        const token = req.headers.token;

        // We create new instances of our data sources with each request.
        // We can pass in our server's cache, contextValue, or any other
        // info our data sources require.
        return {
            dataSources: {
                faunaDB: new FaunaDataSource(),
            }
        }
    }
});

console.log(`🚀  Server ready at: ${url}`);