import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client/core"
import { setContext } from "@apollo/client/link/context"
import { onError } from "@apollo/client/link/error"
import { getCurrentBusinessId } from "@/services/businessService"
import { useAuthStore } from "@/stores/auth"

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

// @guard answers "Unauthenticated." when the token is no longer valid (logged out or
// revoked from another session): drop the local session instead of showing empty screens
const authErrorLink = onError(({ graphQLErrors, networkError }) => {
    const unauthenticated = graphQLErrors?.some(e => e.message === 'Unauthenticated.')
        || (networkError as { statusCode?: number } | undefined)?.statusCode === 401;

    if (unauthenticated && localStorage.getItem('token')) {
        useAuthStore().clearSession();
    }
});

export const apolloClient = new ApolloClient({
    link: authErrorLink.concat(authLink).concat(httpLink),
    cache: new InMemoryCache(),
});
