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

import {Component, isDevMode, OnInit} from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import {ApplicationService, ApplicationAvailability, ApplicationType, FetchClient, InventoryService, IApplication} from '@c8y/client';
import {AlertService, AppStateService} from "@c8y/ngx-components";
import {UpdateableAlert} from "../utils/UpdateableAlert";
import {contextPathFromURL} from "../utils/contextPathFromURL";
import { Observable } from 'rxjs';

@Component({
    template: `
    <div class="modal-header text-center bg-primary">
        <div style="font-size: 62px;">
            <span c8yIcon="c8y-modules"></span>
        </div>
        <h4 class="text-uppercase" style="margin:0; letter-spacing: 0.15em;">Add application</h4>
    </div>
    <div class="modal-body c8y-wizard-form">
        <form name="newAppBuilderAppForm" #newAppBuilderAppForm="ngForm" class="c8y-wizard-form">
            <div class="form-group">
                <label for="name"><span>Name</span></label>
                <input type="text" class="form-control" id="name" name="name" placeholder="e.g. My First Application (required)" required [(ngModel)]="appName">
            </div>
            
            <div class="form-group">
                <label for="icon"><span>Icon</span></label>
                <icon-selector id="icon" name="icon" [(value)]="appIcon"></icon-selector>
            </div>

            <div class="form-group">
                <label for="name"><span>Context Path</span></label>
                <div class="input-group">
                    <div class="input-group-addon">/apps/</div>
                    <input type="text" class="form-control" id="name" name="name" [placeholder]="currentContextPath() + ' (optional, cannot be changed)'" [(ngModel)]="appPath">
                </div>
            </div>

            <div class="form-group">
                    <label for="appCloneName"><span>Clone Existing Application</span></label>
                    <input type="text" class="form-control" id="appCloneName" name="appCloneName"
                      placeholder="e.g. Type Application Name/Id (optional)" 
                      [(ngModel)]="existingAppName" [typeahead]="appNameList" autocomplete="off">
                      
                </div>
        </form>
    </div>
    <div class="modal-footer">
        <button type="button" class="btn btn-default" (click)="bsModalRef.hide()">Cancel</button>
        <button type="button" class="btn btn-primary" [disabled]="!newAppBuilderAppForm.form.valid" (click)="createApplication()">Save</button>
    </div>
  `
})

export class NewApplicationModalComponent implements OnInit {
    appName: string = '';
    appPath: string = '';
    existingAppName: string = '';
    appIcon: string = 'bathtub';
    applications: Observable<IApplication[]>;
    appList: any = [];
    appNameList: any = [];

    constructor(public bsModalRef: BsModalRef, private appService: ApplicationService, private appStateService: AppStateService, private fetchClient: FetchClient, private inventoryService: InventoryService, private alertService: AlertService) {}
   
    ngOnInit() {
        this.loadApplicationsForClone();
    }
   
