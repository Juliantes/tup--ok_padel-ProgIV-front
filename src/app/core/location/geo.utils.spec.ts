import { formatDistanceKm, haversineKm } from './geo.utils';

describe('geo.utils', () => {
  it('computes haversine distance between Rosario and Buenos Aires', () => {
    const km = haversineKm(-32.9468, -60.6393, -34.6037, -58.3816);
    expect(km).toBeGreaterThan(250);
    expect(km).toBeLessThan(350);
  });

  it('formats sub-kilometer distances in meters', () => {
    expect(formatDistanceKm(0.4)).toBe('400 m');
  });

  it('formats kilometer distances with one decimal', () => {
    expect(formatDistanceKm(12.34)).toMatch(/12,3 km/);
  });
});
