export interface Clock {
  id: string;
  timezone: string;
}

export interface Clocks {
  clocks: Clock[];
}
