import { AfterViewInit, Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { NodesTableDataSource, NodesTableItem } from './nodes-table-datasource';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { HttpClient } from '@angular/common/http';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-nodes-table',
  templateUrl: './nodes-table.component.html',
  styleUrls: ['./nodes-table.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed',
          animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ])
  ]
})
export class NodesTableComponent implements AfterViewInit, OnInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<NodesTableItem>;
  dataSource: NodesTableDataSource;

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['id', 'product', 'type', 'state', 'capabilities'];
  expandedNode: NodesTableItem | null;

  @Output() selected_node = new EventEmitter<NodesTableItem>();

  private data_update_subscription: Subscription;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.dataSource = new NodesTableDataSource(this.http);
    this.dataSource.loadNodes();

    this.data_update_subscription = interval(10000).subscribe(
      (val) => { this.dataSource.loadNodes(); }
    );
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.table.dataSource = this.dataSource;
  }

  details_n = 0;
  show_details = false;
  toggle_details(node: NodesTableItem) {
    console.log("toggle details for node: ", node);
    this.selected_node.next(node);
  }
}
