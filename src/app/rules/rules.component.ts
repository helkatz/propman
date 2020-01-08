import { AppComponent } from '../app.component';
import { Component, OnInit, ViewChild, Input, ChangeDetectorRef, DoBootstrap, ChangeDetectionStrategy, HostListener, ElementRef, forwardRef, ContentChild, ComponentRef, ViewEncapsulation } from '@angular/core'
import { PropertiesService, Rule, Modification} from '../services/properties.service'
import { DialogService, Tree, Dialog } from 'primeng/primeng'
import { MenuItem } from 'primeng/components/common/menuitem'
import {TreeNode, TreeDragDropService} from 'primeng/api'
import { forkJoin, Observable } from 'rxjs'
import { ConfigService, Environment } from '../services/config.service'
import { EnvironChooserComponent, EnvironChooserService } from '../environ-chooser/environ-chooser.component'
import { Utils, Breakable } from '../lib/helper'
import * as $ from 'jquery';
import { SaveEditableRow } from 'primeng/table';
import { GroupsComponent } from '../groups/groups.component';
import { EventHandlerVars } from '@angular/compiler/src/compiler_util/expression_converter';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { DlgAddruleComponent } from './dlg-addrule/dlg-addrule.component';
import { ConditionsComponent } from '../conditions/conditions.component';
import { MessageService } from '../services/message.service';
import { Transform } from '../lib/transform';
import { hklib } from '../lib/hklib';
import * as _ from 'lodash';

@Component({
    selector: 'app-input',
    template: `
        <div class="ui-inputtext"
            [innerText]="node.label || ''"
            (click)="onHandleEditField($event)"
            (keydown.esc)="onHandleEditField($event)"
        ></div>    
    `,
    encapsulation: ViewEncapsulation.None,
})
export class InputHandler {
    static handlers: Map<any, InputHandler> = new Map    
    @Input() el: HTMLElement;
    @ViewChild("rulesTree", {static: false}) rulesTree: ComponentRef<Tree>
    @HostListener('window:keyup', ['$event'])
    keyEvent(event: KeyboardEvent) {
      console.log(event);
    }

    onHandleEditField($event) {

        const modifyNode = (el: HTMLDivElement) => {
            console.log('modify', $event)
        }

        const editStart = (el: HTMLDivElement) => {
            console.log('editStart', el)
            el.contentEditable = 'true'
            el["unchanged"] = el.innerText
            el.focus()
            // el.classList.add(".noborder")
            el.onblur = () => {
                editComplete(el, false)
            }
        }

        const editComplete = (el: HTMLElement, cancel: boolean) => {
            el.contentEditable = 'false'
            // el.classList.remove('ui-inputtext')
            if (cancel === true) {
                el.innerText = el["unchanged"]
            }

            // node.label = el.innerText
            modifyNode(el as HTMLDivElement)
            // this.modifyNode($event, node, column)

            el.onblur = undefined
            el.onkeydown = undefined
            el.oninput = undefined
        }

        console.log('event', $event, $event.srcElement.innerHTML)
        if ($event instanceof MouseEvent) {
            console.log('MouseEvent', $event)
            if ($event.button !== 0)
                return

            const editField = $event.srcElement as HTMLDivElement
            editStart(editField)
        } else if ($event instanceof KeyboardEvent) {
            if ($event.key === 'Escape') {
                editComplete($event.srcElement as HTMLDivElement, true)
            }
        } else { // @TODO must be a InputEvent but InputEvent type not exits
            modifyNode($event.srcElement as HTMLDivElement)
        }
    }    
}

@Component({
    selector: 'app-rules',
    templateUrl: './rules.component.html',
    styleUrls: ['./rules.component.scss'],
    providers: [MessageService, DialogService, ConfigService, EnvironChooserService],
        styles: [`
        :host ::ng-deep .ui-editing-cell {
            padding: 0 !important;
            }

        :host ::ng-deep .ui-toggler-column.ui-editing-cell {
            padding-left: 0.857em !important;
            }
    `]
})

