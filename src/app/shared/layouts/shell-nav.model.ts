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

export interface ShellNavGroup {
  labelKey: string;
  items: ShellNavItem[];
}
