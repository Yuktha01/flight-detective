import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SearchForm } from './SearchForm'

function renderSearchForm(overrides: Partial<Parameters<typeof SearchForm>[0]> = {}) {
  const props = {
    value: '',
    loading: false,
    error: '',
    onValueChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides,
  }

  render(<SearchForm {...props} />)
  return props
}

function ControlledSearchForm() {
  const [value, setValue] = useState('')

  return (
    <SearchForm
      value={value}
      loading={false}
      error=""
      onValueChange={setValue}
      onSubmit={vi.fn()}
    />
  )
}

describe('SearchForm', () => {
  it('renders a labeled flight number input and Investigate button', () => {
    renderSearchForm()

    expect(screen.getByRole('textbox', { name: 'Flight number' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /investigate/i })).toBeInTheDocument()
  })

  it('reports the value entered by the user', async () => {
    const user = userEvent.setup()
    render(<ControlledSearchForm />)

    const input = screen.getByRole('textbox', { name: 'Flight number' })
    await user.type(input, 'AI302')

    expect(input).toHaveValue('AI302')
  })

  it('submits the entered flight number', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSearchForm({ value: 'SU1531' })

    await user.click(screen.getByRole('button', { name: /investigate/i }))

    expect(onSubmit).toHaveBeenCalledWith('SU1531')
  })

  it('disables the input and button while loading', () => {
    renderSearchForm({ loading: true })

    expect(screen.getByRole('textbox', { name: 'Flight number' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()
  })

  it('shows validation errors and marks the input invalid', () => {
    renderSearchForm({ error: 'Enter a valid flight number.' })

    expect(screen.getByText('Enter a valid flight number.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Flight number' })).toHaveAttribute('aria-invalid', 'true')
  })
})