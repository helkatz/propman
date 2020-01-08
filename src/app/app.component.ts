import { Component, OnInit, HostListener, Inject, Input, ViewChild } from '@angular/core';
import { ConfigService } from './services/config.service'
import { Utils } from './lib/helper'
import { remote, ipcRenderer } from 'electron';
import { DialogService, DynamicDialogRef, MenuItem, MessageService, Message } from 'primeng/api';
import { SettingsDialogComponent } from './settings-dialog/settings-dialog.component';
import { DomSanitizer } from '@angular/platform-browser';import { DOCUMENT } from "@angular/common";
import { GroupsComponent } from './groups/groups.component';
import { ConditionsComponent } from './conditions/conditions.component';
import { PropertiesComponent } from './properties/properties.component';
import { PropertiesService } from './services/properties.service';
const { dialog } = remote;

@Component({
    selector: 'my-app',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    providers: [ConfigService, DialogService],
})
export class AppComponent implements OnInit  {
    // @ViewChild("groups", {static: false}) groups: GroupsComponent;
    // @ViewChild("properties") properties: PropertiesComponent;
    // @ViewChild("conditions") conditions: ConditionsComponent;

    name = 'Angular'
    menuItems: MenuItem[];
    settingsDialoRef: DynamicDialogRef
    messages: []
    // theme = "omega"
    themeUrl: any
    sliderPos: number

    show: "properties-rulebased" | "properties-userbased" | "properties" | "history"
    constructor(
        private configService: ConfigService
        , private propertiesService: PropertiesService
        , private dialogService: DialogService
        , private messageService: MessageService
        , public sanitizer: DomSanitizer
        , @Inject(DOCUMENT) private document) {
        // there is not window move event avail this is a hack for that
        setInterval(() => {
            const savedState = this.configService.readJson('mainwindow') || {}
            // console.log('saveWindowState timer')
            if (savedState.screenTop !== window.screenTop
                || savedState.screenLeft !== window.screenLeft) {
                console.log('saveWindowState')
                this.saveWindowState()
                }
        }, 10000);

        remote.Menu.setApplicationMenu(null);

        this.configService.change.subscribe(name => {
            if (name === 'theme')
                this.themeUrl = this.getThemeUrl()
        })
    }

    addMessage(message: Message) {
        this.messageService.add(message)
    }

    addErrorMessage(message: string) {
        this.addMessage({severity: 'error', summary: 'Error', detail: message, sticky: true})
    }

    getThemeUrl() {
        const url = `assets/styles/themes/${this.configService.getTheme()}/theme.css`
        return this.sanitizer.bypassSecurityTrustResourceUrl(url)
    }

    openSettings() {
        this.settingsDialoRef = this.dialogService.open(SettingsDialogComponent, {
            header: 'Settings',
            width: '800px'
        })
    }

    saveWindowState() {
        this.configService.writeJson('mainwindow', Utils.json_pick(window,
            ['outerHeight', 'outerWidth', 'screenTop', 'screenLeft']))
    }

    saveChanges = () => this.propertiesService.saveChanges()

    hasChanges = () => this.propertiesService.hasChanges()

    // @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.saveWindowState();
    }

    ngOnInit() {
        console.log("onInit")
        this.themeUrl = this.getThemeUrl()
        const state = this.configService.readJson('mainwindow')
        if (state) {
            this.configService.preventStoring = true
            window.resizeTo(state.outerWidth, state.outerHeight)
            window.moveTo(state.screenLeft, state.screenTop)
            this.configService.preventStoring = false
        }

        this.menuItems = [
            {
                icon: "fa fa-fw fa-list",
                items: [
                    {
                        label: 'Settings',
                        command: event => { this.openSettings() },
                    },
                    {
                        label: 'Open DevTools',
                        command: event => remote.getCurrentWindow().webContents.openDevTools()
                    }                    
                ]
            },
            {
                label: 'Properties',
                command: event => this.show = "properties",
                items: [
                        {
                            label: 'Rule based',
                            command: event => this.show = "properties-rulebased"
                        },
                        {
                            label: 'User based',
                            command: event => this.show = "properties-userbased"
                        },                        
                        {
                            label: 'History',
                            command: event => this.show = "history"
                        }
                    ]
            }

        ];
    }
}
