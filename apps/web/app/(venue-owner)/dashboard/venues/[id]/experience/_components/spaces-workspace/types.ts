export type CapacityLayoutRow = {
  id: string;
  space_id: string;
  layout: string;
  custom_layout_label: string | null;
  capacity: number;
  notes: string | null;
  display_order: number;
};

export type SpaceAmenityRow = {
  space_id: string;
  amenity_id: string;
  notes: string | null;
};

export type SpaceEventTypeRow = {
  space_id: string;
  event_type_id: string;
  notes: string | null;
};
