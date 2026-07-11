// `country-state-city` bundles a 7.7 MB city.json. A static import pulls that
// whole dataset into whatever chunk references it (it was bloating the
// CreateEvent chunk to 8.6 MB). Loading it dynamically splits it into its own
// async chunk that's only fetched when a user actually opens the location
// pickers — the create-event form itself stays small.
export interface GeoOption {
  code: string;
  name: string;
}

// Import once, then reuse the resolved module for every subsequent call.
let cscPromise: Promise<typeof import('country-state-city')> | null = null;
const loadCsc = () => (cscPromise ??= import('country-state-city'));

// India first since most events on this platform are in India, then the rest alphabetically.
export const getCountryOptions = async (): Promise<GeoOption[]> => {
  const { Country } = await loadCsc();
  const all = Country.getAllCountries().map((c) => ({ code: c.isoCode, name: c.name }));
  const india = all.find((c) => c.code === 'IN');
  const rest = all.filter((c) => c.code !== 'IN').sort((a, b) => a.name.localeCompare(b.name));
  return india ? [india, ...rest] : rest;
};

export const getStateOptions = async (countryCode: string): Promise<GeoOption[]> => {
  const { State } = await loadCsc();
  return State.getStatesOfCountry(countryCode)
    .map((s) => ({ code: s.isoCode, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getCityOptions = async (
  countryCode: string,
  stateCode: string
): Promise<GeoOption[]> => {
  const { City } = await loadCsc();
  return City.getCitiesOfState(countryCode, stateCode)
    .map((c) => ({ code: c.name, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getCountryName = async (countryCode: string): Promise<string> => {
  const { Country } = await loadCsc();
  return Country.getCountryByCode(countryCode)?.name ?? countryCode;
};

export const getStateName = async (countryCode: string, stateCode: string): Promise<string> => {
  const { State } = await loadCsc();
  return State.getStateByCodeAndCountry(stateCode, countryCode)?.name ?? stateCode;
};
