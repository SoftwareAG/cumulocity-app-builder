/*
* Copyright (c) 2022 Software AG, Darmstadt, Germany and/or its licensors
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

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApplicationService, FetchClient, IApplication, IManifest } from '@c8y/client';
import { BehaviorSubject, config, Observable } from 'rxjs';
import { WidgetCatalog, WidgetModel } from './widget-catalog.model';
import * as semver from "semver";
import { catchError, delay } from 'rxjs/operators';
import { AlertService, AppStateService, PluginsService, ZipService } from '@c8y/ngx-components';
import { SettingsService } from './../settings/settings.service';
import { ProgressIndicatorService } from '../utils/progress-indicator-modal/progress-indicator.service';
import { AppBuilderExternalAssetsService } from 'app-builder-external-assets';
import { AppIdService } from '../app-id.service';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { AlertMessageModalComponent } from '../../builder/utils/alert-message-modal/alert-message-modal.component';

const packageJson = require('./../../package.json');
const c8yVersion = require('./../../package.json')["@c8y/ngx-components"];
@Injectable()
export class WidgetCatalogService {

  C8Y_VERSION = '1018.X.X';
  pkgVersion: any;
  private WidgetCatalogPath = '/widgetCatalog/widget-catalog.json';
 // private WidgetCatalogPath = '/widgetCatalog/widget-catalog.json?ref=preprod';
  private DemoCatalogWidgetsPath = '/demoCatalogWidgets/demo-catalog-widgets.json';
 // private DemoCatalogWidgetsPath = '/demoCatalogWidgets/demo-catalog-widgets.json?ref=preprod';
  private devBranchPath = "?ref=development";
  private preprodBranchPath = "?ref=preprod";
  private GATEWAY_URL_GitHubAsset = '';
  private GATEWAY_URL_GitHubAPI = '';
  private GATEWAY_URL_GitHubAsset_FallBack = '';
  private GATEWAY_URL_GitHubAPI_FallBack = '';
  private GATEWAY_URL_Labcase = '';
  private GATEWAY_URL_Labcase_FallBack = '';
  private CATALOG_LABCASE_ID = '';
  private GATEWAY_URL_GitHub = '';
  private GATEWAY_URL_GitHub_FallBack = '';
  runtimeLoadingCompleted = true;
  private currentApp: IApplication = null;

  widgetDetailsSource: BehaviorSubject<any> = new BehaviorSubject(null);
  widgetDetails$: Observable<any> = this.widgetDetailsSource.asObservable();
  displayListSource: BehaviorSubject<any> = new BehaviorSubject(null);
  displayListValue$: Observable<any> = this.displayListSource.asObservable();

  displayListSourceMoreWidgets: BehaviorSubject<any> = new BehaviorSubject(null);
  displayListValueMoreWidgets$: Observable<any> = this.displayListSourceMoreWidgets.asObservable();

  private readonly HTTP_HEADERS = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    })
  };

  constructor(private http: HttpClient,
    private appService: ApplicationService, private appStateService: AppStateService,
    private settingsService: SettingsService, private pluginsService: PluginsService,
    private client: FetchClient, private appIdService: AppIdService,  private modalService: BsModalService,
    private externalService: AppBuilderExternalAssetsService, private zipService: ZipService,
    private progressIndicatorService: ProgressIndicatorService, private alertService: AlertService) {
    this.GATEWAY_URL_GitHubAPI = this.externalService.getURL('GITHUB', 'gatewayURL_Github'); 
    this.GATEWAY_URL_GitHubAsset = 'service/c8y-community-utils/githubAsset?path=';
    this.GATEWAY_URL_GitHubAPI_FallBack = this.externalService.getURL('GITHUB', 'gatewayURL_Github_Fallback');
    this.GATEWAY_URL_GitHubAsset_FallBack = 'service/c8y-community-utils/githubAsset?path=';
    this.C8Y_VERSION = packageJson.dependencies['@c8y/ngx-components'];
    this.pkgVersion = packageJson.version;

    this.GATEWAY_URL_Labcase = 'service/c8y-community-utils/labcaseAsset?id=';
    this.GATEWAY_URL_Labcase_FallBack = 'service/c8y-community-utils/labcaseAsset?id=';
  
    this.GATEWAY_URL_GitHub = this.externalService.getURL('GITHUB', 'gatewayURL_GithubAPI');
    this.GATEWAY_URL_GitHub_FallBack = this.externalService.getURL('GITHUB', 'gatewayURL_GithubAPI_Fallback');
   
    //this.GATEWAY_URL_GitHubAsset = this.externalService.getURL('GITHUB', 'gatewayURL_GitHubAsset');
    //this.GATEWAY_URL_GitHubAsset_FallBack = this.externalService.getURL('GITHUB', 'gatewayURL_GitHubAsset_Fallback');
    //this.GATEWAY_URL_Labcase = this.externalService.getURL('DBCATALOG', 'gatewayURL');
    //this.GATEWAY_URL_Labcase_FallBack = this.externalService.getURL('DBCATALOG', 'gatewayURL_Fallback');
    
  
    this.appStateService.currentApplication.subscribe(app => {
      this.currentApp = app;
    });
  }


  fetchWidgetCatalog(): Observable<WidgetCatalog> {
    const url = `${this.GATEWAY_URL_GitHubAPI}${this.WidgetCatalogPath}`;
    const urlFallBack = `${this.GATEWAY_URL_GitHubAPI_FallBack}${this.WidgetCatalogPath}`;
    if (this.pkgVersion.includes('dev')) {
      return this.http.get<WidgetCatalog>(`${url}${this.devBranchPath}`, this.HTTP_HEADERS)
        .pipe(catchError(err => {
          console.log('Fetch Widget Catalog: Error in primary endpoint! using fallback...');
          return this.http.get<WidgetCatalog>(`${urlFallBack}${this.devBranchPath}`, this.HTTP_HEADERS)
        }));
    } else if (this.pkgVersion.includes('rc')) { 
      return this.http.get<WidgetCatalog>(`${url}${this.preprodBranchPath}`, this.HTTP_HEADERS)
        .pipe(catchError(err => {
          console.log('Fetch Widget Catalog: Error in primary endpoint! using fallback...');
          return this.http.get<WidgetCatalog>(`${urlFallBack}${this.preprodBranchPath}`, this.HTTP_HEADERS)
        }));
    } else {
      return this.http.get<WidgetCatalog>(`${url}`, this.HTTP_HEADERS)
      .pipe(catchError(err => {
        console.log('Fetch Widget Catalog: Error in primary endpoint! using fallback...');
        return this.http.get<WidgetCatalog>(`${urlFallBack}`, this.HTTP_HEADERS)
      }));
    }
  }

  fetchWidgetForDemoCatalog(): Observable<WidgetCatalog> {
    const url = `${this.GATEWAY_URL_GitHubAPI}${this.DemoCatalogWidgetsPath}`;
    const urlFallBack = `${this.GATEWAY_URL_GitHubAPI_FallBack}${this.DemoCatalogWidgetsPath}`;
    if (this.pkgVersion.includes('dev')) {
      return this.http.get<WidgetCatalog>(`${url}${this.devBranchPath}`, this.HTTP_HEADERS)
        .pipe(catchError(err => {
          console.log('Fetch Widget For Demo Catalog: Error in primary endpoint! using fallback...');
          return this.http.get<WidgetCatalog>(`${urlFallBack}${this.devBranchPath}`, this.HTTP_HEADERS)
        }));
    } else if (this.pkgVersion.includes('rc')) {  
      return this.http.get<WidgetCatalog>(`${url}${this.preprodBranchPath}`, this.HTTP_HEADERS)
      .pipe(catchError(err => {
        console.log('Fetch Widget For Demo Catalog: Error in primary endpoint! using fallback...');
        return this.http.get<WidgetCatalog>(`${urlFallBack}${this.preprodBranchPath}`, this.HTTP_HEADERS)
      }));
    } else {
      return this.http.get<WidgetCatalog>(`${url}`, this.HTTP_HEADERS)
      .pipe(catchError(err => {
        console.log('Fetch Widget For Demo Catalog: Error in primary endpoint! using fallback...');
        return this.http.get<WidgetCatalog>(`${urlFallBack}`, this.HTTP_HEADERS)
      }));
    }
    
  }


 async downloadBinary(binaryId: string): Promise<any> {
      if(this.appIdService.isCommunityMSExist) {
        const response = await this.client.fetch(`${this.GATEWAY_URL_GitHubAsset}${binaryId}`);
        if(response && response.ok) {
            return (await response.blob());
        } else  {
            this.alertService.danger("Unable to download binary! Please try after sometime. If problem persists, please contact the administrator.");
        }
        
    } else {
      throw Error("Unable to download binary!");     
    }
  }

  isCompatiblieVersion(widget: any) {
    if (!widget || !widget.requiredPlatformVersion) return false;
    const major = '>=' + semver.major(this.C8Y_VERSION) + '.X.X';
    return semver.satisfies(this.C8Y_VERSION, widget.requiredPlatformVersion) || semver.satisfies(widget.requiredPlatformVersion,major);
  }

  isNextCompatiblieVersion(nextC8yVersion: any, widget: any) {
    if (!widget || !widget.requiredPlatformVersion) return false;
    const major = '>=' + semver.major(nextC8yVersion) + '.X.X';
    return semver.satisfies(widget.requiredPlatformVersion, major);
  }

  isLatestVersionAvailable(widget: WidgetModel) {
    return semver.lt(widget.installedVersion, widget.version);
  }

  compareWidgetVersions(widget1Version: string, Widget2Version: string) {
    return semver.lt(widget1Version, Widget2Version);
  }

  checkInstalledVersion(widget: WidgetModel) {
    if (!widget.installedVersion) return true;

    if (widget.installedVersion?.toLocaleLowerCase().includes('beta') ||
      widget.installedVersion?.toLocaleLowerCase().includes('rc')) return true;

    const major = '>=' + semver.major(widget.installedVersion) + '.0.0';
    return semver.satisfies(widget.version, major);
  }

  async downloadBinaryFromLabcase(binaryId: string): Promise<any> {
    if(this.appIdService.isCommunityMSExist) {
      const response = await this.client.fetch(`${this.GATEWAY_URL_Labcase}${binaryId}`);
      if(response && response.ok) {
          return (await response.blob());
      } else  {
          this.alertService.danger("Unable to download binary! Please try after sometime. If problem persists, please contact the administrator.");
      }
      
    } else {
      throw Error("Unable to download binary!");     
    }
  }

  setWidgetDetails(detail: any) {
    this.widgetDetailsSource.next(detail);
  }

  setDisplayListValue(value: any) {
    this.displayListSource.next(value);
  }

  setDisplayListValueMoreWidgets(value: any) {
    this.displayListSourceMoreWidgets.next(value);
  }
  getWidgetDetailsFromRepo(widgetRepoPath): Observable<any> {
    const url = `${this.GATEWAY_URL_GitHub}${widgetRepoPath}/readme`;
    const urlFallBack = `${this.GATEWAY_URL_GitHub_FallBack}${widgetRepoPath}/readme`;
    return this.http.get(`${url}`, {
      responseType: 'text'
    }).pipe(catchError(err => {
      console.log('Widget Catalog: Get Widget Details From Readme: Error in primary endpoint! using fallback...');
      return this.http.get(`${urlFallBack}`, {
        responseType: 'text'
      })
    }));
  }


  async updateRemotesInCumulocityJson(pluginBinary: any, isBinaryFound: boolean) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.progressIndicatorService.setProgress(50);
    const currentApp: IApplication = (await this.getCurrentApp(true));
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.progressIndicatorService.setProgress(75);
    const packageObj = this.pluginsService.getMFExports(pluginBinary) ;
    this.progressIndicatorService.setProgress(95);
    // updating config MO to retain widget status
    let remotes = await this.pluginsService.addRemotes(currentApp, packageObj);

    // for C8y 1015 compatibility
    if(!remotes) {
      remotes = (currentApp?.config?.remotes ? currentApp.config?.remotes : {});
      packageObj.forEach((remote: any) => {
        const key = remote.contextPath + '@' + remote.version;
        (remotes[key] = remotes[key] || []).push(remote.module);
      });
      let config = (currentApp?.config ? currentApp.config :  {});
      config.remotes = remotes;
       let updatedApp = (await this.appService.update({
        id: currentApp.id,
        config
      } as any)).data;

      if (isBinaryFound && window && window['aptrinsic']) {
          window['aptrinsic']('track', 'gp_runtime_widget_installed', {
            "widgetName": pluginBinary.name
          });
      }
    }
    return this.settingsService.updateAppConfigurationForPlugin(remotes)
  }

  async updateRemotesToAppBuilderConfig() {
    
    const currentApp: IApplication =  (await this.getCurrentApp(true));
    return this.settingsService.updateAppConfigurationForPlugin(currentApp?.config?.remotes);
  }

  private getCumulocityJson(archive: File): Observable<any> {
    return this.zipService.getJsonData(archive, {
      filename: 'cumulocity.json'
    });
  }

  async getCurrentApp(isLatest: boolean = false) {
    if (!this.currentApp) {
      await delay(1000);
      return this.getCurrentApp();
    }
    if(isLatest) {
      this.currentApp = await (await this.appService.detail(this.currentApp.id)).data;
    }
    return this.currentApp;
  }

  async installPackage(packageFile: File) {
    this.progressIndicatorService.setProgress(30);
    let widgetC8yJson;
    try {
      widgetC8yJson = await this.getCumulocityJson(packageFile).toPromise().then(data => data).catch( (e) => {
        console.log(e);
        this.alertService.danger("Unable to find manfifest file. Please refresh and try again.");
        throw Error("Unable to find manfifest file. Please refresh and try again.");
      });
      if (widgetC8yJson.contextPath === undefined) {
        this.alertService.danger("Plugin Package has no context path.");
        throw Error("Plugin Package has no context path");
      }
    } catch (e) {
      console.log(e);
      this.alertService.danger("Not a valid Plugin Package.");
      throw Error("Not a valid Plugin Package");
    }
    const appList = (await this.appService.list({ pageSize: 2000 })).data;
    let isUpdate = false;
    if (appList.some(app => app.contextPath === widgetC8yJson.contextPath)) {
      isUpdate = true;
      const packageApp = appList.find(app => app.contextPath === widgetC8yJson.contextPath);
       await this.appService.delete(packageApp.id).catch( (e) => {
        console.error(e);
      });
      
      this.progressIndicatorService.setProgress(35);
      
      // Upload the binary
      // const appBinary = (await this.appService.binary(packageApp).upload(packageFile)).data;
      // Update the app
      // this.progressIndicatorService.setProgress(40);
     /*  await this.appService.update({
        ...widgetC8yJson,
        id: packageApp.id,
        activeVersionId: appBinary.id.toString()
      });
      if (window && window['aptrinsic']) {
        window['aptrinsic']('track', 'gp_runtime_widget_updated', {
          "widgetName": packageApp.name
        });
      }
      return this.updateRemotesInCumulocityJson(packageApp) */
    }  //else {
      this.progressIndicatorService.setProgress(35);
      // Create the pluginPackage's app
      try {
        let packageApp = (await this.appService.create({
          name: widgetC8yJson.name,
          key: widgetC8yJson.key,
          contextPath: widgetC8yJson.contextPath,
          manifest: { isPackage: true } as unknown as IManifest,
          resourcesUrl: "/",
          type: "HOSTED"
        } as any)).data;
  
        // Upload the binary
        const appBinary = (await this.appService.binary(packageApp).upload(packageFile)).data;
  
        // Update the app
        this.progressIndicatorService.setProgress(40);
        packageApp = (await this.appService.update({
          id: packageApp.id,
          activeVersionId: appBinary.id.toString()
        } as any)).data;
  
        if (window && window['aptrinsic']) {
          if(isUpdate) {
            window['aptrinsic']('track', 'gp_runtime_widget_updated', {
              "widgetName": packageApp.name
            });
          } else {
            window['aptrinsic']('track', 'gp_runtime_widget_installed', {
              "widgetName": packageApp.name
            });
          }
         
        }
        return this.updateRemotesInCumulocityJson(packageApp, false)
      }
      catch(e) {
        console.log(e);
        const appRemotes = this.currentApp?.config.remotes;
        return this.settingsService.updateAppConfigurationForPlugin(appRemotes)
      }
   // }
  }

  async removePlugins(pluginBinary: any) {
    const currentApp = await this.getCurrentApp(true);
    const packageObj = this.pluginsService.getMFExports(pluginBinary) ;
    return this.pluginsService.removeRemotes(currentApp, packageObj);
  }
  async updateAppConfigRemotes(remotes: any) {
    return this.settingsService.updateAppConfigurationForPlugin(remotes);
  }

  async filterInstalledWidgets(widgetCatalog: WidgetCatalog, userHasAdminRights: boolean) {
    if (!widgetCatalog || !widgetCatalog.widgets
        || widgetCatalog.widgets.length === 0) {
        return;
    }

    const currentApp: IApplication =  (await this.getCurrentApp());
    const appList = await this.pluginsService.listPackages();
    let installedPlugins = currentApp?.config?.remotes;
    installedPlugins = (installedPlugins ? this.removeVersionFromPluginRemotes(installedPlugins) : []);
    for(let widget of widgetCatalog.widgets) {
        const widgetObj = installedPlugins.find( plugin => plugin.pluginContext === widget.contextPath);
        const appObj = appList.find(app => app.contextPath === widget.contextPath);
        widget.installed = (widgetObj != undefined && widgetObj && appObj != undefined);
        widget.isCompatible = this.isCompatiblieVersion(widget);
        this.actionFlagGetWidgets(widget, userHasAdminRights);
    }
   
     return widgetCatalog.widgets.filter(widget => !widget.installed);
  }

 removeVersionFromPluginRemotes(plugins: any) : Array<any>{
    if(plugins) {
      return Object.keys(plugins).map(key => ({pluginContext: key.split('@')[0], value: plugins[key]}));
    }
    return [];
  }

  /**
     * compatible: 001
     * non compatible: 002
     * refresh: 003
     * force upgrade 004 (my widget)
     * invisible 000
     */
  actionFlagGetWidgets(widget: WidgetModel, userHasAdminRights: boolean) {

    if (userHasAdminRights) {
      if (widget.isCompatible && !widget.installed) { widget.actionCode = '001'; }
      else if (!widget.isCompatible && !widget.installed) { widget.actionCode = '002'; }
      else if (widget.isReloadRequired && widget.installed) { widget.actionCode = '003'; }
      else { widget.actionCode = '000'; }
    } else {
      widget.actionCode = '000';
    }
  }

  async isOwnAppBuilder() {
    const currentApp = await this.getCurrentApp();
    const currentTenantId = this.settingsService.getTenantName();
    const appBuilderTenantId = (currentApp && currentApp.owner && currentApp.owner.tenant ? currentApp.owner.tenant.id : undefined);
    return (currentApp && currentTenantId === appBuilderTenantId);
  }

  async cloneAppBuilder() {
    const currentApp = await this.getCurrentApp();
    let { data: clonedAppBuilder } = await this.appService.clone(currentApp.id);
    clonedAppBuilder.contextPath = currentApp.contextPath;
    clonedAppBuilder.key = currentApp.key;
    clonedAppBuilder.name = currentApp.name;
    delete clonedAppBuilder.type;
    await this.appService.update({
      id: clonedAppBuilder.id,
      ...clonedAppBuilder
    });
  }

  loadErrorMessageDialog() {
    const alertMessage = {
      title: 'Microservice needed!',
      description: `'Cumulocity Community Utils' microservice is not installed or subscribed. Please download the microservice, then install and subscribe to it by navigating to Administration -> Ecosystems -> Microservices. `,
      type: 'danger',
      externalLink: "https://labcase.softwareag.com/storage/d/a02221e54739758ccb1ab839ce09e2cc",
      externalLinkLabel: "Download the microservice now.",
      alertType: 'info' //info|confirm
    }
    this.alertModalDialog(alertMessage);
  }

  alertModalDialog(message: any): BsModalRef {
    return this.modalService.show(AlertMessageModalComponent, { class: 'c8y-wizard', initialState: { message } });
  }
}
