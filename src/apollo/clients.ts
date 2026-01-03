import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core"
import { setContext } from "@apollo/client/link/context"

const httpLink = createHttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || "http://edutimetable-api.test/api/graphql",
    credentials: "include"
});

const authLink = setContext((_, { headers }) => {
    // Get token from localStorage (stored by the auth store)
    const token = localStorage.getItem('token');

    return {
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    }
});

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});