"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { filterLandingSearchSuggestions } from "../utils/landing-search-suggestions";

interface SuggestionInputProps {
  label: string;
  name: string;
  options: string[];
  placeholder: string;
  variant?: "compact" | "panel";
  withDivider?: boolean;
}

function SuggestionInput({
  label,
  name,
  options,
  placeholder,
  variant = "compact",
  withDivider = false,
}: SuggestionInputProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const filteredOptions = useMemo(
    () => filterLandingSearchSuggestions(options, value).slice(0, 7),
    [options, value],
  );
  const showOptions = isOpen && filteredOptions.length > 0;

  const selectOption = (option: string) => {
    setValue(option);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div
      className={
        variant === "panel"
          ? "relative min-w-0"
          : `relative min-w-0 border-b border-[#E5E7EB] px-4 py-3 md:border-b-0 ${withDivider ? "md:border-r" : ""
          }`
      }
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label
        className={
          variant === "panel"
            ? "mb-1.5 block text-xs font-bold text-slate-950 sm:mb-2 sm:text-sm"
            : "block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1D4ED8]"
        }
        htmlFor={inputId}
      >
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={showOptions}
        aria-activedescendant={
          activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
        className={
          variant === "panel"
            ? "h-10 w-full min-w-0 rounded-xl border border-transparent bg-[#F4F6F8] px-3 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-slate-400 hover:bg-slate-100 focus:border-[#93C5FD] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 sm:h-14 sm:rounded-2xl sm:px-4"
            : "mt-1 w-full min-w-0 border-none bg-transparent p-0 text-sm font-semibold text-[#111827] outline-none placeholder:text-slate-400"
        }
        placeholder={placeholder}
        type="text"
        value={value}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setValue(event.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && filteredOptions.length > 0) {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) =>
              index >= filteredOptions.length - 1 ? 0 : index + 1,
            );
          } else if (event.key === "ArrowUp" && filteredOptions.length > 0) {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) =>
              index <= 0 ? filteredOptions.length - 1 : index - 1,
            );
          } else if (event.key === "Enter" && activeIndex >= 0) {
            event.preventDefault();
            selectOption(filteredOptions[activeIndex]!);
          } else if (event.key === "Escape") {
            setIsOpen(false);
            setActiveIndex(-1);
          } else if (event.key === "Tab") {
            setIsOpen(false);
            setActiveIndex(-1);
          }
        }}
      />

      {showOptions ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className={
            variant === "panel"
              ? "absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
              : "absolute left-2 right-2 top-[calc(100%-0.25rem)] z-30 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
          }
        >
          {filteredOptions.map((option, index) => (
            <button
              key={option}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`block w-full px-3 py-2 text-left text-sm font-semibold transition ${index === activeIndex
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50"
                }`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface LandingSegmentedSearchProps {
  locations: string[];
  eventTypes: string[];
  variant?: "compact" | "hero-panel";
}

export default function LandingSegmentedSearch({
  locations,
  eventTypes,
  variant = "compact",
}: LandingSegmentedSearchProps) {
  if (variant === "hero-panel") {
    return (
      <form
        action="/venues"
        method="GET"
        data-testid="landing-hero-search-panel"
        className="w-full rounded-[22px] border border-white/80 bg-white p-4 shadow-2xl shadow-slate-950/20 sm:rounded-[28px] sm:p-6 lg:p-7"
      >
        <h2 className="mb-3 text-xl font-bold leading-tight text-slate-950 sm:mb-5 sm:text-3xl">
          Find Your Perfect Venue
        </h2>

        <div className="grid grid-cols-1 gap-2 sm:gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.75fr)_auto] lg:items-end">
          <SuggestionInput
            label="Location"
            name="location"
            options={locations}
            placeholder="Choose a city or province"
            variant="panel"
          />
          <SuggestionInput
            label="Event Type"
            name="event"
            options={eventTypes}
            placeholder="Wedding, Corporate..."
            variant="panel"
          />
          <div className="min-w-0">
            <label
              htmlFor="landing-capacity"
              className="mb-1.5 block text-xs font-bold text-slate-950 sm:mb-2 sm:text-sm"
            >
              Guests
            </label>
            <input
              id="landing-capacity"
              name="capacity"
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="150 pax"
              className="h-10 w-full rounded-xl border border-transparent bg-[#F4F6F8] px-3 text-sm font-semibold text-[#111827] outline-none transition placeholder:text-slate-400 hover:bg-slate-100 focus:border-[#93C5FD] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10 sm:h-14 sm:rounded-2xl sm:px-4"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 text-sm font-bold text-white transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2563EB] sm:h-14 sm:rounded-2xl sm:px-8"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      action="/venues"
      method="GET"
      className="mt-8 w-full max-w-2xl rounded-[24px] border border-[#E5E7EB] bg-white p-2 shadow-xl shadow-slate-200/60"
    >
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-stretch">
        <SuggestionInput
          label="Location"
          name="location"
          options={locations}
          placeholder="Where to?"
          withDivider
        />
        <SuggestionInput
          label="Event Type"
          name="event"
          options={eventTypes}
          placeholder="Wedding, Corporate..."
          withDivider
        />
        <button
          type="submit"
          className="m-2 inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white transition hover:bg-[#1d4ed8] md:self-center"
        >
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>
    </form>
  );
}
