import { useState, useEffect, useRef, useCallback } from "react";
import countriesData from "@/data/countries.json";

/* ── Types ─────────────────────────────────────────────────── */
interface Country {
  name: string;
  code: string;
}

interface CountrySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/* ── Inject Styles Once ─────────────────────────────────────── */
const STYLE_ID = "country-select-styles";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .cs-wrapper {
      position: relative;
      width: 100%;
      font-family: "Inter", sans-serif;
    }

    .cs-input-row {
      display: flex;
      align-items: center;
      width: 100%;
      height: 40px;
      border: 1px solid #E8E8E8;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      padding: 0 12px;
      gap: 8px;
      transition: border-color 0.2s, box-shadow 0.2s;
      cursor: text;
      box-sizing: border-box;
    }

    .cs-input-row:focus-within {
      border-color: #FB6376;
      box-shadow: 0 0 0 3px rgba(251, 99, 118, 0.12);
    }

    .cs-input-row.cs-disabled {
      background: #FAFAFA;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .cs-flag {
      width: 20px;
      height: 20px;
      border-radius: 3px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .cs-flag-placeholder {
      width: 20px;
      height: 20px;
      border-radius: 3px;
      background: #F0E8E4;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }

    .cs-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14px;
      color: #1A1A1A;
      font-family: "Inter", sans-serif;
      padding: 0;
      min-width: 0;
    }

    .cs-input::placeholder {
      color: #BBBBBB;
    }

    .cs-input:disabled {
      cursor: not-allowed;
      color: #999;
    }

    .cs-chevron {
      flex-shrink: 0;
      color: #AAAAAA;
      transition: transform 0.2s ease;
    }

    .cs-chevron.open {
      transform: rotate(180deg);
      color: #FB6376;
    }

    .cs-clear {
      flex-shrink: 0;
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: #AAAAAA;
      border-radius: 6px;
      display: flex;
      align-items: center;
      transition: color 0.15s, background 0.15s;
      line-height: 0;
    }

    .cs-clear:hover {
      color: #FB6376;
      background: rgba(251, 99, 118, 0.08);
    }

    .cs-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid #E8E8E8;
      border-radius: 14px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
      max-height: 240px;
      overflow-y: auto;
      z-index: 9999;
      padding: 6px;
      animation: cs-dropdown-in 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      scrollbar-width: thin;
      scrollbar-color: #E8E8E8 transparent;
    }

    .cs-dropdown::-webkit-scrollbar {
      width: 4px;
    }

    .cs-dropdown::-webkit-scrollbar-thumb {
      background: #E8E8E8;
      border-radius: 4px;
    }

    @keyframes cs-dropdown-in {
      from { opacity: 0; transform: translateY(-6px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .cs-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 9px;
      cursor: pointer;
      font-size: 14px;
      color: #1A1A1A;
      transition: background 0.12s;
      user-select: none;
    }

    .cs-option:hover,
    .cs-option.highlighted {
      background: #FFF4F2;
    }

    .cs-option.selected {
      background: #FFF4F2;
      color: #FB6376;
      font-weight: 600;
    }

    .cs-option.highlighted.selected {
      background: rgba(251, 99, 118, 0.12);
    }

    .cs-option-flag {
      width: 20px;
      height: 20px;
      border-radius: 3px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .cs-option-name {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cs-option-check {
      color: #FB6376;
      flex-shrink: 0;
    }

    .cs-empty {
      padding: 20px 12px;
      text-align: center;
      color: #AAA;
      font-size: 13px;
    }

    .cs-empty-icon {
      font-size: 22px;
      margin-bottom: 4px;
    }
  `;
  document.head.appendChild(style);
}

/* ── Helper ─────────────────────────────────────────────────── */
const flagUrl = (code: string) =>
  `https://flagsapi.com/${code}/flat/24.png`;

const countries: Country[] = countriesData as Country[];

/* ── Component ──────────────────────────────────────────────── */
const CountrySelect = ({
  value = "",
  onChange,
  placeholder = "Search country…",
  disabled = false,
}: CountrySelectProps) => {
  // Resolve initial country from value prop
  const resolveCountry = (name: string) =>
    countries.find((c) => c.name.toLowerCase() === name.toLowerCase()) || null;

  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<Country[]>(countries);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(
    resolveCountry(value)
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Sync value prop → internal state */
  useEffect(() => {
    const found = resolveCountry(value);
    setSelectedCountry(found);
    setQuery(found ? found.name : value);
  }, [value]);

  /* Debounced filter */
  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    setHighlightedIndex(-1);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const trimmed = q.trim().toLowerCase();
      if (!trimmed) {
        setFiltered(countries);
      } else {
        setFiltered(
          countries.filter((c) => c.name.toLowerCase().includes(trimmed))
        );
      }
    }, 300);
  }, []);

  /* Outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedCountry]);

  /* Scroll highlighted item into view */
  useEffect(() => {
    if (!listRef.current || highlightedIndex < 0) return;
    const items = listRef.current.querySelectorAll<HTMLDivElement>(".cs-option");
    items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const closeDropdown = () => {
    setIsOpen(false);
    // Revert input to selected name if no valid match
    if (selectedCountry) {
      setQuery(selectedCountry.name);
    } else {
      setQuery("");
    }
    setHighlightedIndex(-1);
  };

  const selectCountry = (country: Country) => {
    setSelectedCountry(country);
    setQuery(country.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    onChange?.(country.name);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCountry(null);
    setQuery("");
    setFiltered(countries);
    setIsOpen(true);
    onChange?.("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          selectCountry(filtered[highlightedIndex]);
        }
        break;
      case "Escape":
        closeDropdown();
        break;
    }
  };

  return (
    <div className="cs-wrapper" ref={wrapperRef}>
      {/* ── Input Row ── */}
      <div
        className={`cs-input-row ${disabled ? "cs-disabled" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {/* Flag or placeholder globe */}
        {selectedCountry ? (
          <img
            src={flagUrl(selectedCountry.code)}
            alt={selectedCountry.name}
            className="cs-flag"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="cs-flag-placeholder">🌐</span>
        )}

        <input
          ref={inputRef}
          className="cs-input"
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
              if (selectedCountry) {
                setQuery("");
                setFiltered(countries);
              }
            }
          }}
          onChange={(e) => {
            handleQueryChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        {/* Clear button */}
        {selectedCountry && !disabled && (
          <button className="cs-clear" onClick={handleClear} tabIndex={-1} title="Clear">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* Chevron */}
        <svg
          className={`cs-chevron ${isOpen ? "open" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M3 5L7 9L11 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* ── Dropdown ── */}
      {isOpen && !disabled && (
        <div className="cs-dropdown" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="cs-empty">
              <div className="cs-empty-icon">🔍</div>
              No countries found for "<strong>{query}</strong>"
            </div>
          ) : (
            filtered.map((country, idx) => {
              const isSelected = selectedCountry?.code === country.code;
              const isHighlighted = highlightedIndex === idx;
              return (
                <div
                  key={country.code}
                  className={`cs-option ${isHighlighted ? "highlighted" : ""} ${isSelected ? "selected" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur
                    selectCountry(country);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <img
                    src={flagUrl(country.code)}
                    alt={country.name}
                    className="cs-option-flag"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                    }}
                  />
                  <span className="cs-option-name">{country.name}</span>
                  {isSelected && (
                    <svg className="cs-option-check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7L5.5 10.5L12 3.5" stroke="#FB6376" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
