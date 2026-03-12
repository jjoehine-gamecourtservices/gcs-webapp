import React, { useMemo, useState } from "react";
import "../../../../../../styles/rentalform.css";
import { MultiSelectDropdown, SearchableDropdown } from "./RentalRequestDropdowns";
import useRentalRequestSources from "./useRentalRequestSources";
import {
  addAccessory,
  addEquipmentType,
  deleteAccessory,
  deleteEquipmentType,
  updateAccessory,
  updateEquipmentType,
} from "./RentalRequestSources.api";
import { createRentalRequest, invalidateRentalsCache } from "./RentalRequests.api";
import type {
  RentalRequestFormErrors,
  RentalRequestFormState,
  RentalRequestOption,
} from "../../rentalrequest.types";

type ManageModalState =
  | { open: false }
  | { open: true; kind: "equipment" | "accessories" };

function emptyForm(): RentalRequestFormState {
  return {
    job: null,
    people: [],
    dateStart: "",
    dateEnd: "",
    delivery: null,
    equipmentType: null,
    size: null,
    drivetrain: null,
    accessories: [],
    contact: null,
    company: null,
    budget: "",
  };
}

function validateForm(form: RentalRequestFormState): RentalRequestFormErrors {
  const errors: RentalRequestFormErrors = {};

  if (!form.job) errors.job = "Job is required.";
  if (form.people.length === 0) errors.people = "At least one person is required.";
  if (!form.dateStart.trim()) errors.dateStart = "Start date is required.";
  if (!form.dateEnd.trim()) errors.dateEnd = "End date is required.";
  if (!form.delivery) errors.delivery = "Delivery type is required.";
  if (!form.equipmentType) errors.equipmentType = "Equipment type is required.";
  if (!form.contact) errors.contact = "Contact is required.";

  if (form.dateStart && form.dateEnd && form.dateEnd < form.dateStart) {
    errors.dateEnd = "End date cannot be before start date.";
  }

  if (form.budget.trim()) {
    const normalized = form.budget.replace(/[$,\s]/g, "");
    if (normalized && Number.isNaN(Number(normalized))) {
      errors.budget = "Budget must be a valid number.";
    }
  }

  return errors;
}

function FormLabel({ label }: { label: string }) {
  return <div className="rentalFormFieldLabel">{label}</div>;
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <div className="rentalFormFieldError">{error}</div>;
}

