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
import { Directive, ElementRef, Injector } from '@angular/core';
import { UpgradeComponent } from '@angular/upgrade/static';

declare const angular: any;

import './cumulocity.json';
import './dataPointExplorer.js';
/* angular.module("c8y.cockpit.dataPointExplorerUI", ["c8y.cockpit.dataPointExplorer"])
    .component('legacyDataExplorer', {
        template: require("./explorer.html").default,
        controller: "c8yDataPointExplorerCtrl"
       /* controller: ['c8yTitle', 'gettext', function (c8yTitle: any, gettext: any) {
        c8yTitle.changeTitle({
            title: gettext('Data explorer')
        });
    }] 
    }); */

@Directive({
    selector: 'legacy-data-explorer'
})
export class LegacyDataExplorerComponent extends UpgradeComponent {
    constructor(elementRef: ElementRef, injector: Injector) {
        // The angularJS dataExplorer component only reads the device/group from the $routeParams,
        // we're not using the $routeParams in the same way so we just hack it in by manually setting the $routeParams

        // Get the AngularJS Injector
        // noinspection JSDeprecatedSymbols
        const $injector = injector.get('$injector');
        $injector.invoke(['c8yUiUtil', '$routeParams', function(c8yUiUtil, $routeParams) {
            // Set the context device/group for this component
            const context = c8yUiUtil.getContext();
            if (context.context === 'device') {
                $routeParams.deviceId = context.id;
            } else if (context.context != null) {
                $routeParams.groupId = context.id;
            }
        }]);

        super('legacyDataExplorer', elementRef, injector);
    }
}
