"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { countryCodes, type CountryCode } from "@/lib/country-codes"

interface CountryCodeSelectorProps {
  selected: CountryCode
  onSelect: (country: CountryCode) => void
}

export function CountryCodeSelector({ selected, onSelect }: CountryCodeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return countryCodes
    const q = search.toLowerCase()
    return countryCodes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
    )
  }, [search])

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
    if (!open) setSearch("")
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-l-xl border border-r-0 border-border bg-secondary px-3 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Prefijo seleccionado: ${selected.flag} ${selected.dial}`}
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="text-foreground">{selected.dial}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-background shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search bar */}
          <div className="relative border-b border-border p-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar pais o codigo..."
              className="w-full rounded-lg bg-secondary py-2.5 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Country list */}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto overscroll-contain"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No se encontraron resultados
              </div>
            ) : (
              filtered.map((country) => {
                const isSelected = country.code === selected.code
                return (
                  <button
                    key={country.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelect(country)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary ${
                      isSelected ? "bg-primary/5 font-medium" : ""
                    }`}
                  >
                    <span className="text-lg leading-none">{country.flag}</span>
                    <span className="flex-1 truncate text-foreground">
                      {country.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {country.dial}
                    </span>
                    {isSelected && (
                      <span className="shrink-0 text-primary font-bold">{"•"}</span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
