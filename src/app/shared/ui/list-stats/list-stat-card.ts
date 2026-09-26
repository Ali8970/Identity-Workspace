/** Display model for one KPI on a list page. Built in the page from loaded data. */
export interface ListStatCard {
  readonly label: string;
  readonly value: string | number;
  readonly accent: string;
  readonly icon?: 'total' | 'active' | 'warning' | 'info' | 'users' | 'pack' | 'apps' | 'values';
  readonly valueTone?: 'default' | 'danger';
}
