/*
* Copyright (c) 2019 Software AG, Darmstadt, Germany and/or its licensors
*
* SPDX-License-Identifier: Apache-2.0
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
 */

import { Component } from "@angular/core";
import {
    ApplicationService,
    IApplication,
    Realtime,
    // PagingStrategy,
    // RealtimeAction,
    UserService
} from "@c8y/client";
import { catchError, map } from "rxjs/operators";
import { from, Observable } from "rxjs";
import { AppStateService, PluginsService } from "@c8y/ngx-components";
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { NewApplicationModalComponent } from "./new-application-modal.component";
import { Router } from "@angular/router";
import { contextPathFromURL } from "../utils/contextPathFromURL";
import { AppListService } from "./app-list.service";
import { NewBlueprintForgeModalComponent } from "./new-blueprint-forge-app-modal.component";

@Component({
    templateUrl: './app-list.component.html'
})
export class AppListComponent {
    //   applications: Observable<IApplication[]>;
    applications: IApplication[] = [];
    allApplications: IApplication[];

    userHasAdminRights: boolean;

    bsModalRef: BsModalRef;
    isBusy = true;
    constructor(private router: Router, private appService: ApplicationService,
        private appStateService: AppStateService, private modalService: BsModalService, private pluginService: PluginsService,
        private userService: UserService, private appListService: AppListService, private realTimeService: Realtime) {
        this.userHasAdminRights = userService.hasRole(appStateService.currentUser.value, "ROLE_APPLICATION_MANAGEMENT_ADMIN")
        this.appListService.refreshAppList$.subscribe(() => {
            this.getListOfApplications();

        });
        this.realTimeService.subscribe(
            `/applications`,
            async (response) => {
                if (response && response.data) {
                    console.log('application realtime', response.data);
                }
            });
        this.getListOfApplications();
    }

    private async getListOfApplications() {

        // Get a list of the applications on the tenant (This includes live updates)
        if (this.userHasAdminRights) {
            this.allApplications = (await this.appService.list({ pageSize: 2000, withTotalPages: true }) as any).data;
            if (!this.allApplications || this.allApplications.length === 0) {
                this.allApplications = (await this.appService.listByUser(this.appStateService.currentUser.value, { pageSize: 2000 })).data;
            }
            this.applications = this.allApplications.filter((app:IApplication)=> app.hasOwnProperty('applicationBuilder') &&  !this.pluginService.isPackage(app));
            this.applications = this.applications.sort((a, b) => a.id > b.id ? 1 : -1);
            this.isBusy = false;
        } else {
            this.allApplications = (await this.appService.listByUser(this.appStateService.currentUser.value, { pageSize: 2000 })).data;
            this.applications = this.allApplications.filter((app:IApplication) => app.hasOwnProperty('applicationBuilder') &&  !this.pluginService.isPackage(app));
            this.applications = this.applications.sort((a, b) => a.id > b.id ? 1 : -1);
            this.isBusy = false;
        }
        /* if(this.userHasAdminRights){
            this.applications = from(new Observable(
                this.appService.list({ pageSize: 2000, withTotalPages: true }) as any))
                .pipe(
                    // Some users can't get the full list of applications (they don't have permission) so we get them by user instead (without live updates)
                    catchError(() =>
                        from(this.appService.listByUser(this.appStateService.currentUser.value, { pageSize: 2000 }).then(res => res.data))
                    ),
                    map((apps: any) => apps.filter(app => app.hasOwnProperty('applicationBuilder'))),
                    map(apps => apps.sort((a, b) => a.id > b.id ? 1 : -1) )
                );
        } else {
            this.applications = from(this.appService.listByUser(this.appStateService.currentUser.value, { pageSize: 2000 }).then(res => res.data))
            .pipe(map(apps => apps.filter(app => app.hasOwnProperty('applicationBuilder'))),
            map(apps => apps.sort((a, b) => a.id > b.id ? 1 : -1) ) );
        } */
    }

    createAppWizard() {
        this.bsModalRef = this.modalService.show(NewApplicationModalComponent, {
            class: 'c8y-wizard', initialState:
                { applications: this.applications, allApplications: this.allApplications }
        });
    }

    deployWithBlueprintForge(app: IApplication) {
        this.bsModalRef = this.modalService.show(NewBlueprintForgeModalComponent, {
            class: 'c8y-wizard', initialState:
                { application: app, allApplications: this.allApplications }
        });
    }

    async deleteApplication(id: number) {
        await this.appService.delete(id);

        // Refresh the applications list
        this.appStateService.currentUser.next(this.appStateService.currentUser.value);
        this.appListService.RefreshAppList();
    }

    openApp(app: IApplication & { applicationBuilder?: any }, subPath?: string) {
        if (app.contextPath && app.contextPath != contextPathFromURL()) {
            window.location = `/apps/${app.contextPath}/#/application/${app.id}${subPath || ''}` as any;
        } else {
            this.router.navigateByUrl(`/application/${app.id}${subPath || ''}`);
        }
    }

    isBlueprintApp(app: IApplication) {
        return (app && app.manifest?.package === 'blueprint');
    }

    // TODO: not used. Alternative available in migration tool
    /* exportApp(app: IApplication) {
        const filename = app.name + '.json';
        const jsonStr = JSON.stringify(app.applicationBuilder);
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } */
}
