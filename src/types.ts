export type ActivationZone = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdAt: string;
  updatedAt: string;
};

export type LoyaltyCard = {
  id: string;
  name: string;
  loyaltyNumber: string;
  logoDataUrl?: string;
  accentColor?: string;
  note?: string;
  activationZones?: ActivationZone[];
  createdAt: string;
  updatedAt: string;
};

export type LoyaltyCardInput = {
  name: string;
  loyaltyNumber: string;
  logoDataUrl?: string;
  accentColor?: string;
  note?: string;
};
