import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ACCESS_ENDPOINTS } from '../constants/access.endpoints';
import {
  AddMemberRequest,
  AddMemberResult,
  MemberListFilters,
  MemberListItem,
  MemberRolesDto,
  ResendActivationResult,
} from '../models/access.model';
import { unwrapData } from '@core/http/unwrap';
import { toParams } from '@core/http/http-params';
import { ApiResponse } from '@shared/models/api-response.model';

/**
 * People inside the CURRENT company. The company is taken from the session,
 * never from the URL — these routes carry no tenantId.
 */
@Service()
export class MembersApi {
  private readonly http = inject(HttpClient);

  list(filters: MemberListFilters = {}): Observable<MemberListItem[]> {
    return this.http
      .get<ApiResponse<MemberListItem[]>>(ACCESS_ENDPOINTS.memberships, {
        withCredentials: true,
        params: toParams({ search: filters.search, status: filters.status }),
      })
      .pipe(unwrapData());
  }

  /** 201 on success. Creates the account when the email is new, else reuses it. */
  add(request: AddMemberRequest): Observable<AddMemberResult> {
    return this.http
      .post<ApiResponse<AddMemberResult>>(ACCESS_ENDPOINTS.memberships, request, {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  /** Replaces the member's whole role set; at least one role is required. */
  updateRoles(tenantMembershipId: string, roleIds: string[]): Observable<MemberRolesDto> {
    return this.http
      .put<ApiResponse<MemberRolesDto>>(
        ACCESS_ENDPOINTS.membershipRoles(tenantMembershipId),
        { roleIds },
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }

  roles(tenantMembershipId: string): Observable<MemberRolesDto> {
    return this.http
      .get<ApiResponse<MemberRolesDto>>(ACCESS_ENDPOINTS.membershipRoles(tenantMembershipId), {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  get(tenantMembershipId: string): Observable<MemberListItem> {
    return this.http
      .get<ApiResponse<MemberListItem>>(ACCESS_ENDPOINTS.membership(tenantMembershipId), {
        withCredentials: true,
      })
      .pipe(unwrapData());
  }

  remove(tenantMembershipId: string): Observable<void> {
    return this.http
      .delete<ApiResponse<unknown>>(ACCESS_ENDPOINTS.membership(tenantMembershipId), {
        withCredentials: true,
      })
      .pipe(map(() => undefined));
  }

  resendActivation(tenantMembershipId: string): Observable<ResendActivationResult> {
    return this.http
      .post<ApiResponse<ResendActivationResult>>(
        ACCESS_ENDPOINTS.membershipResendActivation(tenantMembershipId),
        {},
        { withCredentials: true },
      )
      .pipe(unwrapData());
  }
}
