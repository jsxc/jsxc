import dayjs from 'dayjs';

export const nowMillis = (): number => {
  return dayjs().valueOf();
};

export const isoStringToMillis = (isoString: string): number => {
  return dayjs(isoString).valueOf();
};

export const formatTimestamp = (format: string) => (millis: number): string => {
  return dayjs(millis).format(format);
};
