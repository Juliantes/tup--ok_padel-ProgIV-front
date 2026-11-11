import { AppUserRole } from '../login/auth.service';

export interface AppNavItem {
  labelKey: string;
  path: string;
  analyticsName: string;
  /** Si está definido, el ítem solo se muestra si el usuario tiene al menos uno de estos roles. */
  roles?: AppUserRole[];
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { labelKey: 'NAV.HOME', path: '/home', analyticsName: 'inicio' },
  { labelKey: 'NAV.MATCHES', path: '/matches', analyticsName: 'partidos' },
  { labelKey: 'NAV.PLAYERS', path: '/players', analyticsName: 'jugadores' },
  {
    labelKey: 'NAV.CLUB',
    path: '/club',
    analyticsName: 'mis-canchas',
    roles: ['club_owner'],
  },
  {
    labelKey: 'NAV.COURTS',
    path: '/courts',
    analyticsName: 'courts',
    roles: ['player'],
  },
  { labelKey: 'NAV.CONFIG', path: '/configurations', analyticsName: 'configuracion' },
];

export function navItemsForRoles(userRoles: readonly AppUserRole[]): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (!item.roles?.length) {
      return true;
    }

    return item.roles.some((role) => userRoles.includes(role));
  });
}
