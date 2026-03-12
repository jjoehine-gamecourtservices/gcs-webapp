export type RentalListItem = {
  id: string;
  itemName: string;
  jobName: string;
  jobNumber: string;
  address: string;
  pm: string;
  dateRange: string;
  notes: string;
  status: string;
  equipmentType: string;
  size: string;
  company: string;
  companyCellContact: string;
  drivetrain: string;
  deliveryTime: string;
  deliveryContact: string;
  deliveryCellContact: string;
  budget: string;
  accessories: string;
};

export type RentalsResponse = {
  rentals: RentalListItem[];
  count: number;
};