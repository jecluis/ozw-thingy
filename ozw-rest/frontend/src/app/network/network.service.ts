import { Injectable } from '@angular/core';
import { Subscription, interval, of, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';


export enum ControllerState {
  STARTING  = "starting",
  STOPPING  = "stopping",
  RUNNING   = "running",
  STOPPED   = "stopped",

  READY     = "ready",
  AWAKE     = "awake",
  FAILED    = "failed",
  STARTED   = "started",
  RESETTED  = "resetted",
  UNKNOWN   = "unknown"
}

interface ServerStateItem {
  is_running: boolean;
  is_starting: boolean;
  is_stopping: boolean;
  device: string;
}

interface NetworkStateItem {
  is_stopped: boolean;
  is_failed: boolean;
  is_resetted: boolean;
  is_started: boolean
  is_awake: boolean;
  is_ready: boolean;
  state_str: string;
}

interface FullStatusItem {
  server: ServerStateItem;
  network: NetworkStateItem;
}

export interface SimpleStatusItem {
  state: string;
  device: string;
  network_state?: string;
}


@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  state: ControllerState = ControllerState.UNKNOWN;
  status: FullStatusItem;
  server_state: ServerStateItem;
  network_state: NetworkStateItem;

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
    this.http.get<FullStatusItem>('/api/network/status')
      .pipe(
        catchError( (err) => of(undefined))
      )
      .subscribe( status => {
        console.log("got network status: ", status);
        this.setState(status);
        this.state_subject_observer.next(this.get_state());
        this.simplestatus_subject_observer.next({
          state: this.get_state(),
          device: status.server.device,
          network_state: status.network.network_state
        });
      },
      err => {
        console.log("unable to obtain network status")
        this.state = ControllerState.UNKNOWN;
      });
  }

  setState(status: FullStatusItem) {
    let server_state = status.server;
    let network_state = status.network;
    
    this.state = ControllerState.STOPPED;
    if (server_state.is_starting) {
      this.state = ControllerState.STARTING;
    } else if (server_state.is_stopping) {
      this.state = ControllerState.STOPPING;
    } else if (server_state.is_running) {
      this.state = ControllerState.RUNNING;
    }

    if (network_state.is_awake) {
      this.state = ControllerState.AWAKE;
    } else if (network_state.is_failed) {
      this.state = ControllerState.FAILED;
    } else if (network_state.is_ready) {
      this.state = ControllerState.READY;
    } else if (network_state.is_resetted) {
      this.state = ControllerState.RESETTED;
    } else if (network_state.is_started) {
      this.state = ControllerState.STARTED;
    }
    this.status = status;
    this.server_state = server_state;
    this.network_state = network_state;
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

  is_ready() {
    return !!this.network_state && this.network_state.is_ready;
  }

  is_awake() {
    return !!this.network_state && this.network_state.is_awake;
  }

  is_failed() {
    return !!this.network_state && this.network_state.is_failed;
  }

  is_started() {
    return !!this.network_state && this.network_state.is_started;
  }

  start_network() {
    return this.http.put("/api/network/start", true);
  }

  stop_network() {
    return this.http.put("/api/network/stop", true);
  }
}
