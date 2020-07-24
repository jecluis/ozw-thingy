import { Component, OnInit, OnChanges, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import { NodeDetailsTableComponent } from '../node-details-table/node-details-table.component';

export interface NodeDetailsTab {

  label: string;
  content: string;

}

@Component({
  selector: 'app-node-details-tab',
  templateUrl: './node-details-tab.component.html',
  styleUrls: ['./node-details-tab.component.scss']
})
export class NodeDetailsTabComponent implements OnInit, OnChanges {

  detailTabs: NodeDetailsTab[];
  @Input() node_id: number;
  @Input() node_type: string;
  @Output() close_details = new EventEmitter<boolean>();

  constructor() { }


  ngOnInit(): void {
    console.log("show details for node "+this.node_id);
  }
  
  ngOnChanges() {
    this.detailTabs =[
          { label: 'first', content: 'content 1 for node '+this.node_id },
          { label: 'second', content: 'content 2' },
          { label: 'third', content: 'content 3'}
        ];
  }

  closeDetails() {
    console.log("close details tabs");
    this.close_details.emit(true);
  }

}
