export type RentalRequestOption = {
  id: string;
  label: string;
  sublabel?: string;
  phone?: string;
  address?: string;
};

export type RentalRequestFormState = {
  job: RentalRequestOption | null;
  people: RentalRequestOption[];
  dateStart: string;
  dateEnd: string;
  delivery: RentalRequestOption | null;
  equipmentType: RentalRequestOption | null;
  size: RentalRequestOption | null;
  drivetrain: RentalRequestOption | null;
  accessories: RentalRequestOption[];
  contact: RentalRequestOption | null;
  company: RentalRequestOption | null;
  budget: string;
};

export type RentalRequestFormErrors = {
  job?: string;
  people?: string;
  dateStart?: string;
  dateEnd?: string;
  delivery?: string;
  equipmentType?: string;
  contact?: string;
  budget?: string;
};

export type SearchableDropdownProps = {
  label: string;
  placeholder: string;
  options: RentalRequestOption[];
  value: RentalRequestOption | null;
  error?: string;
  disabled?: boolean;
  onChange: (next: RentalRequestOption | null) => void;
  onManageClick?: () => void;
};

export type MultiSelectDropdownProps = {
  label: string;
  placeholder: string;
  options: RentalRequestOption[];
  values: RentalRequestOption[];
  error?: string;
  disabled?: boolean;
  onChange: (next: RentalRequestOption[]) => void;
  onManageClick?: () => void;
};