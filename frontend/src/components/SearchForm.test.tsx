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

    expect(screen.getByRole('textbox', { name: /enter flight number/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /investigate/i })).toBeInTheDocument()
  })

  it('reports the value entered by the user', async () => {
    const user = userEvent.setup()
    render(<ControlledSearchForm />)

    const input = screen.getByRole('textbox', { name: /enter flight number/i })
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

    expect(screen.getByRole('textbox', { name: /enter flight number/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled()
  })

  it('shows validation errors and marks the input invalid', () => {
    renderSearchForm({ error: 'Enter a valid flight number.' })

    expect(screen.getByText('Enter a valid flight number.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /enter flight number/i })).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders and invokes the Surprise Me button when onSurpriseMe is provided', async () => {
    const user = userEvent.setup()
    const onSurpriseMe = vi.fn()
    renderSearchForm({ onSurpriseMe })

    const surpriseButton = screen.getByRole('button', { name: 'Surprise Me' })
    expect(surpriseButton).toBeInTheDocument()

    await user.click(surpriseButton)
    expect(onSurpriseMe).toHaveBeenCalledTimes(1)
  })

  it('disables controls and shows picking state when surpriseLoading is true', () => {
    renderSearchForm({ onSurpriseMe: vi.fn(), surpriseLoading: true })

    expect(screen.getByRole('textbox', { name: /enter flight number/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /investigate/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /picking/i })).toBeDisabled()
  })

  it('renders the ghost corridor suggestion and auto-fills on keycap button click', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onSubmit = vi.fn()
    renderSearchForm({ onValueChange, onSubmit })

    const ghostButton = screen.getByRole('button', { name: 'BA249' })
    expect(ghostButton).toBeInTheDocument()

    await user.click(ghostButton)

    expect(onValueChange).toHaveBeenCalledWith('BA249')
    expect(onSubmit).toHaveBeenCalledWith('BA249')
  })

  it('auto-fills the ghost suggestion when pressing Tab on an empty input', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const onSubmit = vi.fn()
    renderSearchForm({ onValueChange, onSubmit })

    const input = screen.getByRole('textbox', { name: /enter flight number/i })
    await user.click(input)
    await user.keyboard('{Tab}')

    expect(onValueChange).toHaveBeenCalledWith('BA249')
    expect(onSubmit).toHaveBeenCalledWith('BA249')
  })
})