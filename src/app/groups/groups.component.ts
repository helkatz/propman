import { AppComponent } from '../app.component';
import { Component, OnInit, ViewChild, Input, ChangeDetectorRef, DoBootstrap, ChangeDetectionStrategy, HostListener } from '@angular/core'
import { DialogService } from 'primeng/primeng'
import { MenuItem } from 'primeng/components/common/menuitem'
import {TreeNode, SelectItem} from 'primeng/api'
import { forkJoin, Observable } from 'rxjs'
import { ConfigService, Environment } from '../services/config.service'
import { EnvironChooserComponent, EnvironChooserService } from '../environ-chooser/environ-chooser.component'
import { Utils, Breakable } from '../lib/helper'
import * as $ from 'jquery';
import { SaveEditableRow } from 'primeng/table';
import { Rule, PropertiesService, Group, Property } from '../services/properties.service';
import { Transform } from '../lib/transform';
import { PropertiesComponent } from '../properties/properties.component';
import { MessageService } from '../services/message.service';


@Component({
    selector: 'app-groups',
    templateUrl: './groups.component.html',
    styleUrls: ['./groups.component.scss'],
    providers: [MessageService, DialogService, ConfigService, EnvironChooserService],
})

export class GroupsComponent implements OnInit {

    contextMenuItems: MenuItem[]

    groups: TreeNode[] = [];
    selectedGroups: TreeNode[] = [];

    constructor(
        private propertiesService: PropertiesService
        ) {
            console.log("constructor")
            this.propertiesService.watchRules.subscribe(rule => {
                console.log("rule change detected", rule)
                this.loadGroups(rule.groups)
            })
    
    }

    loadGroups(groups: Group[]) {
        console.log('load groups', groups)
        this.groups = Transform.tree([], groups, {
            apply: (to, from) => {
                to.label = from.name
                to.data = from
            }
        })
        console.log(this.groups)
        // this.groups = [...groups]
        // const mergedGroups = [...groups, this.propertiesService.getAvailableGroups()]
        // Transform.tree(this.groups, mergedGroups)
        // // console.log('load groups', groups, this.groups)
        // this.groups = [...this.groups]
        console.log("now selected", this.selectedGroups)
        this.selectGroup()
    }

    selectGroup() {
        if(!this.selectedGroups.length)
            return
        const group = this.selectedGroups[0]['data'] as Group
        this.propertiesService.selectGroup(group)
    }

    async onNodeSelect($event) {
        console.log("onNodeSelect", this.selectedGroups)
        this.selectGroup();
    }

    ngOnInit(): void {
    }
}
