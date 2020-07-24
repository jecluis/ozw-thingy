import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map } from 'rxjs/operators';
import { Observable, of as observableOf, merge, BehaviorSubject } from 'rxjs';
import { TypeScriptEmitter } from '@angular/compiler';


// TODO: Replace this with your own data model type
export interface NodesTableRawItem {
  id: number;
  product: string;
  type: number;
  state: number;
  features: [];
}

export interface NodesTableItem {
  id: number;
  product: string;
  type: string;
  state: string;
  features: [];
  details: string;
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

  constructor() {
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
      let state = '';
      let type = '';

      switch (item.type) {
        case Type.CONTROLLER: type = 'controller'; break;
        case Type.LIGHT: type = 'light'; break;
        case Type.SENSOR: type = 'sensor'; break;
        case Type.SHUTTER: type = 'shutter'; break;
        case Type.SWITCH: type = 'switch'; break;
        case Type.OTHER: type = 'other'; break;
        default: type = 'unknown';
      }

      switch (item.state) {
        case State.PROBE: state = 'probe'; break;
        case State.READY: state = 'ready'; break;
        case State.DEAD: state = 'dead'; break;
        case State.OTHER: state = 'other'; break;
        default: state = 'unknown';
      }

      translated_items.push(
        { id: item.id, product: item.product, type: type, state: state, features: item.features, details: "just some random details :)"}
      );
    });

    return translated_items;
  }

  _getNodes(): NodesTableItem[] {


    let _products: NodesTableRawItem[] = [
      { id: 1, product: 'fibaro z-stick',
        type: Type.CONTROLLER, state: State.OTHER, features: [] },
      { id: 2, product: 'aeotec smart switch 6',
        type: Type.SWITCH, state: State.OTHER, features: [] },
      { id: 3, product: 'aeotec smart switch 7',
        type: Type.SWITCH, state: State.OTHER, features: [] },
      { id: 4, product: 'aeotec range extender 7',
        type: Type.OTHER, state: State.OTHER, features: [] },
      { id: 5, product: 'qubino temperature sensor',
        type: Type.SENSOR, state: State.OTHER, features: [] },
      { id: 6, product: 'qubino roller shutter',
        type: Type.SHUTTER, state: State.OTHER, features: [] },
      { id: 7, product: 'fibaro temperature sensor',
        type: Type.SENSOR, state: State.OTHER, features: [] }
    ];

    _products.forEach(entry => {
      let n = Math.floor(Math.random()*3) + 1;
      entry.state = n;
    });
    
    return this._translateRawToItem(_products);
  }

  loadNodes() {
    this.nodes_data = this._getNodes();
    this.nodesSubject.next(this.nodes_data);
  }

}

/** Simple sort comparator for example ID/Name columns (for client-side sorting). */
function compare(a: string | number, b: string | number, isAsc: boolean) {
  return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}
