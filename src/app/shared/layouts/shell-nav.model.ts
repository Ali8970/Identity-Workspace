export type ShellNavIcon =
  | 'applications'
  | 'members'
  | 'roles'
  | 'permissions'
  | 'teams'
  | 'my-access'
  | 'account';

export interface ShellNavItem {
  route: string;
  labelKey: string;
  icon: ShellNavIcon;
}
