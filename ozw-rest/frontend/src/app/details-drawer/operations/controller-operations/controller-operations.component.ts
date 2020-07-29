import { Component, OnInit } from '@angular/core';
import { ControllerService } from '../../../network/controller.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-controller-operations',
  templateUrl: './controller-operations.component.html',
  styleUrls: ['./controller-operations.component.scss']
})
export class ControllerOperationsComponent implements OnInit {

  constructor(
    private controller: ControllerService,
    private action_snack: MatSnackBar
  ) { }

  ngOnInit(): void {
  }


  can_issue_operations(): boolean {
    return this.controller.is_available();
  }

  private _show_unable_to_issue_snack() {
    this.action_snack.open(
      "unable to issue this operation; is the network ready or awake?",
      "Will check!", {duration:5000}
    );
  }

  add_node() {
    this.action_snack.open(
      "this functionality is not yet implemented",
      ":(", {duration:5000}
    );
  }

  remove_node() {
    this.action_snack.open(
      "this functionality is not yet implemented",
      ":(", {duration:5000}
    );    
  }

  heal_network() {

    if (!this.can_issue_operations()) {
      this._show_unable_to_issue_snack();
      return;
    }

    console.log("controller ops > heal network");
    this.controller.heal_network()
      .subscribe(
        res => {
          this.action_snack.open(
            "Network is healing. This might take a long while...",
            "Okay!", {duration: 5000}
          );
        }
      );
  }

  update_neighbors() {
    if (!this.can_issue_operations()) {
      this._show_unable_to_issue_snack();
      return;
    }
    console.log("controller ops > update neighbors");
  }

  refresh_informations() {
    if (!this.can_issue_operations()) {
      this._show_unable_to_issue_snack();
      return;
    }
    console.log("controller ops > refresh informations");
  }

}
