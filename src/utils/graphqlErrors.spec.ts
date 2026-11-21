import { describe, it, expect } from 'vitest'
import { graphqlValidationErrors } from './graphqlErrors'

describe('graphqlValidationErrors', () => {
  it('returns the first message of each field, without the "input." prefix', () => {
    const err = {
      graphQLErrors: [{
        message: 'Validation failed for the field [createStudent].',
        extensions: { validation: {
          'input.email': ['El email ya lo usa otra persona.', 'otro'],
          'input.phone': ['El teléfono no puede tener más de 50 caracteres.'],
        } },
      }],
    }

    expect(graphqlValidationErrors(err)).toEqual({
      email: 'El email ya lo usa otra persona.',
      phone: 'El teléfono no puede tener más de 50 caracteres.',
    })
  })

  it('keeps fields that are not under input', () => {
    const err = { graphQLErrors: [{ extensions: { validation: { id: ['No existe.'] } } }] }

    expect(graphqlValidationErrors(err)).toEqual({ id: 'No existe.' })
  })

  it('is null when it is not a validation error', () => {
    expect(graphqlValidationErrors({ graphQLErrors: [{ message: 'Internal server error', extensions: {} }] })).toBeNull()
    expect(graphqlValidationErrors(new Error('Network error'))).toBeNull()
    expect(graphqlValidationErrors(undefined)).toBeNull()
  })
})
