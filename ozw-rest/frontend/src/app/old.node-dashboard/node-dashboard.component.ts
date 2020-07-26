import { Component, ViewChild } from '@angular/core';
import { Observable, Observer, BehaviorSubject } from 'rxjs';
import { NodesTableComponent } from '../nodes-table/nodes-table.component';
import { NodesTableItem } from '../nodes-table/nodes-table-datasource';
import { NodeDetailsTabComponent, NodeDetailsTab } from '../node-details-tab/node-details-tab.component';
import { trigger, transition, style, animate, state } from '@angular/animations';

export interface DashboardCard {
  id: number;
  title: string;
  cols: number;
  rows: number;
  hidden: boolean;
}


@Component({
  selector: 'app-node-dashboard',
  templateUrl: './node-dashboard.component.html',
  styleUrls: ['./node-dashboard.component.scss'],
})
export class NodeDashboardComponent {
  @ViewChild(NodesTableComponent) nodes_table: NodesTableComponent;
  @ViewChild(NodeDetailsTabComponent) node_details_tabs: NodeDetailsTab;

  /** Based on the screen size, switch from standard to one column per row */

  node_table_tile: DashboardCard = {
    id: 1, title: 'Nodes', cols: 4, rows: 2, hidden: false
  };
  node_details_tile: DashboardCard = {
    id: 2, title: 'Node Details', cols: 0, rows: 2, hidden: false
  };

  card_lst: DashboardCard[] = [
    this.node_table_tile, this.node_details_tile
  ];
  cards: Observable<DashboardCard[]>;

  //show_node_details: boolean = false;
  show_node_details: boolean;
  show_node_details_id: number;
  ngOnInit(): void {
    this.cards = new Observable((observer: Observer<DashboardCard[]>) => {
      setTimeout( () => {
        observer.next(this.card_lst);
      }, 1000);
    });
    this.show_node_details = false;
  }

  saySomething() {
    console.log("something?");
  }

  toggle_node_details(event: NodesTableItem) {
    console.log("caught an event: ", event);
    console.log("node id: ", event.id);
    if (this.show_node_details_id === event.id) {
      this.close_node_details(true);
      return;
    }

    this.show_node_details_id = event.id;
    this.node_details_tile.cols = 1;
    this.node_table_tile.cols = 3;
    this.show_node_details = true;
  }

  close_node_details(event: boolean) {
    console.log("hide details for node");
    this.show_node_details = false;
    this.show_node_details_id = null;
    this.node_table_tile.cols = 4;
    this.node_details_tile.cols = 0;
  }

  //constructor(private breakpointObserver: BreakpointObserver) {}
  constructor() { }

  
}
