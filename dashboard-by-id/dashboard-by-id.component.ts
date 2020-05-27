import {Component, Inject, Input, OnChanges, OnInit, Renderer2, SimpleChanges} from "@angular/core";
import {InventoryService} from "@c8y/client";
import {AlertService, DashboardChange, DashboardChildChange} from "@c8y/ngx-components";
import {BsModalService} from "ngx-bootstrap";
import {ContextDashboardComponent} from "./context-dashboard.component";
import {WidgetService} from "./widget.service";
import {
    CONTEXT_DASHBOARD_CONFIG,
    ContextDashboardService,
    ContextDashboardType
} from "@c8y/ngx-components/context-dashboard";
import {ActivatedRoute, Router} from "@angular/router";
import {Subscription} from "rxjs";

@Component({
    selector: 'dashboard-by-id',
    template: `
        <c8y-widgets-dashboard [context]="context" 
                               [widgets]="widgets"
                               [settings]="{
                                isLoading: isLoading,
                                isFrozen: dashboard?.isFrozen,
                                isDisabled: disabled,
                                canDelete: canDelete,
                                translateWidgetTitle: dashboard?.translateWidgetTitle,
                                allowFullscreen: true,
                                title: dashboard?.name,
                                widgetMargin: dashboard?.widgetMargin
                               }"
                               (onFreeze)="toggleFreeze($event)" 
                               (onChangeDashboard)="update_patched($event)"
                               (onAddWidget)="addWidget()" 
                               (onEditWidget)="editWidget($event)"
                               (onDeleteWidget)="deleteWidget($event)" 
                               (onChangeStart)="addDashboardClassToBody()"
                               (onChangeEnd)="removeDashboardClassFromBody()" 
                               (onEditDashboard)="editDashboard()"
                               (onDeleteDashboard)="deleteDashboard()">
        </c8y-widgets-dashboard>
    `
})
export class DashboardByIdComponent extends ContextDashboardComponent implements OnChanges, OnInit {
    @Input() dashboardId;
    @Input() context: Partial<{
        id: string,
        name: string,
        type: ContextDashboardType
    }> = {}

    constructor(
        route: ActivatedRoute,
        router: Router,
        contextDashboardService: ContextDashboardService,
        alert: AlertService,
        renderer: Renderer2,
        @Inject(CONTEXT_DASHBOARD_CONFIG) moduleConfig,
        widgetService: WidgetService,
        bsModal: BsModalService,
        private inventoryService: InventoryService,
    ) {
        super(route, router, contextDashboardService, alert, renderer, moduleConfig, widgetService, bsModal);
        // @ts-ignore
        this.dataSub = new Subscription();
    }

    ngOnInit() {
        // Override the base implementation so that it doesn't load a dashboard from the context or name
    }

    async ngOnChanges(changes: SimpleChanges) {
        if (changes.dashboardId) {
            this.isLoading = true;
            this.widgets = [];
            this.dashboard = undefined;
            await this.loadDashboardId(this.dashboardId);
        }
    }

    async loadDashboardId(dashboardId: string) {
        const result = await this.inventoryService.detail(dashboardId);
        this.mo = result.data;
        this.dashboard = this.mo.c8y_Dashboard;
        // @ts-ignore
        await this.onLoad();
    }

    // The parent class seems to have the wrong type for this argument so we change the type.... maybe it's a bug in c8y?
    update_patched($event: DashboardChange) {
        return super.updateDashboardChildren($event as any as DashboardChildChange);
    }
}