export class RulesComponent implements OnInit {
    // @Input() app: AppComponent;
    // @Input() groups: GroupsComponent;
    // @Input() conditions: ConditionsComponent;
    @ViewChild("addRuleDialog", {static: false}) addRuleDialog: DlgAddruleComponent
    @ViewChild("rulesTree", {static: false}) rulesTree: ComponentRef<Tree>

    contextMenuItems: MenuItem[]

    rules: TreeNode[];
    selectedRules: TreeNode;

    constructor(
        private messageService: MessageService
        , private configService: ConfigService
        , private changeDetection: ChangeDetectorRef
        , private dialogService: DialogService
        , private propertiesService: PropertiesService
        ) {
        // environChooser.subscribe((environs) => {
        //     console.log("event from environChooser", environs)
        // })
        this.configService.configChanged$.subscribe(
            config => {
                console.log('config changed received')
                // this.environs = [...this.configService.getEnvironments()]
            });
    }

    addRule(node: TreeNode, rule: Rule) {
        console.log("addRule", node, rule)
        if(!node.children)
            node.children = []
        node.children.push({
            label: rule.name,
            data: rule         
        })
        this.propertiesService.addRule(node.data, rule)
    }

    removeRule(node: TreeNode) {
        console.log("removeRule", node)
        this.propertiesService.removeRule(node.data)
    }

    
    addRuleDialog_Click_Add($event) {
        console.log("click")
    }

    addRuleDialog_Click_Cancel($event) {
        this.addRuleDialog.setVsible(false)
    }

    onNodeSelect($event) {
        console.log("onNodeSelect", $event.node)
        const rule = this.selectedRules.data as Rule
        this.propertiesService.selectRule(rule)
    }

    openAddRuleDialog(node: TreeNode) {
        this.addRuleDialog.setVsible(true)
        this.addRuleDialog.accept = (params) => {
            console.log("adding rule", params)
            this.addRule(node, {
                name: params.groupName,
                description: params.description,
                inheritFromParent: params.inheritFromParent,
                space: this.propertiesService.getSelectedSpace(),
                modification: Modification.Added
            })
        }
    }

    openContextMenu($event) {

        const node: TreeNode = $event.node
        console.log('open contextmenu', $event)

        this.contextMenuItems = [
            {
                label: 'Add Rule',
                command: (event) => this.openAddRuleDialog($event.node), styleClass: 'context-menu-item'
            },
            { 
                label: 'Remove Rule', 
                disabled: !$event.node.selectable,
                command: (event) => this.removeRule($event.node) },
        ]
    }

    buildRulesTree() {
        this.propertiesService.getRules().then(rules => {
            let firstSelectableNode: TreeNode
            console.log("getRules returned", _.cloneDeep(rules), rules)
            this.rules = []
            hklib.toTree(this.rules, rules, {
                groupBySeperator: ".", 
                groupBy: ["space.name", "name"],
                labelNameField: "label",
                apply: (to, from) => {
                    // console.log("apply", to, from)
                    // when we have an id then it is a data node      
                    to.expanded = true               
                    to.selectable = from !== undefined
                    if(!firstSelectableNode && to.selectable) {
                        //@TODO expand only the selected wont work
                        hklib.forEachUp(to, node => node.expanded = true)
                        // to.expanded = true
                        
                        firstSelectableNode = to
                    }
                }
            })
            // const firstSelectableNode = this.rules.find(r => r.selectable)
            console.log("firstSelectableNode", firstSelectableNode)
            if(firstSelectableNode) {
                this.selectedRules = firstSelectableNode
                this.propertiesService.selectRule(firstSelectableNode.data)
            }
        })        
    }

    ngOnInit(): void {
        console.log("onInit")
        this.propertiesService.loadRules().then(() => {
            this.buildRulesTree()
        })
        this.propertiesService.watchRulesReload.subscribe(o => {
            console.log("rules reload detected")
            this.buildRulesTree()
        })
        
    }
}
