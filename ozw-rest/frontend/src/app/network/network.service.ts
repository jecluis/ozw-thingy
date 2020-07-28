import { Injectable } from '@angular/core';
import { Subscription, interval, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';


export enum ControllerState {
  STARTING  = "started",
  STOPPING  = "stopped",
  RUNNING   = "running",
  STOPPED   = "stopped",
  UNKNOWN   = "unknown"
}

interface NetworkStatusItem {
  is_running: boolean;
  is_starting: boolean;
  is_stopping: boolean;
  device: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  state: ControllerState = ControllerState.UNKNOWN;
  status: NetworkStatusItem;
  private state_update_subscription: Subscription;

  constructor(private http: HttpClient) {
    this.state_update_subscription = interval(30000).subscribe(
      (val) => { this.obtainNetworkState(); }
    )
    this.obtainNetworkState()
  }


  private obtainNetworkState() {
    console.log("obtaining network state");
    this.http.get<NetworkStatusItem>('/api/network/status')
      .pipe(
        catchError( (err) => of(undefined))
      )
      .subscribe( status => {
        console.log("got network status: ", status);
        this.setNetworkState(status);
      },
      err => {
        console.log("unable to obtain network status")
        this.state = ControllerState.UNKNOWN;
      });
  }

  setNetworkState(status: NetworkStatusItem) {
    this.status = status;
    if (status.is_starting) {
      this.state = ControllerState.STARTING;
    } else if (status.is_stopping) {
      this.state = ControllerState.STOPPING;
    } else if (status.is_running) {
      this.state = ControllerState.RUNNING;
    } else {
      this.state = ControllerState.STOPPED;
    }
  }

  getState(): ControllerState {
    return this.state
  }
}
