import { describe, expect, it } from 'vitest';

import { navItemsForRoles } from './app-navigation';

describe('navItemsForRoles', () => {
  it('always includes home, matches and config', () => {
    const paths = navItemsForRoles([]).map((item) => item.path);
    expect(paths).toEqual(['/home', '/matches', '/players', '/configurations']);
  });

  it('includes club only for club_owner', () => {
    const ownerPaths = navItemsForRoles(['club_owner']).map((item) => item.path);
    expect(ownerPaths).toContain('/club');
    expect(ownerPaths).not.toContain('/courts');

    const playerPaths = navItemsForRoles(['player']).map((item) => item.path);
    expect(playerPaths).toContain('/courts');
    expect(playerPaths).not.toContain('/club');
  });

  it('shows both club and courts when user has both roles', () => {
    const paths = navItemsForRoles(['player', 'club_owner']).map((item) => item.path);
    expect(paths).toContain('/club');
    expect(paths).toContain('/courts');
  });
});
