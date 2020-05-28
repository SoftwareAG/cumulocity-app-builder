import {NgModule} from "@angular/core";
import {ApplicationModule} from "./application/application.module";
import {RouterModule} from "@angular/router";
import {DashboardConfigComponent} from "./application-config/dashboard-config.component";
import {EditDashboardModalComponent} from "./application-config/edit-dashboard-modal.component";
import {NewDashboardModalComponent} from "./application-config/new-dashboard-modal.component";
import {AppStateService, CoreModule, HOOK_NAVIGATOR_NODES, LoginService} from "@c8y/ngx-components";
import {IconSelectorModule} from "../icon-selector/icon-selector.module";
import {SortableModule, TooltipModule} from "ngx-bootstrap";
import {WizardModule} from "../wizard/wizard.module";
import {BrandingModule} from "./branding/branding.module";
import {AppBuilderNavigationService} from "./navigation/app-builder-navigation.service";
import {
    AppBuilderConfigNavigationRegistrationService,
    AppBuilderConfigNavigationService
} from "./navigation/app-builder-config-navigation.service";
import {BrandingComponent} from "./branding/branding.component";
import {SimulatorConfigModule} from "./simulator-config/simulator-config.module";
import {SimulatorCommunicationService} from "./simulator/mainthread/simulator-communication.service";
import {AppIdService} from "./app-id.service";
import {SimulatorConfigComponent} from "./simulator-config/simulator-config.component";
import {AppListModule, RedirectToDefaultApplicationOrBuilder} from "./app-list/app-list.module";
import {HelpComponent} from "./help/help.component";
import {MarkdownModule} from "ngx-markdown";
import {BrandingDirtyGuardService} from "./branding/branding-dirty-guard.service";
import {AppListComponent} from "./app-list/app-list.component";

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
            }, {
                path: 'help',
                component: HelpComponent
            }
        ]),
        CoreModule,
        IconSelectorModule,
        SortableModule.forRoot(),
        WizardModule,
        TooltipModule.forRoot(),
        BrandingModule.forRoot(),
        SimulatorConfigModule,
        AppListModule,
        MarkdownModule.forRoot()
    ],
    declarations: [
        DashboardConfigComponent,
        NewDashboardModalComponent,
        EditDashboardModalComponent,
        HelpComponent
    ],
    entryComponents: [
        NewDashboardModalComponent,
        EditDashboardModalComponent
    ],
    providers: [
        AppBuilderNavigationService,
        { provide: HOOK_NAVIGATOR_NODES, useExisting: AppBuilderNavigationService, multi: true},
        AppBuilderConfigNavigationRegistrationService,
        AppBuilderConfigNavigationService,
        { provide: HOOK_NAVIGATOR_NODES, useExisting: AppBuilderConfigNavigationService, multi: true},
    ]
})
export class BuilderModule {
    constructor(appStateService: AppStateService, loginService: LoginService, simSvc: SimulatorCommunicationService, appIdService: AppIdService) {
        // Pass the app state to the worker from the main thread (Initially and every time it changes)
        appStateService.currentUser.subscribe(async (user) => {
            if (user != null) {
                const token = localStorage.getItem(loginService.TOKEN_KEY) || sessionStorage.getItem(loginService.TOKEN_KEY);
                const tfa = localStorage.getItem(loginService.TFATOKEN_KEY) || sessionStorage.getItem(loginService.TFATOKEN_KEY);
                if (token) {
                    return await simSvc.simulator.setUserAndCredentials(user, {token, tfa});
                }
            }
            return await simSvc.simulator.setUserAndCredentials(user, {});
        });
        appStateService.currentTenant.subscribe(async (tenant) => await simSvc.simulator.setTenant(tenant));
        appIdService.appId$.subscribe(async (appId) => await simSvc.simulator.setAppId(appId));
    }
}