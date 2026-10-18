import { describe, expect, it } from 'vitest';
import {
  permissionActionLabel,
  permissionDisplayLabel,
  permissionScopeLabel,
  type PermissionLabelSource,
} from './permission-label';

function language(
  dict: Record<string, string> = {},
  lang: 'en' | 'ar' = 'en',
): PermissionLabelSource {
  return {
    pick: (ar, en) => (lang === 'ar' ? ar || en || '' : en || ar || ''),
    labelOr: (key, fallback) => (Object.hasOwn(dict, key) ? dict[key] : fallback),
  };
}

const catalogue: Record<string, string> = {
  'roles.perm.action.manage': 'Manage',
  'roles.perm.action.view': 'View',
  'roles.perm.action.all': 'All records',
  'roles.perm.action.read': 'Read',
  'permissions.groups.leads': 'Leads',
  'permissions.groups.roles': 'Roles',
  'permissions.groups.activities': 'Activities',
};

describe('permissionDisplayLabel', () => {
  const labels = language(catalogue);

  it('uses a catalogue name that is real copy', () => {
    expect(
      permissionDisplayLabel(labels, 'crm.leads.edit', {
        nameAr: 'تعديل العملاء المحتملين',
        nameEn: 'Edit leads',
      }),
    ).toBe('Edit leads');
  });

  it('does not treat a permission code stored as the name as copy', () => {
    expect(
      permissionDisplayLabel(labels, 'crm.leads.manage', {
        nameAr: 'crm.leads.manage',
        nameEn: 'crm.leads.manage',
        resource: 'leads',
        action: 'manage',
      }),
    ).toBe('Manage — Leads');
  });

  it('composes a label from a bare key', () => {
    expect(permissionDisplayLabel(labels, 'crm.leads.view.all')).toBe(
      'View · All records — Leads',
    );
    expect(permissionDisplayLabel(labels, 'identity.roles.read')).toBe('Read — Roles');
    expect(permissionDisplayLabel(labels, 'activity.activities.manage')).toBe(
      'Manage — Activities',
    );
  });

  it('humanizes tokens that have no catalogue entry', () => {
    expect(permissionDisplayLabel(labels, 'crm.nurturePool.watchReport')).toBe(
      'Watch report — Nurture pool',
    );
  });

  it('follows the active language for catalogue names', () => {
    expect(
      permissionDisplayLabel(language(catalogue, 'ar'), 'crm.leads.edit', {
        nameAr: 'تعديل العملاء المحتملين',
        nameEn: 'Edit leads',
      }),
    ).toBe('تعديل العملاء المحتملين');
  });

  it('translates action segments from the group catalogue when the action map has no entry', () => {
    const arabic = language(
      {
        'roles.perm.action.manage': 'إدارة',
        'roles.perm.action.edit': 'تعديل',
        'roles.perm.action.stage': 'المرحلة',
        'permissions.groups.units': 'الوحدات',
        'permissions.groups.certificates': 'الشهادات',
        'permissions.groups.filestorage': 'تخزين الملفات',
      },
      'ar',
    );

    expect(permissionActionLabel(arabic, 'crm.projects.manage.units')).toBe('إدارة · الوحدات');
    expect(permissionActionLabel(arabic, 'crm.projects.certificates')).toBe('الشهادات');
    expect(permissionActionLabel(arabic, 'crm.opportunities.edit.stage')).toBe('تعديل · المرحلة');
    expect(permissionScopeLabel(arabic, 'filestorage')).toBe('تخزين الملفات');
  });
});
