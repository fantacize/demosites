export type RawBusiness = {
  readonly placeId: string;
  readonly name: string;
  readonly address: string;
  readonly phone: string;
  readonly website: string;
  readonly googleMapsUrl: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly category: string;
  readonly location: string;
};

export type ScoredLead = RawBusiness & {
  readonly score: number;
  readonly reason: string;
};
