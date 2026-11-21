// Validation errors of a GraphQL mutation, by field: { email: 'El email ya lo usa otra persona.' }.
// Lighthouse sends them in extensions.validation, keyed by argument path ("input.email");
// the "input." prefix is dropped so they match the form fields. Null when the error is
// not a validation error (network, server error...).
export function graphqlValidationErrors(err: any): Record<string, string> | null {
  const validation = err?.graphQLErrors?.find((e: any) => e.extensions?.validation)?.extensions.validation

  if (!validation) return null

  return Object.fromEntries(
    Object.entries(validation as Record<string, string[]>).map(([path, messages]) => [
      path.replace(/^input\./, ''),
      messages[0],
    ])
  )
}
