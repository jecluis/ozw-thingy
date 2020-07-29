import { Injectable } from '@angular/core';
import { NetworkService } from './network.service';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ControllerService {

  constructor(
    private network: NetworkService,
    private http: HttpClient
  ) { }

  is_available(): boolean {
    return this.network.is_awake() || this.network.is_ready();
  }


  add_node() {
    console.log("controller > add node");
  }

  remove_node() {
    console.log("controller > remove node");
  }

  heal_network() {
    console.log("controller > heal network");
    return this.http.put("/api/controller/heal", true);
  }

  update_neighbors() {
    console.log("controller > update neighbors");
    return this.http.put("/api/controller/neighbors/update", true);
  }

  refresh_information() {
    console.log("controller > refresh info");
    return this.http.put("/api/controller/refresh", true);
  }

}
