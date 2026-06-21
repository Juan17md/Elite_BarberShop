"use client"

import { ChevronDown, Check } from "lucide-react"
import { useState, useRef, useEffect, CSSProperties } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  error?: string
  name?: string
  id?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  disabled = false,
  className,
  error,
  name,
  id,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({})
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listId = id ? `${id}-listbox` : undefined

  const selectedOption = options.find(opt => opt.value === value)

  useEffect(() => { setMounted(true) }, [])

  const computePosition = () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      const inWrapper  = ref.current?.contains(target)
      const inDropdown = dropdownRef.current?.contains(target)
      if (!inWrapper && !inDropdown) setIsOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    window.addEventListener("scroll", computePosition, true)
    window.addEventListener("resize", computePosition)
    return () => {
      window.removeEventListener("scroll", computePosition, true)
      window.removeEventListener("resize", computePosition)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { if (!disabled) { if (!isOpen) computePosition(); setIsOpen(o => !o) } }}
        disabled={disabled}
        name={name}
        id={id}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listId}
        className={cn(
          "group flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-300",
          "bg-linear-to-r from-surface-high/95 to-surface/95 backdrop-blur-sm",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-white/15 hover:from-surface-high hover:to-surface-high",
          "focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_1px_rgba(239,68,68,0.18),0_0_24px_rgba(239,68,68,0.08)]",
          error ? "border-red-500/50" : "border-border-subtle",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className={cn("pr-3 text-text-primary", !selectedOption && "text-text-muted")}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 shrink-0 text-text-muted transition-all duration-300 group-hover:text-white",
          isOpen && "rotate-180 text-primary"
        )} />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={dropdownRef}
          id={listId}
          role="listbox"
          style={dropdownStyle}
          className="max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1017]/98 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              onClick={() => {
                onChange?.(option.value)
                setIsOpen(false)
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm transition-all duration-200",
                option.value === value
                  ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(239,68,68,0.16)]"
                  : "text-text-primary hover:bg-white/[0.04] hover:text-white",
                option.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
