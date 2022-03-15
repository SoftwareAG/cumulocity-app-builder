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
import {Inject, NgModule, Renderer2, RendererFactory2} from "@angular/core";
import {ApplicationModule} from "./application/application.module";
import {RouterModule} from "@angular/router";
import {DashboardConfigComponent} from "./application-config/dashboard-config.component";
import {EditDashboardModalComponent} from "./application-config/edit-dashboard-modal.component";
import {NewDashboardModalComponent} from "./application-config/new-dashboard-modal.component";
import {AppStateService, CoreModule, HOOK_NAVIGATOR_NODES, LoginService} from "@c8y/ngx-components";
import {IconSelectorModule} from "../icon-selector/icon-selector.module";
import {TooltipModule} from "ngx-bootstrap/tooltip";
import {SortableModule} from "ngx-bootstrap/sortable";
import {WizardModule} from "../wizard/wizard.module";
import {BrandingModule} from "./branding/branding.module";
import {AppBuilderNavigationService} from "./navigation/app-builder-navigation.service";
import {
    AppBuilderConfigNavigationRegistrationService,
    AppBuilderConfigNavigationService
} from "./navigation/app-builder-config-navigation.service";
import { BrandingComponent } from "./branding/branding.component";
import { SimulatorConfigModule } from "./simulator-config/simulator-config.module";
import { SimulatorCommunicationService } from "./simulator/mainthread/simulator-communication.service";
import { AppIdService } from "./app-id.service";
import { SimulatorConfigComponent } from "./simulator-config/simulator-config.component";
import { AppListModule, RedirectToDefaultApplicationOrBuilder } from "./app-list/app-list.module";
import { MarkdownModule } from "ngx-markdown";
import { BrandingDirtyGuardService } from "./branding/branding-dirty-guard.service";
import { AppListComponent } from "./app-list/app-list.component";
import { LockStatus } from "./simulator/worker/simulation-lock.service";
import { fromEvent, Observable } from "rxjs";
import { withLatestFrom } from "rxjs/operators";
import { proxy } from "comlink";
import { Client , BasicAuth, CookieAuth, TenantService } from '@c8y/client';
import { TemplateCatalogModule } from "./template-catalog/template-catalog.module";
import { RectangleSpinnerModule } from "./utils/rectangle-spinner/rectangle-spinner.module";
import { DeviceSelectorModalModule } from "./utils/device-selector-modal/device-selector.module";
import { ProgressIndicatorModalModule } from "./utils/progress-indicator-modal/progress-indicator-modal.module";
import { DOCUMENT } from '@angular/common';
import { DeviceSelectorModule } from '../device-selector/device-selector.module';
import { VideoModalComponent } from './home/video-modal.component';
import { SettingsModule } from './settings/settings.module';
import { CustomPropertiesComponent } from './settings/custom-properties.component';
import { SettingsService } from './settings/settings.service';
import { HomeComponent } from './home/home.component';
import { WidgetCatalogModule } from './widget-catalog/widget-catalog.module';
import { AlertMessageModalModule } from "./utils/alert-message-modal/alert-message-modal.module";
import { AppBuilderUpgradeService } from "./app-builder-upgrade/app-builder-upgrade.service";
@NgModule({
    imports: [
        ApplicationModule,
        RouterModule.forChild([
            {
                path: 'application-builder',
                component: AppListComponent
            },
            {
                path: '',
                pathMatch: 'full',
                component: HomeComponent,
                canActivate: [RedirectToDefaultApplicationOrBuilder],
                children: []
            }, {
                path: 'application/:applicationId/config',
                component: DashboardConfigComponent
            }, {
                path: 'application/:applicationId/branding',
                component: BrandingComponent,
                canDeactivate: [BrandingDirtyGuardService]
            }, {
                path: 'application/:applicationId/simulator-config',
                component: SimulatorConfigComponent
            }, 
            {
                path: 'settings-properties',
                component: CustomPropertiesComponent
            }, {
                path: 'home',
                component: HomeComponent
            }
        ]),
        CoreModule,
        IconSelectorModule,
        RectangleSpinnerModule,
        ProgressIndicatorModalModule,
        DeviceSelectorModalModule,
        SortableModule.forRoot(),
        WizardModule,
        TemplateCatalogModule,
        TooltipModule.forRoot(),
        BrandingModule.forRoot(),
        SimulatorConfigModule,
        AppListModule,
        DeviceSelectorModule,
        MarkdownModule.forRoot(),
        SettingsModule,
        WidgetCatalogModule,
        AlertMessageModalModule
    ],
    declarations: [
        DashboardConfigComponent,
        NewDashboardModalComponent,
        EditDashboardModalComponent,
        HomeComponent,
        VideoModalComponent
    ],
    entryComponents: [
        NewDashboardModalComponent,
        EditDashboardModalComponent,
        VideoModalComponent
    ],
    providers: [
        AppBuilderNavigationService,
        { provide: HOOK_NAVIGATOR_NODES, useExisting: AppBuilderNavigationService, multi: true },
        AppBuilderConfigNavigationRegistrationService,
        AppBuilderConfigNavigationService,
        { provide: HOOK_NAVIGATOR_NODES, useExisting: AppBuilderConfigNavigationService, multi: true },
    ]
})
export class BuilderModule {
    private renderer: Renderer2;
    constructor(appStateService: AppStateService, loginService: LoginService, simSvc: SimulatorCommunicationService, 
        appIdService: AppIdService, private settingService: SettingsService, private appBuilderUpgradeService: AppBuilderUpgradeService,
        rendererFactory: RendererFactory2, @Inject(DOCUMENT) private _document: Document, private tenantService: TenantService) {
        // Pass the app state to the worker from the main thread (Initially and every time it changes)
        appStateService.currentUser.subscribe(async (user) => {
            let isCookieAuth = false;
            let cookieAuth = null;
            let xsrfToken = null;
            const token = localStorage.getItem(loginService.TOKEN_KEY) || sessionStorage.getItem(loginService.TOKEN_KEY);
            if (!token) {
                // XSRF token required by webworker while cookie auth used. use case: login using sso
                cookieAuth = new CookieAuth();
                xsrfToken = cookieAuth.getCookieValue('XSRF-TOKEN');
                isCookieAuth = true;
            }
            if (user != null) {
                const tfa = localStorage.getItem(loginService.TFATOKEN_KEY) || sessionStorage.getItem(loginService.TFATOKEN_KEY);
                if (token !== undefined && token) {
                    return await simSvc.simulator.setUserAndCredentials(user, { token, tfa }, isCookieAuth, null);
                } else {
                    return await simSvc.simulator.setUserAndCredentials(user, { token, tfa }, isCookieAuth, xsrfToken);
                }
            }
            return await simSvc.simulator.setUserAndCredentials(user, {}, isCookieAuth, xsrfToken);
        });

        const lockStatus$ = new Observable<{ isLocked: boolean, isLockOwned: boolean, lockStatus?: LockStatus }>(subscriber => {
            simSvc.simulator
                .addLockStatusListener(proxy(lockStatus => subscriber.next(lockStatus)))
                .then(listenerId => subscriber.add(() => simSvc.simulator.removeListener(listenerId)));
        });

        // If the user leaves the page then unlock the simulators
        fromEvent(window, "beforeunload")
            .pipe(withLatestFrom(lockStatus$))
            .subscribe(([event, lockStatus]) => {
                if (lockStatus.isLockOwned) {
                    simSvc.simulator.unlock();
                }
            });
        appStateService.currentTenant.subscribe(async (tenant) => {
            await simSvc.simulator.setTenant(tenant)
            this.settingService.setTenant(tenant);
            if(tenant) {
                const validAnalyticsProvider = await this.settingService.loadAnalyticsProvider();
                if(validAnalyticsProvider) {
                    this.renderer = rendererFactory.createRenderer(null, null);
                    this.registerAndTrackAnalyticsProvider(true);
                }
                this.appBuilderUpgradeService.loadUpgradeBanner();
            }
        });
       
        appIdService.appId$.subscribe(async (appId) => 
        {
            await simSvc.simulator.setAppId(appId)
            this.registerAndTrackAnalyticsProvider(false, appId);
        });
    }

