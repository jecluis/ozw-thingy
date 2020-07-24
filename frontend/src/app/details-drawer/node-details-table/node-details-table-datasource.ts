import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map } from 'rxjs/operators';
import { Observable, of as observableOf, merge, BehaviorSubject } from 'rxjs';


export interface NodeDetailValue {
  name: string;
  value: string;
}

export interface NodeDetailsByScope {

  scope: string;
  scope_id: number;
  values: NodeDetailValue[];
}


/**
 * Data source for the NodeDetailsTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class NodeDetailsTableDataSource
        extends DataSource<NodeDetailValue> {

  paginator: MatPaginator;
  sort: MatSort;

  node_details: NodeDetailsByScope;
  private node_details_subject =
        new BehaviorSubject<NodeDetailsByScope>(undefined);

  constructor() {
    super();
  }

  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<NodeDetailValue[]> {
    // Combine everything that affects the rendered data into one update
    // stream for the data-table to consume.
    const dataMutations = [
      this.node_details_subject,
      this.paginator.page,
      this.sort.sortChange
    ];

    return merge(...dataMutations).pipe(map(() => {
      return this.getPagedData(this.getSortedData([...this.node_details.values]));
    }));
  }

  /**
   *  Called when the table is being destroyed. Use this function, to clean up
   * any open connections or free any held resources that were set up during connect.
   */
  disconnect() {}

  /**
   * Paginate the data (client-side). If you're using server-side pagination,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getPagedData(data: NodeDetailValue[]) {
    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    return data.splice(startIndex, this.paginator.pageSize);
  }

  /**
   * Sort the data (client-side). If you're using server-side sorting,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getSortedData(data: NodeDetailValue[]) {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort.direction === 'asc';
      switch (this.sort.active) {
        case 'name': return compare(a.name, b.name, isAsc);
        default: return 0;
      }
    });
  }


  // grab data from server
  private _getDetails(node_id:number, scope: string): NodeDetailsByScope {

    let _details_config = [
      { name: "node id", value: ""+node_id },
      { name: "config_foo", value: "123" },
      { name: "config_bar", value: "234" }
    ];

    let _details_user = [
      { name: "user_foo", value: ""+Math.floor(Math.random()*3) },
      { name: "user_bar", value: "sdfsdf" }
    ];

    let _details_system: NodeDetailValue[] = [
      { name: "listener", value: "true" },
      { name: "beamer", value: "true" }
    ];

    let _scopes: { [key: string]: NodeDetailsByScope} = {
      'config': {
        scope: 'config',
        scope_id: 1,
        values: _details_config
      },
      'user': {
        scope: 'user',
        scope_id: 2,
        values: _details_user
      },
      'system': {
        scope: 'system',
        scope_id: 3,
        values: _details_system
      }
    };

    if (scope != 'config' && scope != 'user' && scope != 'system') {
      console.error('unrecognized scope ' + scope);
      return null;
    }

    let ret: NodeDetailsByScope = _scopes[scope] as NodeDetailsByScope;
    return ret;
  }

  loadDetails(node_id: number, scope: string) {
    this.node_details = this._getDetails(node_id, scope);
    this.node_details_subject.next(this.node_details);
  }
}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a: string | number, b: string | number, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