function ManageOptionsModal({
  title,
  options,
  loading,
  error,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  options: RentalRequestOption[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onAdd: (label: string) => Promise<void>;
  onEdit: (oldLabel: string, newLabel: string) => Promise<void>;
  onDelete: (label: string) => Promise<void>;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [workingLabel, setWorkingLabel] = useState("");
  const [localError, setLocalError] = useState("");

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) {
      setLocalError("Enter a value to add.");
      return;
    }

    setLocalError("");
    setWorkingLabel(`add:${label}`);
    try {
      await onAdd(label);
      setNewLabel("");
    } catch (e: any) {
      setLocalError(e?.message ? String(e.message) : "Failed to add item");
    } finally {
      setWorkingLabel("");
    }
  }

  async function handleEdit(currentLabel: string) {
    const next = window.prompt(`Edit "${currentLabel}"`, currentLabel);
    if (next === null) return;

    const trimmed = next.trim();
    if (!trimmed) {
      setLocalError("Edited value cannot be empty.");
      return;
    }

    setLocalError("");
    setWorkingLabel(`edit:${currentLabel}`);
    try {
      await onEdit(currentLabel, trimmed);
    } catch (e: any) {
      setLocalError(e?.message ? String(e.message) : "Failed to update item");
    } finally {
      setWorkingLabel("");
    }
  }

  async function handleDelete(currentLabel: string) {
    const ok = window.confirm(`Delete "${currentLabel}"?`);
    if (!ok) return;

    setLocalError("");
    setWorkingLabel(`delete:${currentLabel}`);
    try {
      await onDelete(currentLabel);
    } catch (e: any) {
      setLocalError(e?.message ? String(e.message) : "Failed to delete item");
    } finally {
      setWorkingLabel("");
    }
  }

  return (
    <div className="rentalFormManageOverlay" onClick={onClose}>
      <div className="rentalFormManageModal" onClick={(e) => e.stopPropagation()}>
        <div className="rentalFormManageHeader">
          <div className="rentalFormManageTitle">{title}</div>
          <button type="button" className="rentalFormManageMiniBtn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="rentalFormManageAddRow">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={`Add ${title.toLowerCase()} item...`}
            className="rentalFormInput"
          />
          <button
            type="button"
            className="rentalFormManageMiniBtn"
            onClick={() => {
              void handleAdd();
            }}
            disabled={workingLabel.startsWith("add:")}
          >
            Add
          </button>
        </div>

        {error ? <div className="rentalFormFieldError">{error}</div> : null}
        {localError ? <div className="rentalFormFieldError">{localError}</div> : null}

        <div className="rentalFormManageList">
          {loading ? (
            <div className="rentalFormMessage">Loading...</div>
          ) : options.length === 0 ? (
            <div className="rentalFormMessage">No items yet.</div>
          ) : (
            options.map((option) => (
              <div key={option.id} className="rentalFormManageRow">
                <div className="rentalFormManageName">{option.label}</div>

                <button
                  type="button"
                  className="rentalFormManageMiniBtn"
                  onClick={() => {
                    void handleEdit(option.label);
                  }}
                  disabled={workingLabel === `edit:${option.label}`}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="rentalFormManageMiniBtn"
                  onClick={() => {
                    void handleDelete(option.label);
                  }}
                  disabled={workingLabel === `delete:${option.label}`}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewRentalRequestPage() {
  const [form, setForm] = useState<RentalRequestFormState>(emptyForm);
  const [errors, setErrors] = useState<RentalRequestFormErrors>({});
  const [submitMessage, setSubmitMessage] = useState("");
  const [manageModal, setManageModal] = useState<ManageModalState>({ open: false });
  const [manageError, setManageError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    sources,
    loading,
    refreshing,
    error,
    reload,
    setEquipmentTypes,
    setAccessories,
  } = useRentalRequestSources();

  const itemNamePreview = useMemo(() => {
    const jobName = form.job?.label?.trim() ?? "";
    return jobName ? `Rental - ${jobName} - Not Yet Reserved` : "Rental - [Job Name] - Not Yet Reserved";
  }, [form.job]);

  const addressPreview = useMemo(() => {
    return form.job?.address?.trim() || "-";
  }, [form.job]);

  function updateField<K extends keyof RentalRequestFormState>(key: K, value: RentalRequestFormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => {
      const errorKey = key as keyof RentalRequestFormErrors;
      if (!current[errorKey]) return current;
      return {
        ...current,
        [errorKey]: undefined,
      };
    });

    setSubmitMessage("");
  }

  async function handleRefresh() {
    setSubmitMessage("");
    setManageError("");
    await reload();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setSubmitMessage("");

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!form.job || !form.delivery || !form.equipmentType || !form.contact) {
      setSubmitMessage("Missing required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await createRentalRequest({
        jobId: form.job.id,
        jobName: form.job.label,
        address: form.job.address ?? "",
        peopleIds: form.people.map((person) => person.id),
        dateStart: form.dateStart,
        dateEnd: form.dateEnd,
        delivery: form.delivery.label,
        equipmentType: form.equipmentType.label,
        size: form.size?.label,
        drivetrain: form.drivetrain?.label,
        accessories: form.accessories.map((item) => item.label),
        contactId: form.contact.id,
        companyId: form.company?.id,
        budget: form.budget,
      });

      invalidateRentalsCache();
      setForm(emptyForm());
      setErrors({});
      setSubmitMessage(`Created rental request: ${result.itemName}`);
    } catch (e: any) {
      setSubmitMessage(e?.message ? String(e.message) : "Failed to create rental request");
    } finally {
      setSubmitting(false);
    }
  }

  const dropdownsDisabled = loading || submitting;
  const equipmentOptions = sources.equipmentTypes;
  const accessoryOptions = sources.accessories;

  async function handleAddEquipmentType(label: string) {
    setManageError("");
    const nextOptions = await addEquipmentType(label);
    setEquipmentTypes(nextOptions);
  }

  async function handleEditEquipmentType(oldLabel: string, newLabel: string) {
    setManageError("");
    const nextOptions = await updateEquipmentType(oldLabel, newLabel);
    setEquipmentTypes(nextOptions);

    if (form.equipmentType?.label === oldLabel) {
      const nextSelected = nextOptions.find((x) => x.label === newLabel) ?? null;
      updateField("equipmentType", nextSelected);
    }
  }

  async function handleDeleteEquipmentType(label: string) {
    setManageError("");
    const nextOptions = await deleteEquipmentType(label);
    setEquipmentTypes(nextOptions);

    if (form.equipmentType?.label === label) {
      updateField("equipmentType", null);
    }
  }

  async function handleAddAccessory(label: string) {
    setManageError("");
    const nextOptions = await addAccessory(label);
    setAccessories(nextOptions);
  }

  async function handleEditAccessory(oldLabel: string, newLabel: string) {
    setManageError("");
    const nextOptions = await updateAccessory(oldLabel, newLabel);
    setAccessories(nextOptions);

    const nextAccessories = form.accessories.map((item) => {
      if (item.label !== oldLabel) return item;
      const matched = nextOptions.find((x) => x.label === newLabel);
      return matched ?? { ...item, label: newLabel };
    });

    updateField("accessories", nextAccessories);
  }

  async function handleDeleteAccessory(label: string) {
    setManageError("");
    const nextOptions = await deleteAccessory(label);
    setAccessories(nextOptions);

    const nextAccessories = form.accessories.filter((item) => item.label !== label);
    updateField("accessories", nextAccessories);
  }

  return (
    <>
      <section className="rentalFormPage">
        <div className="rentalFormCard">
          <div className="rentalFormHeader">
            <div className="rentalFormTitle">Rental Request</div>

            <button
              type="button"
              className="dashMiniPill rentalFormRefreshButton"
              onClick={() => {
                void handleRefresh();
              }}
              disabled={refreshing || submitting}
              style={{ cursor: refreshing || submitting ? "wait" : "pointer" }}
            >
              {refreshing ? <span className="rentalFormRefreshSpinner" aria-hidden="true" /> : null}
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="rentalFormBody">
            {error ? <div className="rentalFormFieldError">{error}</div> : null}

            <SearchableDropdown
              label="Job"
              placeholder={loading ? "Loading jobs..." : "Search job..."}
              options={sources.jobs}
              value={form.job}
              error={errors.job}
              disabled={dropdownsDisabled}
              onChange={(next) => updateField("job", next)}
            />

            <div className="rentalFormPreview">
              <div className="rentalFormPreviewTitle">{itemNamePreview}</div>
              <div className="rentalFormPreviewAddress">{addressPreview}</div>
            </div>

            <MultiSelectDropdown
              label="People"
              placeholder={loading ? "Loading people..." : "Search people..."}
              options={sources.people}
              values={form.people}
              error={errors.people}
              disabled={dropdownsDisabled}
              onChange={(next) => updateField("people", next)}
            />

            <div className="rentalFormRow3">
              <div>
                <FormLabel label="Date Start" />
                <input
                  type="date"
                  value={form.dateStart}
                  onChange={(e) => updateField("dateStart", e.target.value)}
                  className={`rentalFormInput rentalFormDateInput${errors.dateStart ? " rentalFormInputError" : ""}`}
                  disabled={submitting}
                />
                <FieldError error={errors.dateStart} />
              </div>

              <div>
                <FormLabel label="Date End" />
                <input
                  type="date"
                  value={form.dateEnd}
                  onChange={(e) => updateField("dateEnd", e.target.value)}
                  className={`rentalFormInput rentalFormDateInput${errors.dateEnd ? " rentalFormInputError" : ""}`}
                  disabled={submitting}
                />
                <FieldError error={errors.dateEnd} />
              </div>

              <SearchableDropdown
                label="Delivery"
                placeholder={loading ? "Loading delivery..." : "Search delivery..."}
                options={sources.deliveryOptions}
                value={form.delivery}
                error={errors.delivery}
                disabled={dropdownsDisabled}
                onChange={(next) => updateField("delivery", next)}
              />
            </div>

            <div className="rentalFormRow2">
              <SearchableDropdown
                label="Equipment Type"
                placeholder={loading ? "Loading equipment..." : "Search equipment..."}
                options={equipmentOptions}
                value={form.equipmentType}
                error={errors.equipmentType}
                disabled={dropdownsDisabled}
                onChange={(next) => updateField("equipmentType", next)}
                onManageClick={() => {
                  setManageError("");
                  setManageModal({ open: true, kind: "equipment" });
                }}
              />

              <SearchableDropdown
                label="Size"
                placeholder={loading ? "Loading size..." : "Search size..."}
                options={sources.sizeOptions}
                value={form.size}
                disabled={dropdownsDisabled}
                onChange={(next) => updateField("size", next)}
              />
            </div>

            <div className="rentalFormRow2">
              <SearchableDropdown
                label="Drivetrain"
                placeholder={loading ? "Loading drivetrain..." : "Search drivetrain..."}
                options={sources.drivetrainOptions}
                value={form.drivetrain}
                disabled={dropdownsDisabled}
                onChange={(next) => updateField("drivetrain", next)}
              />

              <MultiSelectDropdown
                label="Accessories"
                placeholder={loading ? "Loading accessories..." : "Search accessories..."}
                options={accessoryOptions}
                values={form.accessories}
                disabled={dropdownsDisabled}
                onChange={(next) => updateField("accessories", next)}
                onManageClick={() => {
                  setManageError("");
                  setManageModal({ open: true, kind: "accessories" });
                }}
              />
            </div>

            <div className="rentalFormRow2">
              <div>
                <SearchableDropdown
                  label="Contact"
                  placeholder={loading ? "Loading contacts..." : "Search contact..."}
                  options={sources.contacts}
                  value={form.contact}
                  error={errors.contact}
                  disabled={dropdownsDisabled}
                  onChange={(next) => updateField("contact", next)}
                />
                <div className="rentalFormPhonePreview">{form.contact?.phone ?? ""}</div>
              </div>

              <div>
                <SearchableDropdown
                  label="Company"
                  placeholder={loading ? "Loading companies..." : "Search company..."}
                  options={sources.companies}
                  value={form.company}
                  disabled={dropdownsDisabled}
                  onChange={(next) => updateField("company", next)}
                />
                <div className="rentalFormPhonePreview">{form.company?.phone ?? ""}</div>
              </div>
            </div>

            <div className="rentalFormBudgetWrap">
              <FormLabel label="Budget" />
              <input
                type="text"
                value={form.budget}
                onChange={(e) => updateField("budget", e.target.value)}
                placeholder="$0.00"
                className={`rentalFormInput${errors.budget ? " rentalFormInputError" : ""}`}
                disabled={submitting}
              />
              <FieldError error={errors.budget} />
            </div>

            <div className="rentalFormActions">
              <button
                type="submit"
                className="dashBtn"
                disabled={submitting}
                style={{
                  color: "rgba(255,255,255,0.92)",
                  minWidth: 160,
                  cursor: submitting ? "wait" : "pointer",
                }}
              >
                {submitting ? "Creating..." : "Create Request"}
              </button>
            </div>

            {submitMessage ? <div className="rentalFormMessage">{submitMessage}</div> : null}
          </form>
        </div>
      </section>

      {manageModal.open ? (
        manageModal.kind === "equipment" ? (
          <ManageOptionsModal
            title="Manage Equipment Types"
            options={equipmentOptions}
            loading={false}
            error={manageError}
            onClose={() => setManageModal({ open: false })}
            onAdd={handleAddEquipmentType}
            onEdit={handleEditEquipmentType}
            onDelete={handleDeleteEquipmentType}
          />
        ) : (
          <ManageOptionsModal
            title="Manage Accessories"
            options={accessoryOptions}
            loading={false}
            error={manageError}
            onClose={() => setManageModal({ open: false })}
            onAdd={handleAddAccessory}
            onEdit={handleEditAccessory}
            onDelete={handleDeleteAccessory}
          />
        )
      ) : null}
    </>
  );
}