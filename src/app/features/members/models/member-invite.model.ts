/** The invite dialog's form value, before it is split into per-application role and team grants. */
export interface AddMemberFormValue {
  email: string;
  arabicName: string;
  englishName: string;
  applicationKeys: string[];
  roleIds: string[];
  teamIds: string[];
}
