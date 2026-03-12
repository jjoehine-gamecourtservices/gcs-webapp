import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  MultiSelectDropdownProps,
  RentalRequestOption,
  SearchableDropdownProps,
} from "../../rentalrequest.types";

const NONE_OPTION: RentalRequestOption = {
  id: "__none__",
  label: "None",
};

function matchesOption(option: RentalRequestOption, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const label = option.label.toLowerCase();
  const sublabel = (option.sublabel ?? "").toLowerCase();
  const phone = (option.phone ?? "").toLowerCase();

  return label.includes(q) || sublabel.includes(q) || phone.includes(q);
}

function useClickOutside(
  ref: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(event: MouseEvent) {
      const el = ref.current;
      if (!el) return;
      if (!el.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
    };
  }, [ref, isOpen, onClose]);
}

function FieldLabel({ label }: { label: string }) {
  return <div className="rentalFormFieldLabel">{label}</div>;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <div className="rentalFormFieldError">{error}</div>;
}

function DropdownMenu({
  options,
  onSelect,
}: {
  options: RentalRequestOption[];
  onSelect: (option: RentalRequestOption) => void;
}) {
  if (options.length === 0) {
    return <div className="rentalFormDropdownEmpty">No results found.</div>;
  }

  return (
    <div style={{ display: "grid" }}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option)}
          className="rentalFormDropdownOption"
        >
          <span className="rentalFormDropdownOptionLabel">{option.label}</span>
          {option.sublabel ? <span className="rentalFormDropdownOptionMeta">{option.sublabel}</span> : null}
          {!option.sublabel && option.phone ? (
            <span className="rentalFormDropdownOptionMeta">{option.phone}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function ManageButton({ onClick, label }: { onClick?: () => void; label: string }) {
  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="rentalFormDropdownManage"
      aria-label={`Manage ${label}`}
      title={`Manage ${label}`}
    >
      ⚙
    </button>
  );
}

export function SearchableDropdown({
  label,
  placeholder,
  options,
  value,
  error,
  disabled = false,
  onChange,
  onManageClick,
}: SearchableDropdownProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  useClickOutside(wrapRef, isOpen, () => setIsOpen(false));

  const optionsWithNone = useMemo(() => [NONE_OPTION, ...options], [options]);

  const visibleOptions = useMemo(() => {
    return optionsWithNone.filter((option) => matchesOption(option, query));
  }, [optionsWithNone, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const displayValue = isOpen ? query : value?.label ?? "";

  return (
    <div style={{ minWidth: 0 }}>
      <FieldLabel label={label} />

      <div ref={wrapRef} className="rentalFormDropdownWrap">
        <div className="rentalFormDropdownControl">
          <input
            value={displayValue}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            className={`rentalFormInput${error ? " rentalFormInputError" : ""}`}
          />

          <div className="rentalFormDropdownButtons">
            <ManageButton onClick={onManageClick} label={label} />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen((v) => !v)}
              className="rentalFormDropdownToggle"
              aria-label={`Toggle ${label}`}
            >
              ▼
            </button>
          </div>
        </div>

        {isOpen ? (
          <div className="rentalFormDropdownMenu">
            <DropdownMenu
              options={visibleOptions}
              onSelect={(option) => {
                if (option.id === NONE_OPTION.id) {
                  onChange(null);
                } else {
                  onChange(option);
                }
                setIsOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>

      <FieldError error={error} />
    </div>
  );
}

export function MultiSelectDropdown({
  label,
  placeholder,
  options,
  values,
  error,
  disabled = false,
  onChange,
  onManageClick,
}: MultiSelectDropdownProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  useClickOutside(wrapRef, isOpen, () => setIsOpen(false));

  const selectedIds = useMemo(() => new Set(values.map((v) => v.id)), [values]);
  const optionsWithNone = useMemo(() => [NONE_OPTION, ...options], [options]);

  const visibleOptions = useMemo(() => {
    return optionsWithNone.filter((option) => matchesOption(option, query));
  }, [optionsWithNone, query]);

  const displayText = values.length === 0 ? "" : `${values.length} selected`;

  function toggleOption(option: RentalRequestOption) {
    if (option.id === NONE_OPTION.id) {
      onChange([]);
      return;
    }

    const exists = values.some((v) => v.id === option.id);
    if (exists) {
      onChange(values.filter((v) => v.id !== option.id));
      return;
    }
    onChange([...values, option]);
  }

  return (
    <div style={{ minWidth: 0 }}>
      <FieldLabel label={label} />

      <div ref={wrapRef} className="rentalFormDropdownWrap">
        <div className="rentalFormDropdownControl">
          <input
            value={isOpen ? query : displayText}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            className={`rentalFormInput${error ? " rentalFormInputError" : ""}`}
          />

          <div className="rentalFormDropdownButtons">
            <ManageButton onClick={onManageClick} label={label} />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen((v) => !v)}
              className="rentalFormDropdownToggle"
              aria-label={`Toggle ${label}`}
            >
              ▼
            </button>
          </div>
        </div>

        {isOpen ? (
          <div className="rentalFormDropdownMenu">
            {visibleOptions.length === 0 ? (
              <div className="rentalFormDropdownEmpty">No results found.</div>
            ) : (
              <div style={{ display: "grid" }}>
                {visibleOptions.map((option) => {
                  const checked = option.id === NONE_OPTION.id ? values.length === 0 : selectedIds.has(option.id);

                  return (
                    <label key={option.id} className="rentalFormMultiOption">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOption(option)}
                        style={{ marginTop: 2 }}
                      />
                      <span style={{ display: "grid", gap: option.sublabel || option.phone ? 3 : 0 }}>
                        <span className="rentalFormDropdownOptionLabel">{option.label}</span>
                        {option.sublabel ? (
                          <span className="rentalFormDropdownOptionMeta">{option.sublabel}</span>
                        ) : null}
                        {!option.sublabel && option.phone ? (
                          <span className="rentalFormDropdownOptionMeta">{option.phone}</span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {values.length > 0 ? (
        <div className="rentalFormPills">
          {values.map((value) => (
            <div key={value.id} className="rentalFormPill">
              <span>{value.label}</span>
              <button
                type="button"
                onClick={() => toggleOption(value)}
                className="rentalFormPillRemove"
                aria-label={`Remove ${value.label}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <FieldError error={error} />
    </div>
  );
}