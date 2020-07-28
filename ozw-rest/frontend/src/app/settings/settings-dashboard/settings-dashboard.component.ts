import { Component, OnInit } from '@angular/core';
import { SettingsFormComponent } from '../settings-form/settings-form.component';
import { NetworkService, SimpleStatusItem } from 'src/app/network/network.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-settings-dashboard',
  templateUrl: './settings-dashboard.component.html',
  styleUrls: ['./settings-dashboard.component.scss']
})
export class SettingsDashboardComponent implements OnInit {

  network_state: string = "unknown";
  network_status: SimpleStatusItem = undefined;

  constructor(private network: NetworkService,
              private action_snack: MatSnackBar) {}

  ngOnInit() {
    this.network.get_simplestatus_observer()
      .subscribe( status => {
        console.log("settings > updating network status to ", status);
        if (!!status) {
          this.network_status = status;
          this.network_state = status.state;
        }
      });
  }

  start_network() {
    console.info("start network")
    this.network.start_network()
      .subscribe(
        res => {
          console.log("started network");
          this.action_snack.open(
            "network is starting. Please wait...",
            "Thanks!", {duration: 5000}
          );
          this.network.refresh_state();
        },
        err => {
          this.action_snack.open(
            "error starting network: "+err.error.detail,
            "Gotcha!", { duration: 10000 });
          console.log("error starting network: ", err.error.detail);
        }
      )      
  }

  stop_network() {
    console.info("stop network")

  }
}
