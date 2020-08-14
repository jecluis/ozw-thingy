import { DataSource } from '@angular/cdk/collections';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map, catchError, finalize } from 'rxjs/operators';
import { Observable, of as observableOf, merge, BehaviorSubject } from 'rxjs';
import { TypeScriptEmitter } from '@angular/compiler';
import { HttpClient } from '@angular/common/http';


export interface NodeInfoItem {
    manufacturer: string;
    manufacturerid: string;
    product: string;
    producttype: string;
    productid: string;
    type: string;
    name: string;
    loc: string;
}

export enum NodeItemState {
    Nop = 2,
    NodeAwake = 3,
    NodeSleep = 4,
    NodeDead = 5,
    NodeAlive = 6
}

export interface NodeItemCaps {
    is_listening: boolean;
    is_routing: boolean;
    is_beaming: boolean;
    is_controller: boolean;
    is_primary_controller: boolean;
}

export interface NodesTableRawItem {
    id: number;
    info: NodeInfoItem;
    state: NodeItemState;
    ready: boolean;
    caps: NodeItemCaps;
    class: NodeClassItem;
    last_seen?: string;
}


export interface NodeControllerCapsRawItem {
  is_primary: boolean;
  is_bridge: boolean;
  is_static_updater: boolean;
}

export interface NodeClassItem {
    is_meter: boolean;
    is_switch: boolean;
}

export interface NodesTableItem {
  id: number;
  product: string;
  type: string;
  state: string;
  capabilities: {};
  is_controller: boolean;
  controller_caps?: {};
  class: NodeClassItem;
  last_seen?: string;
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

    function _translateState(state: NodeItemState): string {
        console.log(`state: ${state}`);
        switch (state) {
            case NodeItemState.NodeAlive:
                return "ready";
            case NodeItemState.NodeAwake:
                return "awake";
            case NodeItemState.NodeDead:
                return "failed";
            case NodeItemState.NodeSleep:
            default:
                return "sleeping";
        }
    }

    let translated_items: NodesTableItem[] = [];

    items.forEach(item => {
      let type = item.info.type;
      let state = _translateState(item.state);
      let product = item.info.product;
      let is_controller = item.caps.is_controller;
      let controller_caps = {};

      if (type.length == 0) {
        type = "unknown";
      }
      if (product.length == 0) {
        product = "unknown";
      }

      let translated_item: NodesTableItem = { 
        id: item.id, product: product, type: type,
        state: state, capabilities: item.caps,
        class: item.class,
        is_controller: is_controller
      };
      if (translated_item.is_controller) {
        console.log("item is controller: ", translated_item);
        let ctrl_caps: NodeControllerCapsRawItem = {
            is_primary: item.caps.is_primary_controller,
            is_bridge: false,
            is_static_updater: false
        };
          //item.capabilities['controller'];
        console.log("controller caps: ", ctrl_caps);
        translated_item.controller_caps = ctrl_caps;        
      }
      let last_seen = (!!item.last_seen ? item.last_seen : "");
      translated_item.last_seen = new Date(last_seen).toUTCString();
      console.log("translated item: ", translated_item);
      translated_items.push(translated_item);
    });

    return translated_items;
  }

  _getNodes() {

    let nodes =
      this.http.get<NodesTableRawItem[]>('/api/nodes')
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
