import { Component, OnInit } from '@angular/core';
import { NetworkService, SimpleStatusItem } from 'src/app/network/network.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-settings-dashboard',
  templateUrl: './settings-dashboard.component.html',
  styleUrls: ['./settings-dashboard.component.scss']
})
export class SettingsDashboardComponent implements OnInit {

  network_state: string = "unknown";
  server_state: string = "unknown";
  network_status: SimpleStatusItem = undefined;

  constructor(private network: NetworkService,
              private action_snack: MatSnackBar) {}

  ngOnInit() {
    this.network.get_simplestatus_observer()
      .subscribe( status => {
        console.log("settings > updating network status to ", status);
        if (!!status) {
          this.network_status = status;
          this.network_state = status.network_state;
          this.server_state = status.server_state;
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
          console.log("error starting network: ", err.error.detail);
          this.action_snack.open(
            "error starting network: "+err.error.detail,
            "Gotcha!", { duration: 10000 });
        }
      )      
  }

  stop_network() {
    console.info("stop network")
    this.network.stop_network()
      .subscribe(
        res => {
          console.log("stopped network");
          this.action_snack.open(
            "network is stopping. Please wait...",
            "Thanks!", {duration: 5000}
          );
          this.network.refresh_state();
        },
        err => {
          console.log("error stopping network: ", err.error.detail);
          this.action_snack.open(
            "error stopping network: "+err.error.detail,
            "Gotcha!", { duration: 10000}
          );
        }
      )

  }
}