    async createApplication() {
        this.bsModalRef.hide();
        
        let isCloneApp = false;
        let appBuilderObj;
        if(this.existingAppName) {
            const existingApp = this.existingAppName.split(' (');
            if(existingApp.length > 1) {
                const existingAppId = existingApp[1].replace(')','');
                const appData = this.appList.filter(app => app.id === existingAppId);
                if(appData  && appData.length > 0) {
                    appBuilderObj = appData[0].applicationBuilder;
                    if(appBuilderObj && appBuilderObj.icon) {
                        appBuilderObj.icon = this.appIcon;
                    }
                    appBuilderObj.version = __VERSION__;
                    isCloneApp = true;
                    const appDashboards = appBuilderObj.dashboards;
                    await Promise.all(appDashboards.map(async dashboard => {
                        await this.addClonedDashboard(appBuilderObj, dashboard.name, dashboard.id, dashboard.icon, 
                            (dashboard.deviceId ? dashboard.deviceId : ''), dashboard.groupTemplate);
                    }));
                    if(appBuilderObj.simulators) {
                        let simulators = appBuilderObj.simulators;
                        simulators.forEach(simulator => {
                            simulator.id = Math.floor(Math.random() * 1000000);
                        });
                        appBuilderObj.simulators = simulators;
                    }
                }
            }            
        }
        const defaultAppBuilderData = {
            applicationBuilder: isCloneApp ? appBuilderObj : {
                version: __VERSION__,
                branding: {
                    colors: {
                        primary: '#1776BF',
                        active: '#14629F',
                        text: '#333333',
                        textOnPrimary: 'white',
                        textOnActive: 'white'
                    }
                },
                dashboards: [],
                icon: this.appIcon
            },
            icon: {
                name: this.appIcon,
                "class": `fa fa-${this.appIcon}`
            },
        };
        
        // If the appPath option has been set then we copy the full AppBuilder into a new application
        if (this.appPath) {
            // Check if we're debugging or on localhost - copying the AppBuilder won't work when debugging on localhost
            // (it'll either copy the currently deployed version of the AppBuilder or fail...)
            if (isDevMode()) {
                this.alertService.danger("Can't create an application with a custom path when running in Development Mode. Deploy the Application Builder first, or create one without a custom path.");
                return;
            }
            const currentHost = window.location.host.split(':')[0];
            if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
                this.alertService.warning("Creating an application with a custom path may not work correct unless the Application Builder is deployed.");
            }

            const creationAlert = new UpdateableAlert(this.alertService);

            // find the application Builder's app
            let isClone = false;
            let appList = (await this.appService.list({pageSize: 2000})).data;
            let appBuilder: any;
            appBuilder = appList.find(app => app.contextPath === contextPathFromURL() && app.availability === 'PRIVATE');
            if (!appBuilder) {
                creationAlert.update('Searching Application Builder...');
                const appBuilderMarket = appList.find(app => app.contextPath === contextPathFromURL());
                if(!appBuilderMarket) 
                 throw Error('Could not find application builder');
                else {
                    // Own Application not found... cloning subscribed application to access binary
                    appBuilder = await this.fetchClient.fetch(`application/applications/${appBuilderMarket.id}/clone`, {method: 'POST'}) as Response;
                    appList = (await this.appService.list({pageSize: 2000})).data;
                    appBuilder = appList.find(app => app.contextPath && app.contextPath.indexOf('app-builder') !== -1 && app.availability === 'PRIVATE');
                    isClone =  true;
                    if(!appBuilderMarket) 
                        throw Error('Could not find application builder');
                }
            }
            const binaryId = appBuilder.activeVersionId;
            const binary = (await this.inventoryService.detail(binaryId)).data;
            
            creationAlert.update('Creating application...');

                try {
                    // Download the binary
                    const response = await this.fetchClient.fetch(`/inventory/binaries/${binaryId}`, {method: 'GET'}) as Response;
                    if (!response.ok) {
                        throw Error('Could not get binary');
                    }

                    const reader = response.body.getReader();
                    const contentLength = binary.length;
                    let receivedLength = 0;
                    const chunks = [];
                    while (true) {
                        const {done, value} = await reader.read();

                        if (done) {
                            break;
                        }

                        chunks.push(value);
                        receivedLength += value.length;

                        const progress = receivedLength / contentLength * 100;
                        creationAlert.update(`Creating application...\nDownloading: ${progress.toFixed(0)}%`);
                    }

                    const blob = new Blob(chunks);

                    // Create the app
                    const app = (await this.appService.create({
                        ...appBuilder,
                        name: this.appName,
                        key: `application-builder-${this.appName}-app-key`,
                        contextPath: this.appPath,
                        manifest: {
                            ...appBuilder.manifest,
                            icon: defaultAppBuilderData.icon
                        },
                        owner: undefined,
                        activeVersionId: undefined,
                        applicationBuilder: undefined,
                        icon: undefined
                    } as any)).data;

                    // Upload the binary
                    creationAlert.update(`Creating application...\nUploading...`);
                    const fd = new FormData();
                    fd.append('file', blob, 'app-builder.zip');
                    const activeVersionId = (await (await this.fetchClient.fetch(`/application/applications/${app.id}/binaries`, {
                        method: 'POST',
                        body: fd,
                        headers: {
                            Accept: 'application/json'
                        }
                    })).json()).id;

                    // Update the app
                    creationAlert.update(`Creating application...\nSaving...`);
                    await this.appService.update({
                        id: app.id,
                        activeVersionId,
                        ...defaultAppBuilderData
                    } as any);

                    // deleting cloned app
                    if(isClone){
                        await this.fetchClient.fetch(`application/applications/${appBuilder.id}`, {method: 'DELETE'}) as Response;
                    }
                    creationAlert.update(`Application Created!`, "success");
                    creationAlert.close(2000);
                } catch(e) {
                    creationAlert.update('Failed to create application.\nCheck the browser console for more information', 'danger');
                    throw e;
                }
        } else {
            const app = (await this.appService.create({
                name: this.appName,
                availability: ApplicationAvailability.PRIVATE,
                type: ApplicationType.EXTERNAL,
                key: `application-builder-${this.appName}-app-key`,
                externalUrl: `${window.location.pathname}#/application-builder`
            })).data;
            await this.appService.update({
                id: app.id,
                externalUrl: `${window.location.pathname}#/application/${app.id}`,
                ...defaultAppBuilderData
            } as any);
        }

        // Refresh the applications list
        this.appStateService.currentUser.next(this.appStateService.currentUser.value);
    }

    currentContextPath(): string {
        return contextPathFromURL();
    }

    loadApplicationsForClone() {
        this.applications.subscribe(apps => {
            this.appList = apps;
            if (this.appList && this.appList.length > 0) {
                this.appNameList = Array.from(new Set(this.appList.map(app => `${app.name} (${app.id})`)));
            }
        });
      
    }

    async addClonedDashboard(appBuilderObj, name: string, dashboardId: string, icon: string, deviceId: string, isGroupTemplate: boolean = false) {
        const dashboardManagedObject = (await this.inventoryService.detail(dashboardId)).data;
        const template = dashboardManagedObject.c8y_Dashboard;
        await this.addTemplateDashboard(appBuilderObj,name, icon, template, deviceId, dashboardId, isGroupTemplate);
    }
    async addTemplateDashboard(appBuilderObj, name: string, icon: string, template: any, deviceId: string, existingDashboardId: string, isGroupTemplate: boolean = false) {
        const dashboardManagedObject = (await this.inventoryService.create({
            "c8y_Dashboard": {
                ...template,
                name,
                icon,
                global: true
            },
            ...(isGroupTemplate ? {
                applicationBuilder_groupTemplate: {
                    groupId: deviceId,
                    templateDeviceId: "NO_DEVICE_TEMPLATE_ID"
                }
            } : {})
        })).data;
        appBuilderObj.dashboards.forEach(dashboard => {
            if(dashboard.id === existingDashboardId) {
                dashboard.id = dashboardManagedObject.id
            }
        });
    }
}
