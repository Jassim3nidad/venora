"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { filterLandingSearchSuggestions } from "../utils/landing-search-suggestions";

interface SuggestionInputProps {
  label: string;
  name: string;
  options: string[];
  placeholder: string;
  withDivider?: boolean;
}

function SuggestionInput({
  label,
  name,
  options,
  placeholder,
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
      className={`relative min-w-0 border-b border-[#E5E7EB] px-4 py-3 md:border-b-0 ${
        withDivider ? "md:border-r" : ""
      }`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label
        className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1D4ED8]"
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
        className="mt-1 w-full min-w-0 border-none bg-transparent p-0 text-sm font-semibold text-[#111827] outline-none placeholder:text-slate-400"
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
          className="absolute left-2 right-2 top-[calc(100%-0.25rem)] z-30 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        >
          {filteredOptions.map((option, index) => (
            <button
              key={option}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`block w-full px-3 py-2 text-left text-sm font-semibold transition ${
                index === activeIndex
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
}

export default function LandingSegmentedSearch({
  locations,
  eventTypes,
}: LandingSegmentedSearchProps) {
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
