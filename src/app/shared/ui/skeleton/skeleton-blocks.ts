import { Component, computed, input } from '@angular/core';
import { Skeleton, times } from './skeleton';

/** Paragraph placeholder — the last line is short so it reads as prose. */
@Component({
  selector: 'app-skeleton-lines',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-lines' },
  template: `
    @for (line of lines(); track line) {
      <app-skeleton [width]="$last && lines().length > 1 ? lastWidth() : '100%'" />
    }
  `,
})
export class SkeletonLines {
  readonly count = input(3);
  readonly lastWidth = input('60%');

  protected readonly lines = computed(() => times(this.count()));
}

/** `.workspace-panel` shell with a placeholder head; the body is projected. */
@Component({
  selector: 'app-skeleton-panel',
  imports: [Skeleton],
  host: { class: 'ui-skeleton-panel' },
  template: `
    <section class="workspace-panel">
      <header class="workspace-panel__head">
        <app-skeleton variant="title" [width]="titleWidth()" />
        <app-skeleton variant="lead" [width]="leadWidth()" />
      </header>
      <div class="workspace-panel__body">
        <ng-content />
      </div>
    </section>
  `,
})
export class SkeletonPanel {
  readonly titleWidth = input('9rem');
  readonly leadWidth = input('16rem');
}

/** Placeholder table matching `.workspace-table` geometry. */
@Component({
  selector: 'app-skeleton-table',
  imports: [Skeleton],
  template: `
    <div class="workspace-table-wrap">
      <table class="workspace-table ui-skeleton-table">
        <thead>
          <tr>
            @for (column of columnList(); track column) {
              <th scope="col"><app-skeleton variant="text" width="5rem" /></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rowList(); track row) {
            <tr>
              @for (column of columnList(); track column) {
                <td>
                  @if ($first && withAvatar()) {
                    <div class="ui-skeleton-row">
                      <app-skeleton variant="avatar" />
                      <app-skeleton variant="text" width="8rem" />
                    </div>
                  } @else {
                    <app-skeleton variant="text" [width]="cellWidth($index)" />
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class SkeletonTable {
  readonly columns = input(4);
  readonly rows = input(5);
  /** Renders the first cell of each row as avatar + name, like the members list. */
  readonly withAvatar = input(false);

  protected readonly columnList = computed(() => times(this.columns()));
  protected readonly rowList = computed(() => times(this.rows()));

  /** Varying widths keep the placeholder from looking like a spreadsheet. */
  protected cellWidth(columnIndex: number): string {
    return ['9rem', '11rem', '7rem', '6rem', '5rem'][columnIndex % 5];
  }
}
