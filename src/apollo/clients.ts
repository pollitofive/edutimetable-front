import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core"
import { setContext } from "@apollo/client/link/context"

const httpLink = createHttpLink({
    uri: "http://edutimetable-api.test/api/graphql",
    credentials: "include"
});

const authLink = setContext((_, { headers }) => {
    return {
        headers: {
            ...headers,
            Authorization: "bearer 1|32a6eABHyMv1ErsPjFALReYm2fliWZ4vTOm9rN3R75d3ebe3"
        }
    }
});

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});