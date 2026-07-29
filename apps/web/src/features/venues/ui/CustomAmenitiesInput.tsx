"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus } from "lucide-react";

export default function CustomAmenitiesInput({
  initialAmenities = [],
}: {
  initialAmenities?: string[];
}) {
  const [amenities, setAmenities] = useState<string[]>(initialAmenities);
  const [inputValue, setInputValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAdd = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const isDuplicate = amenities.some(
      (amenity) =>
        amenity.trim().toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    );

    if (isDuplicate) {
      setError("This amenity is already added.");
      return;
    }

    setAmenities([...amenities, trimmed]);
    setInputValue("");
    setError("");
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setAmenities(amenities.filter((_, index) => index !== indexToRemove));
  };

  const handleCancel = () => {
    setInputValue("");
    setError("");
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden input to pass the array as a comma-separated string to the server action */}
      <input
        type="hidden"
        name="custom_amenities"
        value={amenities.join(",")}
      />

      {amenities.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {amenities.map((amenity, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] py-1 pl-3 pr-1.5 text-sm font-medium text-[#1e40af]"
            >
              {amenity}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="flex h-5 w-5 items-center justify-center rounded-md text-[#1d4ed8] transition hover:bg-[#bfdbfe] hover:text-[#1e3a8a]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdding ? (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type amenity or feature name"
              className="h-10 w-full rounded-lg border border-[#dbe3ef] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!inputValue.trim()}
                className="h-10 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:opacity-50 disabled:hover:bg-[#2563eb]"
              >
                Add
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-lg border border-[#dbe3ef] bg-white px-4 text-sm font-semibold text-[#334155] transition hover:bg-[#f8fafc]"
              >
                Cancel
              </button>
            </div>
          </div>
          {error ? (
            <p className="text-xs font-medium text-red-600">{error}</p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex h-10 w-fit items-center gap-1.5 rounded-lg border border-[#dbe3ef] bg-white px-4 text-sm font-semibold text-[#2563eb] transition hover:bg-[#f8fafc]"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      )}
    </div>
  );
}
