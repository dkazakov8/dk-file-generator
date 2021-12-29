export function getTimeDelta(date1: number, date2: number) {
  const TIMING_PRECISION = 2;
  const MS_IN_SECOND = 1000;

  return ((date2 - date1) / MS_IN_SECOND).toFixed(TIMING_PRECISION);
}
