/**
 * __tests__/components/SearchForm.test.tsx
 * Tests du formulaire de création/édition de recherche
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import SearchForm from '@/components/SearchForm'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockBack = jest.fn()

beforeEach(() => {
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack })
  jest.clearAllMocks()
})

describe('SearchForm — rendu', () => {
  it('affiche tous les champs requis', () => {
    render(<SearchForm onSubmit={jest.fn()} submitLabel="Créer" />)
    expect(screen.getByPlaceholderText(/dracaufeu.*vintage/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /leboncoin/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vinted/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ebay/i })).toBeInTheDocument()
    expect(screen.getByText('Créer')).toBeInTheDocument()
  })

  it('affiche les valeurs par défaut', () => {
    render(<SearchForm onSubmit={jest.fn()} submitLabel="Save" />)
    // Leboncoin et Vinted sélectionnés par défaut
    const leboncoinBtn = screen.getByRole('button', { name: /leboncoin/i })
    expect(leboncoinBtn).toHaveClass('bg-yellow-500')
    const vintedbtn = screen.getByRole('button', { name: /vinted/i })
    expect(vintedbtn).toHaveClass('bg-yellow-500')
    // eBay pas sélectionné par défaut
    const ebayBtn = screen.getByRole('button', { name: /ebay/i })
    expect(ebayBtn).not.toHaveClass('bg-yellow-500')
  })

  it('charge les données initiales passées en prop', () => {
    const initial = {
      name: 'ETB Test',
      keywords: ['etb', 'pokemon'],
      platforms: ['ebay'],
      minPrice: '20',
      maxPrice: '150',
      active: true,
    }
    render(<SearchForm initialData={initial} onSubmit={jest.fn()} submitLabel="Save" />)
    expect(screen.getByDisplayValue('ETB Test')).toBeInTheDocument()
    expect(screen.getByText('etb')).toBeInTheDocument()
    expect(screen.getByText('pokemon')).toBeInTheDocument()
  })
})

describe('SearchForm — interaction keywords', () => {
  it('ajoute un keyword en appuyant sur Entrée', async () => {
    render(<SearchForm onSubmit={jest.fn()} submitLabel="Save" />)
    const input = screen.getByTestId('keyword-input')
    await userEvent.type(input, 'pikachu')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('pikachu')).toBeInTheDocument()
  })

  it('supprime un keyword en cliquant sur ×', async () => {
    const initial = { name: '', keywords: ['dracaufeu'], platforms: ['vinted'], minPrice: '0', maxPrice: '100', active: true }
    render(<SearchForm initialData={initial} onSubmit={jest.fn()} submitLabel="Save" />)
    expect(screen.getByText('dracaufeu')).toBeInTheDocument()
    const removeBtn = screen.getByText('×')
    await userEvent.click(removeBtn)
    expect(screen.queryByText('dracaufeu')).not.toBeInTheDocument()
  })

  it("n'ajoute pas un keyword déjà présent", async () => {
    const initial = { name: '', keywords: ['pikachu'], platforms: ['vinted'], minPrice: '0', maxPrice: '100', active: true }
    render(<SearchForm initialData={initial} onSubmit={jest.fn()} submitLabel="Save" />)
    const input = screen.getByTestId('keyword-input')
    await userEvent.type(input, 'pikachu')
    fireEvent.keyDown(input, { key: 'Enter' })
    const chips = screen.getAllByText('pikachu')
    expect(chips).toHaveLength(1)
  })
})

describe('SearchForm — validation', () => {
  it('affiche une erreur si nom manquant', async () => {
    render(<SearchForm onSubmit={jest.fn()} submitLabel="Save" />)
    fireEvent.submit(screen.getByText('Save').closest('form')!)
    await waitFor(() => expect(screen.getByText(/nom est requis/i)).toBeInTheDocument())
  })

  it('affiche une erreur si aucun keyword', async () => {
    render(<SearchForm onSubmit={jest.fn()} submitLabel="Save" />)
    const nameInput = screen.getByPlaceholderText(/dracaufeu.*vintage/i)
    await userEvent.type(nameInput, 'Mon ETB')
    fireEvent.submit(screen.getByText('Save').closest('form')!)
    await waitFor(() => expect(screen.getByText(/mot-clé/i)).toBeInTheDocument())
  })

  it('affiche une erreur si prix min >= prix max', async () => {
    const initial = {
      name: 'Test',
      keywords: ['etb'],
      platforms: ['vinted'],
      minPrice: '100',
      maxPrice: '50',
      active: true,
    }
    render(<SearchForm initialData={initial} onSubmit={jest.fn()} submitLabel="Save" />)
    fireEvent.submit(screen.getByText('Save').closest('form')!)
    await waitFor(() => expect(screen.getByText(/prix minimum/i)).toBeInTheDocument())
  })
})

describe('SearchForm — plateformes', () => {
  it('toggle une plateforme au clic', async () => {
    render(<SearchForm onSubmit={jest.fn()} submitLabel="Save" />)
    const ebayBtn = screen.getByRole('button', { name: /ebay/i })
    expect(ebayBtn).not.toHaveClass('bg-yellow-500')
    await userEvent.click(ebayBtn)
    expect(ebayBtn).toHaveClass('bg-yellow-500')
    await userEvent.click(ebayBtn)
    expect(ebayBtn).not.toHaveClass('bg-yellow-500')
  })
})
