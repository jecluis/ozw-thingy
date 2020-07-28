import { Injectable } from '@angular/core';
import { Subscription, interval, of, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';


export enum ControllerState {
  STARTING  = "started",
  STOPPING  = "stopping",
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

export interface SimpleStatusItem {
  state: string;
  device: string;
}


@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  state: ControllerState = ControllerState.UNKNOWN;
  status: NetworkStatusItem;
  private state_update_subscription: Subscription;
  private state_subject_observer =
    new BehaviorSubject<ControllerState>(undefined);
  private simplestatus_subject_observer =
    new BehaviorSubject<SimpleStatusItem>(undefined);
  

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
        this.state_subject_observer.next(this.get_state());
        this.simplestatus_subject_observer.next({
          state: this.get_state(),
          device: status.device
        });
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

  get_state(): ControllerState {
    return this.state
  }

  refresh_state() {
    this.obtainNetworkState();
  }

  get_state_observer(): BehaviorSubject<ControllerState> {
    return this.state_subject_observer;
  }

  get_simplestatus_observer() : BehaviorSubject<SimpleStatusItem> {
    return this.simplestatus_subject_observer;
  }

  is_running() {
    return (!!this.status && this.status.is_running);
  }

  start_network() {
    return this.http.put("/api/network/start", true);
  }

  stop_network() {
    return this.http.put("/api/network/stop", true);
  }
}
