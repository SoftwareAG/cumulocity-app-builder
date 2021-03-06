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

import {Component, OnDestroy} from '@angular/core';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import {NewSimulatorModalComponent} from "./new-simulator-modal.component";
import {EditSimulatorModalComponent} from "./edit-simulator-modal.component";
import {LOCK_TIMEOUT, LockStatus} from "../simulator/worker/simulation-lock.service";
import {BehaviorSubject} from "rxjs";
import * as delay from "delay";
import * as Comlink from "comlink";
import {IApplication, ApplicationService} from "@c8y/client";
import {AppIdService} from "../app-id.service";
import {SimulatorConfig} from "../simulator/simulator-config";
import {SimulatorCommunicationService} from "../simulator/mainthread/simulator-communication.service";
import {SimulationStrategiesService} from "../simulator/simulation-strategies.service";

@Component({
    templateUrl: './simulator-config.component.html'
})
export class SimulatorConfigComponent implements OnDestroy {
    bsModalRef: BsModalRef;

    lockStatus$ = new BehaviorSubject<{isLocked: boolean, isLockOwned: boolean, lockStatus?: LockStatus}>({isLocked: false, isLockOwned: false});
    simulatorConfigById$ = new BehaviorSubject<Map<number, SimulatorConfig>>(new Map());

    isUnlocking = false;
    private _lockStatusListener: Promise<number>;
    private _simulatorConfigListener: Promise<number>;

    constructor(
        private simSvc: SimulatorCommunicationService, private modalService: BsModalService,
        private appIdService: AppIdService, private appService: ApplicationService,
        public simulationStrategiesService: SimulationStrategiesService
    ) {
        this._lockStatusListener = simSvc.simulator.addLockStatusListener(Comlink.proxy(lockStatus => this.lockStatus$.next(lockStatus)));
        this._simulatorConfigListener = simSvc.simulator.addSimulatorConfigListener(Comlink.proxy(simulatorConfigById => this.simulatorConfigById$.next(simulatorConfigById)));
    }

    showCreateSimulatorDialog() {
        this.bsModalRef = this.modalService.show(NewSimulatorModalComponent, { class: 'c8y-wizard' });
    }

    async showEditSimulatorDialog(simulatorConfig: SimulatorConfig) {
        this.bsModalRef = this.modalService.show(EditSimulatorModalComponent, { class: 'c8y-wizard', initialState: { simulatorConfig } })
    }

    async forceUnlock() {
        this.isUnlocking = true;
        await this.simSvc.simulator.forceTakeLock();
        // Wait a bit extra to allow the UI to realise that we now own the lock
        await delay(LOCK_TIMEOUT/2);
        this.isUnlocking = false;
    }

    async changeSimulatorStarted(simulatorConfig: SimulatorConfig, started: boolean) {
        simulatorConfig.started = started;
        const appId = this.appIdService.getCurrentAppId();
        const app = (await this.appService.detail(appId)).data as IApplication & {applicationBuilder: {simulators?: SimulatorConfig[]}};
        if (app.applicationBuilder.simulators != undefined) {
            const matchingIndex = app.applicationBuilder.simulators.findIndex(currentSimConfig => currentSimConfig.id === simulatorConfig.id);
            if (matchingIndex > -1) {
                app.applicationBuilder.simulators[matchingIndex] = simulatorConfig;
            }
        }
        await this.appService.update({
            id: appId,
            applicationBuilder: app.applicationBuilder
        } as IApplication);

        // We could just wait for them to refresh, but it's nicer to instantly refresh
        await this.simSvc.simulator.checkForSimulatorConfigChanges();
    }

    async deleteSimulator(simulatorConfig: SimulatorConfig) {
        const appId = this.appIdService.getCurrentAppId();
        const app = (await this.appService.detail(appId)).data as IApplication & {applicationBuilder: {simulators?: SimulatorConfig[]}};
        if (app.applicationBuilder.simulators != undefined) {
            app.applicationBuilder.simulators = app.applicationBuilder.simulators.filter(currentSimConfig => currentSimConfig.id !== simulatorConfig.id);
        }
        await this.appService.update({
            id: appId,
            applicationBuilder: app.applicationBuilder
        } as IApplication);

        // We could just wait for them to refresh, but it's nicer to instantly refresh
        await this.simSvc.simulator.checkForSimulatorConfigChanges();
    }

    ngOnDestroy(): void {
        this._lockStatusListener.then(id => this.simSvc.simulator.removeListener(id));
        this._simulatorConfigListener.then(id => this.simSvc.simulator.removeListener(id));
    }
}
