import { AppComponent } from '../app.component';
import { Component, OnInit, ViewChild, Input, ChangeDetectorRef, DoBootstrap, ChangeDetectionStrategy, HostListener, OnDestroy } from '@angular/core'
import { DialogService } from 'primeng/primeng'
import { MenuItem } from 'primeng/components/common/menuitem'
import {TreeNode, SelectItem} from 'primeng/api'
import { forkJoin, Observable, Subscription } from 'rxjs'
import { ConfigService, Environment } from '../services/config.service'
import { EnvironChooserComponent, EnvironChooserService } from '../environ-chooser/environ-chooser.component'
import { Utils, Breakable } from '../lib/helper'
import * as $ from 'jquery';
import { SaveEditableRow } from 'primeng/table';
import { Rule, PropertiesService, Group, Property } from '../services/properties.service';
import { Transform } from '../lib/transform';
import { PropertiesComponent } from '../properties/properties.component';
import { MessageService } from '../services/message.service';
import { hklib } from '../lib/hklib';


@Component({
    selector: 'app-groups',
    templateUrl: './groups.component.html',
    styleUrls: ['./groups.component.scss'],
    providers: [MessageService, DialogService, ConfigService, EnvironChooserService],
})

export class GroupsComponent implements OnInit, OnDestroy {
    subscriptions: Subscription[] = []
    contextMenuItems: MenuItem[]

    groups: TreeNode[] = [];
    selectedGroups: TreeNode[] = [];
    
    constructor(
        private propertiesService: PropertiesService
        ) {
            this.subscriptions.push(this.propertiesService.watchRules.subscribe(rule => {
                console.log("rule change detected", rule)
                this.buildGroupsTree(rule ? rule.groups : [])
            }))
    
    }

    private buildGroupsTree(groups: Group[]) {
        this.selectedGroups = []
        console.log('buildGroupsTree', groups, this.propertiesService)
        if(!groups.length) {
            this.groups = []
            return
        }
        this.groups = hklib.toTree([], groups, { labelNameField: "label" })
        this.selectedGroups.push(this.groups[0])
        this.propertiesService.selectGroup(this.groups[0].data)   
    }

    onInheritClick(event) {
        this.propertiesService.notifyGroupChange()
    }

    async onNodeSelect($event) {
        const group = this.selectedGroups[0]['data'] as Group
        this.propertiesService.selectGroup(group)
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(subsription =>  subsription.unsubscribe())
      }

    ngOnInit(): void {
    }
}
