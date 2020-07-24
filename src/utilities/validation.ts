import validateUrl from 'validator/es/lib/isURL';

export const isValidUrl = (value: string): boolean => {
  return validateUrl(value);
};
