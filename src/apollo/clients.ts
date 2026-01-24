import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core"
import { setContext } from "@apollo/client/link/context"
import { getCurrentBusinessId } from "@/services/businessService"

const httpLink = createHttpLink({
    uri: import.meta.env.VITE_GRAPHQL_URL || "http://edutimetable-api.test/api/graphql",
    credentials: "include"
});

const authLink = setContext((_, { headers }) => {
    // Get token from localStorage (stored by the auth store)
    const token = localStorage.getItem('token');

    // Get current business ID from business service
    const businessId = getCurrentBusinessId();

    return {
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(businessId ? { 'X-Business-Id': businessId.toString() } : {})
        }
    }
});

export const apolloClient = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
});
