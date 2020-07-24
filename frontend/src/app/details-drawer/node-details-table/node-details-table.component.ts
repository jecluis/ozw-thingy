import { AfterViewInit, Component, OnInit, ViewChild, Input, OnChanges } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable } from '@angular/material/table';
import { NodeDetailsTableDataSource, NodeDetailsByScope, NodeDetailValue } from './node-details-table-datasource';

@Component({
  selector: 'app-node-details-table',
  templateUrl: './node-details-table.component.html',
  styleUrls: ['./node-details-table.component.scss']
})
export class NodeDetailsTableComponent 
    implements AfterViewInit, OnInit, OnChanges {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatTable) table: MatTable<NodeDetailValue>;

  @Input() scope: string
  @Input() node_id: number;

  datasource = new NodeDetailsTableDataSource();

  /** Columns displayed in the table. Columns IDs can be added, removed, or reordered. */
  displayedColumns = ['name', 'value'];

  constructor() { }

  ngOnInit() {
    console.log("init datasource for scope ", this.scope);
    // this.datasource
  }

  ngOnChanges() {
    console.log(1);
    
    this.datasource.loadDetails(this.node_id, this.scope);
  }

  ngAfterViewInit() {
    this.datasource.sort = this.sort;
    this.datasource.paginator = this.paginator;
    this.table.dataSource = this.datasource;
  }
}
