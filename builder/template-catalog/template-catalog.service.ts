import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { has, get } from "lodash-es";
import { IManagedObject, IManagedObjectBinary } from '@c8y/client';
import { BinaryDescription, CumulocityDashboard, DeviceDescription, TemplateCatalogEntry, TemplateDashboardWidget, TemplateDetails } from "./template-catalog.model";
import { ApplicationService, InventoryBinaryService, InventoryService } from "@c8y/ngx-components/api";
import { AppBuilderNavigationService } from "../navigation/app-builder-navigation.service";

@Injectable()
export class TemplateCatalogService {

    private readonly GATEWAY_URL = 'https://democenter.gateway.webmethodscloud.com/gateway/LabcaseAssetService/1.0/storage/d/';

    private readonly CATALOG_LABCASE_ID = 'f5077165f394be735dba24e52eeb45d2';

    constructor(private http: HttpClient, private inventoryService: InventoryService,
        private appService: ApplicationService, private navigation: AppBuilderNavigationService,
        private binaryService: InventoryBinaryService) { }

    getTemplateCatalog(): Observable<TemplateCatalogEntry[]> {
        return this.http.get(`${this.GATEWAY_URL}${this.CATALOG_LABCASE_ID}`).pipe(map(response => {
            if (!has(response, 'catalog')) {
                console.error('Failed to load catalog');
                return undefined;
            }

            let catalog = response['catalog'] as Array<object>;
            return catalog.map(entry => {
                return {
                    title: get(entry, 'title'),
                    description: get(entry, 'description'),
                    thumbnail: get(entry, 'thumbnail'),
                    manufactur: get(entry, 'manufactur'),
                    useCase: get(entry, 'use_case'),
                    device: get(entry, 'device'),
                    dashboard: get(entry, 'dashboard'),
                    comingSoon: get(entry, 'coming_soon')
                } as TemplateCatalogEntry;
            });
        }));
    }

    getTemplateDetails(dashboardId: string): Observable<TemplateDetails> {
        return this.http.get(`${this.GATEWAY_URL}${dashboardId}`).pipe(map((dashboard: TemplateDetails) => {
            console.log(dashboard);
            return dashboard;
        }));
    }

    uploadImage(image: File): Promise<string> {
        return this.binaryService.create(image).then((response) => {
            let imageBinary = response.data as IManagedObjectBinary
            console.log(imageBinary);
            return imageBinary.id;
        });
    }

    async createDashboard(application, dashboardConfiguration, templateCatalogEntry: TemplateCatalogEntry, templateDetails: TemplateDetails) {
        if (templateDetails.input.devices && templateDetails.input.devices.length > 0) {
            templateDetails.widgets = this.updateWidgetConfigurationWithDeviceInformation(templateDetails.input.devices, templateDetails.widgets);
        }

        if (templateDetails.input.images && templateDetails.input.images.length > 0) {
            templateDetails.widgets = this.updateWidgetConfigurationWithImageInformation(templateDetails.input.images, templateDetails.widgets);
        }

        console.log(this.getCumulocityDashboardRepresentation(dashboardConfiguration, templateDetails.widgets));

        await this.inventoryService.create({
            "c8y_Dashboard": this.getCumulocityDashboardRepresentation(dashboardConfiguration, templateDetails.widgets)
        }).then(({ data }) => {
            application.applicationBuilder.dashboards = [
                ...application.applicationBuilder.dashboards || [],
                {
                    id: data.id,
                    name: dashboardConfiguration.dashboardName,
                    icon: dashboardConfiguration.dashboardIcon,
                    visibility: dashboardConfiguration.dashboardVisibility,
                    tabGroup: dashboardConfiguration.tabGroup,
                    templateDashboard: {
                        id: templateCatalogEntry.dashboard,
                        name: templateCatalogEntry.title,
                        devices: templateDetails.input.devices ? templateDetails.input.devices : [],
                        binaries: templateDetails.input.images ? templateDetails.input.images : []
                    }
                }
            ];

            return this.appService.update({
                id: application.id,
                applicationBuilder: application.applicationBuilder
            } as any);
        }).then(() => {
            this.navigation.refresh();
        });
    }

    private getCumulocityDashboardRepresentation(dashboardConfiguration, widgets: Array<TemplateDashboardWidget>): CumulocityDashboard {
        return {
            children: this.getWidgetsAsChildren(widgets),
            name: dashboardConfiguration.dashboardName,
            icon: dashboardConfiguration.dashboardIcon,
            global: true,
            isFrozen: true,
        };
    }

    private getWidgetsAsChildren(widgets: Array<TemplateDashboardWidget>): object {
        let children = {};

        widgets.forEach(widget => {
            widget.id = this.generateId();
            children[this.generateId()] = widget;
        })

        return children;
    }

    private updateWidgetConfigurationWithDeviceInformation(devices: Array<DeviceDescription>, widgets: Array<TemplateDashboardWidget>): Array<TemplateDashboardWidget> {
        let updatedWidgets = widgets.map(widget => {
            console.log(JSON.stringify(widget));
            let widgetStringDescription: any = JSON.stringify(widget);

            devices.forEach(device => {
                widgetStringDescription = widgetStringDescription.replaceAll(`"{{${device.placeholder}.id}}"`, `"${device.reprensentation.id}"`);
                widgetStringDescription = widgetStringDescription.replaceAll(`"{{${device.placeholder}.name}}"`, `"${device.reprensentation.name}"`);
            })

            console.log(widgetStringDescription);
            widget = JSON.parse(widgetStringDescription);
            return widget
        })

        console.log(updatedWidgets);
        return updatedWidgets;
    }

    private updateWidgetConfigurationWithImageInformation(images: Array<BinaryDescription>, widgets: Array<TemplateDashboardWidget>): Array<TemplateDashboardWidget> {
        let updatedWidgets = widgets.map(widget => {
            console.log(JSON.stringify(widget));
            let widgetStringDescription: any = JSON.stringify(widget);

            images.forEach(image => {
                widgetStringDescription = widgetStringDescription.replaceAll(`"{{${image.placeholder}.id}}"`, `"${image.id}"`);
            })

            console.log(widgetStringDescription);
            widget = JSON.parse(widgetStringDescription);
            return widget
        })

        console.log(updatedWidgets);
        return updatedWidgets;
    }

    private generateId(): string {
        let id = this.generateRandomInteger(10000, 100000000);
        return id.toString();
    }

    private generateRandomInteger(min, max): number {
        return Math.floor(Math.random() * Math.floor(max) + min);
    }
}