    private async registerAndTrackAnalyticsProvider(isRegister: boolean, appId?: any) {
        if(isRegister) {
            this.settingService.isAnalyticsProviderLoaded = true;
            const provider = this.settingService.getAnalyticsProvider();
            const identity = this.settingService.getIdentity();
            this.initGainsight(provider.providerURL, provider.providerKey, 
                identity, this.settingService.getTenantName());
        } else {
            if(window && window['aptrinsic'] ){
                window['aptrinsic']('track', 'gp_appbuilder_app_viewed', {
                    "appId": appId,
                    "tenantId": this.settingService.getTenantName(), 
                 });
            }
        }
    }
    //Gainsight Integration
    private initGainsight(url: string, key: string, indentity : string, accountId : string) {
        let script = this.renderer.createElement("script");
        script.type = `text/javascript`;
        script.text =
          `
            (function(n,t,a,e,co){var i="aptrinsic";n[i]=n[i]||function(){
              (n[i].q=n[i].q||[]).push(arguments)},n[i].p=e;n[i].c=co;
            var r=t.createElement("script");r.async=!0,r.src=a+"?a="+e;
            var c=t.getElementsByTagName("script")[0];c.parentNode.insertBefore(r,c)
          })(window,document,"${url}","${key}"); //Integration key
          ` +
          `
          aptrinsic("identify",
          {
            "id":"${indentity}"
          },
          {
            //Account Fields
            "id": "${accountId}", //Required
          });
            `;
    
        this.renderer.appendChild(this._document.body, script);
      }
}
