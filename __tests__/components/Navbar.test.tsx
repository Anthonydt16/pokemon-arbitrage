/**
 * __tests__/components/Navbar.test.tsx
 * Tests du composant Navbar
 */

import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/Navbar'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

describe('Navbar', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/')
  })

  it('affiche le logo PokéArbitrage', () => {
    render(<Navbar />)
    expect(screen.getByText('PokéArbitrage')).toBeInTheDocument()
  })

  it('affiche les liens de navigation', () => {
    render(<Navbar />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Recherches')).toBeInTheDocument()
  })

  it('affiche le lien Paramètres', () => {
    render(<Navbar />)
    expect(screen.getByText(/Param/)).toBeInTheDocument()
  })

  it('marque le lien actif avec la bonne classe', () => {
    (usePathname as jest.Mock).mockReturnValue('/searches')
    render(<Navbar />)
    const searchesLink = screen.getByText('Recherches').closest('a')
    expect(searchesLink).toHaveClass('bg-yellow-500')
  })

  it('lien Dashboard pointe vers /', () => {
    render(<Navbar />)
    const dashLink = screen.getByText('Dashboard').closest('a')
    expect(dashLink).toHaveAttribute('href', '/')
  })

  it('lien Recherches pointe vers /searches', () => {
    render(<Navbar />)
    const link = screen.getByText('Recherches').closest('a')
    expect(link).toHaveAttribute('href', '/searches')
  })
})
