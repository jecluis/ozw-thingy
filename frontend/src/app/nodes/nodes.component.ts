import { Component, ViewChild } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Observer } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { NodesTableComponent } from '../nodes-table/nodes-table.component';
import { NodesTableItem } from '../nodes-table/nodes-table-datasource';

@Component({
  selector: 'app-nodes',
  templateUrl: './nodes.component.html',
  styleUrls: ['./nodes.component.scss']
})
export class NodesComponent {

  @ViewChild(NodesTableComponent) nodes_table: NodesTableComponent;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  is_drawer_open: boolean = false;
  show_details_node_id: number;
  show_details_node_type: string;

  close_drawer() {
    console.log("close node details drawer");
    console.log("  state > open: ", this.is_drawer_open,
                ", details node: ", this.show_details_node_id);
    this.is_drawer_open = false;
    this.show_details_node_id = -1;
  }

  open_node_details(event: NodesTableItem) {
    console.log("open node details drawer > id = " + event.id)
    console.log("  state > open: ", this.is_drawer_open,
                ", details node: ", this.show_details_node_id);

    let node_id: number = event.id;
    this.is_drawer_open = true;
    this.show_details_node_id = node_id;
    this.show_details_node_type = event.type;
  }

  constructor(private breakpointObserver: BreakpointObserver) {}

}
