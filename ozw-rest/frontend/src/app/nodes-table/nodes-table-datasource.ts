import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map, catchError, finalize } from 'rxjs/operators';
import { Observable, of as observableOf, merge, BehaviorSubject } from 'rxjs';
import { TypeScriptEmitter } from '@angular/compiler';
import { HttpClient } from '@angular/common/http';


// TODO: Replace this with your own data model type
export interface NodesTableRawItem {
  node_id: number;
  product_name: string;
  node_type: string;
  state: string;
  proto_stage: string;
  capabilities: {};
}

export interface NodesTableItem {
  id: number;
  product: string;
  type: string;
  state: string;
  capabilities: {};
}

const enum State {
  PROBE = 1,
  READY = 2,
  DEAD = 3,
  OTHER = 4
};

const enum Type {
  SWITCH = 1,
  SHUTTER = 2,
  LIGHT = 3,
  SENSOR = 4,
  OTHER = 5,
  CONTROLLER = 6
};

/**
 * Data source for the NodesTable view. This class should
 * encapsulate all logic for fetching and manipulating the displayed data
 * (including sorting, pagination, and filtering).
 */
export class NodesTableDataSource extends DataSource<NodesTableItem> {
  paginator: MatPaginator;
  sort: MatSort;

  nodes_data: NodesTableItem[] = [];
  private nodesSubject = new BehaviorSubject<NodesTableItem[]>([]);

  constructor(private http: HttpClient) {
    super();
  }

  /**
   * Connect this data source to the table. The table will only update when
   * the returned stream emits new items.
   * @returns A stream of the items to be rendered.
   */
  connect(): Observable<NodesTableItem[]> {
    // Combine everything that affects the rendered data into one update
    // stream for the data-table to consume.
    const dataMutations = [
      this.nodesSubject,
      this.paginator.page,
      this.sort.sortChange
    ];

    return merge(...dataMutations).pipe(map(() => {
      return this.getPagedData(this.getSortedData([...this.nodes_data]));
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
  private getPagedData(data: NodesTableItem[]) {
    const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
    return data.splice(startIndex, this.paginator.pageSize);
  }

  /**
   * Sort the data (client-side). If you're using server-side sorting,
   * this would be replaced by requesting the appropriate data from the server.
   */
  private getSortedData(data: NodesTableItem[]) {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      const isAsc = this.sort.direction === 'asc';
      switch (this.sort.active) {
        case 'type': return compare(+a.type, +b.type, isAsc);
        case 'product': return compare(a.product, b.product, isAsc);
        case 'id': return compare(+a.id, +b.id, isAsc);
        case 'state': return compare(+a.state, +b.state, isAsc);
        default: return 0;
      }
    });
  }


  private _translateRawToItem(items: NodesTableRawItem[]): NodesTableItem[] {

    let translated_items: NodesTableItem[] = [];

    items.forEach(item => {
      let type = item.node_type;
      let state = item.state;
      let product = item.product_name;

      if (type.length == 0) {
        type = "unknown";
      }
      if (product.length == 0) {
        product = "unknown";
      }

      translated_items.push(
        { 
          id: item.node_id, product: product, type: type,
          state: state, capabilities: item.capabilities
        }
      );
    });

    return translated_items;
  }

  _getNodes() {

    let url='';
    let nodes =
      this.http.get<NodesTableRawItem[]>(url+'/api/nodes')
        .pipe(
          catchError( () => merge([]) ),
          finalize( () => console.log("got nodes"))
        )
        .subscribe( nodes => {
          this.nodes_data = this._translateRawToItem(nodes);
          this.nodesSubject.next(this.nodes_data);
          console.log("got nodes: ", nodes);
        });
  }

  loadNodes() {
    this._getNodes();
  }

  clearNodes() {
    this.nodes_data = [];
    this.nodesSubject.next([]);
  }

}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a: string | number, b: string | number, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
