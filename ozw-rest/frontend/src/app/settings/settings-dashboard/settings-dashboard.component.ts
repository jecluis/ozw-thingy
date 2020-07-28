import { Component, OnInit } from '@angular/core';
import { SettingsFormComponent } from '../settings-form/settings-form.component';
import { NetworkService } from 'src/app/network/network.service';

@Component({
  selector: 'app-settings-dashboard',
  templateUrl: './settings-dashboard.component.html',
  styleUrls: ['./settings-dashboard.component.scss']
})
export class SettingsDashboardComponent implements OnInit {

  network_state: string;


  constructor(private network: NetworkService) {}

  ngOnInit() {
    this.network.get_state_observer()
      .subscribe( state => {
        console.log("settings > updating network state to ", state);
        this.network_state = state;
      });
  }
}
