import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { NodesComponent } from './nodes/nodes.component';
import { SettingsDashboardComponent } from './settings/settings-dashboard/settings-dashboard.component';


const routes: Routes = [
  { path: 'nodes', component: NodesComponent },
  { path: 'settings', component: SettingsDashboardComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
