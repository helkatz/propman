import { NgModule, Injectable } from '@angular/core'
import { RouterModule } from '@angular/router'
import { CommonModule } from '@angular/common'
import { BrowserModule } from '@angular/platform-browser'
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'
import { FormsModule } from '@angular/forms'
import { AppComponent } from './app.component'
import { PropertiesService } from './services/properties.service'
import { ConfigService} from './services/config.service'
import { RulesComponent} from './rules/rules.component'
import { GroupsComponent } from './groups/groups.component'

import {
    ContextMenuModule, ButtonModule, InputTextModule
    , ToolbarModule, TreeTableModule, ToggleButtonModule
    , SplitButtonModule, MultiSelectModule, DialogModule
    , DialogService, FieldsetModule, DropdownModule, TabViewModule
    , InputSwitchModule, CheckboxModule, MenubarModule, MenuModule
    , PanelMenuModule, MessageModule, MessagesModule, MessageService, SliderModule
    , TreeModule, ListboxModule, TriStateCheckboxModule
    , SpinnerModule
} from 'primeng/primeng'
import {TableModule} from 'primeng/table'
import { TooltipModule } from 'primeng/tooltip'
import {OverlayPanelModule} from 'primeng/overlaypanel'
import {DynamicDialogModule} from 'primeng/dynamicdialog'
import {ToastModule} from 'primeng/toast'
import { HttpClientModule, HttpClient } from '@angular/common/http'
import { EnvironChooserComponent, EnvironChooserService } from './environ-chooser/environ-chooser.component'
import { SettingsDialogComponent, HostConfigurationTab, GenerellConfigurationTab } from './settings-dialog/settings-dialog.component'

import {MatNativeDateModule, MatFormFieldModule, MatFormFieldControl, 
    MAT_DIALOG_DEFAULT_OPTIONS, MatSelectModule, MatOptionModule} from '@angular/material';
import {MatBadgeModule} from '@angular/material/badge';
import {A11yModule} from '@angular/cdk/a11y';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {PortalModule} from '@angular/cdk/portal';
import {ScrollingModule} from '@angular/cdk/scrolling';
import {CdkStepperModule} from '@angular/cdk/stepper';
import {CdkTableModule} from '@angular/cdk/table';
import {CdkTreeModule} from '@angular/cdk/tree';
import { MatDialogModule } from '@angular/material';
import {MatInputModule} from '@angular/material';
import { DlgAddruleComponent } from './rules/dlg-addrule/dlg-addrule.component';
import { ConditionsModule } from './conditions/conditions.component'
import { QueryBuilderModule } from "angular2-query-builder";
import { PropertiesComponent } from './properties/properties.component';
import { MyQueryBuilderComponent } from './query-builder/query-builder.component';
import { RulesetComponent } from './query-builder/ruleset/ruleset.component';
import { RuleComponent } from './query-builder/rule/rule.component';
import { PropertiesEditorComponent } from './properties-editor/properties-editor.component';
import { HistoryComponent } from './history/history.component';
import { UsersComponent } from './users/users.component';
import { AngularMultiSelectModule } from 'angular2-multiselect-dropdown';
// import '@smarthtmlelements/smart-elements/source/modules/smart.querybuilder.js';

@NgModule({
    imports: [
        CommonModule
        , BrowserModule, FormsModule, TreeTableModule, HttpClientModule, RouterModule, ContextMenuModule
        , ContextMenuModule, ToggleButtonModule, ButtonModule, InputTextModule, ToolbarModule
        , SplitButtonModule, ToastModule, MultiSelectModule, BrowserAnimationsModule, DialogModule
        , DynamicDialogModule, TooltipModule, OverlayPanelModule, TableModule, FieldsetModule
        , DropdownModule, TabViewModule, MatDialogModule, MatNativeDateModule, PortalModule
        , MatFormFieldModule, MatInputModule, MatBadgeModule
        , InputSwitchModule, CheckboxModule, MenubarModule
        , MenuModule, PanelMenuModule, MessageModule, MessagesModule, SliderModule
        , TreeModule, ListboxModule, TriStateCheckboxModule, SpinnerModule
        , ConditionsModule, QueryBuilderModule
        , MatSelectModule, MatOptionModule
        , AngularMultiSelectModule
    ],

    declarations: [
        AppComponent
        , EnvironChooserComponent
        , RulesComponent, GroupsComponent, PropertiesComponent
        , SettingsDialogComponent, HostConfigurationTab, GenerellConfigurationTab, DlgAddruleComponent, PropertiesEditorComponent, HistoryComponent, UsersComponent
        
        //, DxxComponent
        // , ConditionsComponent, ConditionComponent
    ],
    entryComponents: [
        SettingsDialogComponent
    ],
    bootstrap:    [ AppComponent ],
    providers: [PropertiesService, ConfigService, DialogService, EnvironChooserService, MessageService
        , {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {hasBackdrop: false}}]
})

export class AppModule {
    constructor() {
        console.log("AppModule")
    }
}
