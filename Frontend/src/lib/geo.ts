import { Country, State, City } from 'country-state-city';

export interface GeoOption {
  code: string;
  name: string;
}

// India first since most events on this platform are in India, then the rest alphabetically.
export const getCountryOptions = (): GeoOption[] => {
  const all = Country.getAllCountries().map((c) => ({ code: c.isoCode, name: c.name }));
  const india = all.find((c) => c.code === 'IN');
  const rest = all.filter((c) => c.code !== 'IN').sort((a, b) => a.name.localeCompare(b.name));
  return india ? [india, ...rest] : rest;
};

export const getStateOptions = (countryCode: string): GeoOption[] =>
  State.getStatesOfCountry(countryCode)
    .map((s) => ({ code: s.isoCode, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

export const getCityOptions = (countryCode: string, stateCode: string): GeoOption[] =>
  City.getCitiesOfState(countryCode, stateCode)
    .map((c) => ({ code: c.name, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

export const getCountryName = (countryCode: string): string =>
  Country.getCountryByCode(countryCode)?.name ?? countryCode;

export const getStateName = (countryCode: string, stateCode: string): string =>
  State.getStateByCodeAndCountry(stateCode, countryCode)?.name ?? stateCode;
