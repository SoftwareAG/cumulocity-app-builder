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

import {Component, OnDestroy, OnInit} from "@angular/core";
import {
    UserService
} from "@c8y/client";
import {AppStateService} from "@c8y/ngx-components";
import { Subscription } from 'rxjs';
import { SettingsService } from './settings.service';

@Component({
    template: `
    <c8y-title>Custom Properties</c8y-title>
    <div class="col-xs-12 col-sm-6 col-md-6 card" >
        <form name="customPropertiesForm" #customPropertiesForm="ngForm">
        <div class="card-block" *ngIf="!isBusy">
            <div class="form-group">
                <label translate="" for="gainsightEnabled" >Gainsight Product Experience Tracking</label>
                <button class="btn btn-default" id="gainsightEnabled" name="gainsightEnabled" [(ngModel)]="gainsightEnabled" 
                        (ngModelChange)="changeGainsightStatus()" [disabled]="!userHasAdminRights || isGainsightParent" 
                        [class.disabled]="!userHasAdminRights || isGainsightParent" btnCheckbox tabindex="0">{{gainsightEnabled? 'Enabled' : 'Disabled' }}</button>
            </div>
            <div class="form-group" >
                <label translate="" for="dashboardCataglogEnabled" >Dashboard Catalog</label>
                <button class="btn btn-default" id="dashboardCataglogEnabled" name="dashboardCataglogEnabled" [(ngModel)]="dashboardCataglogEnabled" 
                        (ngModelChange)="changeDashboardCatalogStatus()" [disabled]="!userHasAdminRights" 
                        [class.disabled]="!userHasAdminRights " btnCheckbox tabindex="1">{{dashboardCataglogEnabled? 'Enabled' : 'Disabled' }}</button>
            </div>
            <div class="form-group" >
                <label translate="" for="dashboardVisibility" >Dashboard: Smart rules, Alarms and Data explorer</label>
                <button class="btn btn-default" id="dashboardVisibility" name="dashboardVisibility" [(ngModel)]="dashboardVisibility" 
                        (ngModelChange)="changeDashboardVisibility()" [disabled]="!userHasAdminRights" 
                        [class.disabled]="!userHasAdminRights " btnCheckbox tabindex="1">{{dashboardVisibility? 'Visible' : 'Hidden' }}</button>
            </div>
            <div class="form-group" >
                <label translate="" for="navLogoVisibility" >Navigator Logo</label>
                <button class="btn btn-default" id="navLogoVisibility" name="navLogoVisibility" [(ngModel)]="navLogoVisibility" 
                        (ngModelChange)="changeNavLogoVisibility()" [disabled]="!userHasAdminRights" 
                        [class.disabled]="!userHasAdminRights " btnCheckbox tabindex="1">{{navLogoVisibility? 'Visible' : 'Hidden' }}</button>
            </div>
            <div class="form-group" >
                <label translate="" for="appUpgradeNotification" >Application Builder Upgrade Notification</label>
                <button class="btn btn-default" id="appUpgradeNotification" name="appUpgradeNotification" [(ngModel)]="appUpgradeNotification" 
                        (ngModelChange)="changeAppUpgradeNotification()" [disabled]="!userHasAdminRights" 
                        [class.disabled]="!userHasAdminRights " btnCheckbox tabindex="1">{{appUpgradeNotification? 'Enabled' : 'Disabled' }}</button>
            </div>
        </div>
        <div *ngIf="isBusy" class="col-xs-12 col-sm-12 col-md-12" style="padding-bottom:50px;padding-top:20px">
            <rectangle-spinner  style="position: relative; left: 47%;">
            </rectangle-spinner>
        </div>
        <div class="card-footer" style="text-align:center" *ngIf="userHasAdminRights && !isBusy">
            <button class="btn btn-primary" id="saveCustomProperties" (click)="save(customProperties)" [disabled]="!customPropertiesForm.form.valid || !isFormValid()">Save</button>
        </div>
        </form>
    </div>
    `
})

// TODO for next release
/*  <div class="form-group" >
            <label translate="" for="simulatorEnabled" >Simulators</label>
            <button class="btn btn-default" id="simulatorEnabled" name="simulatorEnabled" [(ngModel)]="simulatorEnabled" 
                    (ngModelChange)="changeSimulatorStatus()" [disabled]="!userHasAdminRights" 
                    [class.disabled]="!userHasAdminRights " btnCheckbox tabindex="1">{{simulatorEnabled? 'Enabled' : 'Disabled' }}</button>
            </div> */
// Custom property settings for Application Builder
export class CustomPropertiesComponent implements OnInit, OnDestroy{

    userHasAdminRights: boolean;
    isBusy: boolean = false;
    isGainsightParent: boolean = false;
    gainsightEnabled = false;
    dashboardCataglogEnabled = true;
    simulatorEnabled = true;
    dashboardVisibility = true;
    navLogoVisibility = true;
    appUpgradeNotification = true;
    customProperties = {
        gainsightEnabled: "false",
        dashboardCataglogEnabled: "true",
        dashboardVisibility: "true",
        simulatorEnabled: "true",
        navLogoVisibility: "true",
        appUpgradeNotification: "true"
        
    }
    delayedTenantSubscription: Subscription;
    constructor( private appStateService: AppStateService,
        private userService: UserService, 
        private settingsService: SettingsService) {
        this.userHasAdminRights = userService.hasAllRoles(appStateService.currentUser.value, ["ROLE_INVENTORY_ADMIN","ROLE_APPLICATION_MANAGEMENT_ADMIN"]);
        this.delayedTenantSubscription = this.settingsService.delayedTenantUpdateSubject.subscribe ((tenant) => {
            this.isGainsightParent = this.settingsService.isGaisigntEnabledFromParent();
            if(this.isGainsightParent) { this.customProperties.gainsightEnabled = 'true';}
        });
    }
                        

    async ngOnInit() {
        this.isBusy = true;
        this.customProperties = await this.settingsService.getCustomProperties();
        this.isGainsightParent = this.settingsService.isGaisigntEnabledFromParent();
        if(this.isGainsightParent) { this.customProperties.gainsightEnabled = 'true';}
        if(this.customProperties && this.customProperties.dashboardCataglogEnabled === 'false') {
            this.customProperties.dashboardCataglogEnabled = 'false';
            this.dashboardCataglogEnabled = false;
        }
        if(this.customProperties && this.customProperties.simulatorEnabled === 'false') {
            this.customProperties.simulatorEnabled = 'false';
            this.simulatorEnabled = false;
        }
        if(this.customProperties.gainsightEnabled === 'true') { this.gainsightEnabled = true;}
        if(this.customProperties.dashboardCataglogEnabled === 'true') { this.dashboardCataglogEnabled = true;}
        if(this.customProperties.simulatorEnabled === 'true') { this.simulatorEnabled = true;}
        if(this.customProperties.dashboardVisibility === 'false') { this.dashboardVisibility = false;}
        if(this.customProperties.navLogoVisibility === 'false') { this.navLogoVisibility = false;}
        if(this.customProperties.appUpgradeNotification === 'false') { this.appUpgradeNotification = false;}
        this.isBusy = false;
    }

    changeGainsightStatus() {
        if(this.gainsightEnabled) { this.customProperties.gainsightEnabled = 'true';}
        else { this.customProperties.gainsightEnabled = 'false'; }

    }

    changeSimulatorStatus() {
        if(this.simulatorEnabled) { this.customProperties.simulatorEnabled = 'true';}
        else { this.customProperties.simulatorEnabled = 'false'; }
    }

    changeDashboardCatalogStatus() {
        if(this.dashboardCataglogEnabled) { this.customProperties.dashboardCataglogEnabled = 'true';}
        else { this.customProperties.dashboardCataglogEnabled = 'false'; }
    }

    changeDashboardVisibility() {
        if(this.dashboardVisibility) { this.customProperties.dashboardVisibility = 'true';}
        else { this.customProperties.dashboardVisibility = 'false'; }
    }

    changeNavLogoVisibility() {
        if(this.navLogoVisibility) { this.customProperties.navLogoVisibility = 'true';}
        else { this.customProperties.navLogoVisibility = 'false'; }
    }

    changeAppUpgradeNotification() {
        if(this.appUpgradeNotification) { this.customProperties.appUpgradeNotification = 'true';}
        else { this.customProperties.appUpgradeNotification = 'false'; }
    }
    isFormValid() {
        return ( this.customProperties && (this.customProperties.gainsightEnabled === 'true' || this.customProperties.gainsightEnabled === 'false') && 
        (this.customProperties.dashboardCataglogEnabled === 'true' || this.customProperties.dashboardCataglogEnabled === 'false'))
     //   && 
     //   (this.customProperties.simulatorEnabled === 'true' || this.customProperties.simulatorEnabled === 'false'));
    }

    save(customProperties) {
        this.settingsService.saveCustomProperties(customProperties);
    }

    ngOnDestroy() {
        this.delayedTenantSubscription.unsubscribe();
    }
}
