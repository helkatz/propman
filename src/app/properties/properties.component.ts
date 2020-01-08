import { Component, OnInit, Input, HostListener, ViewChild, ViewContainerRef, ComponentRef, OnDestroy } from '@angular/core';
import { TreeNode, MenuItem, SelectItem, MessageService } from 'primeng/api';
import { PropertiesService, Property, Group, WatchSubject, GroupPropertyState, PathState, Rule } from '../services/properties.service';
import * as $ from 'jquery'
import { Transform } from '../lib/transform';
import { XPrime } from '../lib/primespec';
import { GroupsComponent } from '../groups/groups.component';
import { AppComponent } from '../app.component';
import { Messages, Tree } from 'primeng/primeng';
import { Utils, Breakable } from '../lib/helper';
import { types } from '../lib/types'
import { PropertiesEditorComponent } from '../properties-editor/properties-editor.component';
import { ConfigService } from '../services/config.service';
import * as _ from 'lodash';
import { hklib } from '../lib/hklib';
import { Subscription } from 'rxjs';

interface TreeNodeData {
  property?: Property
  applied: boolean
  state: GroupPropertyState
  readonly: boolean
}

interface XTreeNode extends TreeNode {  
  data: TreeNodeData
  nodePath: string
  parent: XTreeNode
  children: XTreeNode[]
}

export type Mode = "rulebased" | "propbased" | "userbased"
function toTriState(state: GroupPropertyState) {
  return state === "applied" ? true :
    state === "inherited" ? false :
    state === "hidden" ? null : false
}

function fromTriState(state: boolean | null): GroupPropertyState {
  return state === true ? "applied" :
    state === false ? "inherited" :
    "hidden"
}

@Component({
  selector: 'app-properties',
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.scss'],
  providers: []
})

export class PropertiesComponent implements OnInit, OnDestroy {

  @Input() mode: Mode;
  // @Input() groups: GroupsComponent
  @Input() propertiesEditor: PropertiesEditorComponent
  @ViewChild("propertiesTreeComponent", {static: true}) propertiesTreeComponent: Tree

  subscriptions: Subscription[] = []
  contextMenuItems: MenuItem[]

  propertiesCols: any[] = [
    { field: "name", header: "Name"}
  ]
  properties: XTreeNode[];
  propetiesScrollHeight = "100%"
  // propertiesCache: {[key: string]: XTreeNode[]};
  selectedProperties: XTreeNode;

  applyable = false

  constructor(private propertiesService: PropertiesService
    , private configService: ConfigService
    , private messageService: MessageService) { 

    }

  log(msg) {
    console.log(msg)
  }
  onNodeSelect(event) {    
    this.openEditorForSelection()
    // console.log(event)
    // if(event.node.data && event.node.data.property)
    //   this.propertiesEditor.load(event.node.data.property)
  }

  openEditorForSelection() {
    console.log("openEditorForSelection", this.selectedProperties, this.propertiesService.getProperties())
    if(this.selectedProperties) {
      this.propertiesEditor.load(this.selectedProperties.data.property, this.mode)
    }
  }

  applyGroupProperties(group: Group, expand: boolean) {
    if(!group) {
      this.applyable = false
      return
    }
    const groupProperties = this.propertiesService.getGroupProperties(group)

    this.applyable = true
    console.log("applyGroupProperties", groupProperties, this.properties)

    hklib.forEachDown(this.properties, node => {
      const foundPath = _.get(groupProperties, node.nodePath) as PathState
        
      // const foundPath = groupProperties.find(o => node.nodePath.indexOf(o.nodePath) === 0)
      // console.log(`nodePath ${node.nodePath}`, foundPath)
      if(!foundPath) {
        node.selectable = true
        node.data.readonly = false
        node.data.state = group.inheritFromParent ? "inherited" : "hidden"
        node.data.applied = group.inheritFromParent ? false : null
      } else {
        node.selectable = foundPath._state !== "disabled"
        node.data.readonly = foundPath._state === "disabled"
        node.data.applied = toTriState(foundPath._state)
        node.data.state = foundPath._state        
      }

      if(!node.data.property)
        node.selectable = false

      if(node.data.property && node.data.applied && expand) {
        hklib.forEachUp(node, node => node.expanded = true)
      }
    })
    this.properties = [...this.properties]
  }

  clickAppliedChange = (event: Event, node: XTreeNode) => {
    console.log('clickAppliedChange', node.nodePath, node.data.applied)
    if(node.data.property) {
      this.propertiesService.updateGroupProperties([node.data.property.id], fromTriState(node.data.applied))
    } else {
      this.propertiesService.updateGroupPropertiesByPath([node.nodePath], fromTriState(node.data.applied))
    }
  }

  buildPropertiesTree(properties: Property[]) {
    
    console.log("buildPropertiesTree", properties)
    this.properties = []
    const expandAll = this.configService.get("properties.expandAll", true)
    let updateSelected = this.selectedProperties !== undefined
    hklib.toTree(this.properties, properties, {
      groupBy: ["type", "group"],
      labelNameField: "label",
      apply: (to, from) => {
        to.expanded = true
        to.data = {
          property: from,          
          applied: false,
          state: "inherited",
          readonly: false          
        }
        to.selectable = false
        if(!from)
          return
        to.key = from.path // key has to be set because of an primng issue when filtering no selection is possible
        if(this.mode === "propbased" || this.mode === "userbased") {
          to.selectable = true
        }
        // update selected if already selcted
        if(updateSelected && this.selectedProperties.nodePath === to.nodePath) {
          this.selectedProperties = to
          updateSelected = false
        }
      }
    })
    setTimeout(() => this.recalcTreeHeight(), 1000)
    // this.recalcTreeHeight()
    this.openEditorForSelection()
    console.log("buildPropertiesTree done", this.properties)
  }

  recalcTreeHeight() {
    console.log("propertiesTreeComponent", this.propertiesTreeComponent)
    //@TODO find a way to calculate it from real content
    let subHeights 
      = 200 // for groups content
      + 250 // for tab and others
    if(this.mode === "rulebased" || this.mode === "userbased") {
      subHeights 
      = 200 // for groups content
      + 250 // for tab, menue, ...
    } else if(this.mode === "propbased") {
      subHeights = 120 // for menu, ...
    }
    console.log("subHeights", subHeights)
      
    let container = $(this.propertiesTreeComponent.el.nativeElement).find(".ui-tree-container")
    if(!container) {
      console.error("container not found")
      return
    }
    console.log("container found", container)
    container[0]['style'].height =  (window.innerHeight - subHeights).toString() + 'px'
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    console.log("onResize", event)
    this.recalcTreeHeight()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subsription =>  subsription.unsubscribe())
  }

  ngOnInit() {
    console.log("onInit", this)
    let currentRule: Rule = undefined
    if(this.mode == "userbased") {

      let currentUser: number = undefined
      this.subscriptions.push(this.propertiesService.watchRules.subscribe(event => {
        currentRule = event
        if(currentUser) {
          this.propertiesService.loadProperties(currentRule, currentUser).then(
            properties => this.buildPropertiesTree(properties)
          )          
        }
      }))      
     this.subscriptions.push(this.propertiesService.watchUsers.subscribe(event => {
        currentUser = event.subject.id
        this.propertiesService.loadProperties(currentRule, event.subject.id).then(          
          properties => this.buildPropertiesTree(properties)
        )
      }))
    }
    if(this.mode == "propbased") {
      this.propertiesService.loadProperties().then(
        properties => this.buildPropertiesTree(properties)
      )
    }
    if(this.mode == "rulebased") {

      this.subscriptions.push(this.propertiesService.watchGroups.subscribe(event => {
        const group = event.subject;
        console.log("group change detected", event, currentRule)
        if(!group) {
          currentRule = undefined
          this.properties = []
          return
        }
        if(group && currentRule !== group.rule) {
          currentRule = group.rule
          this.propertiesService.loadProperties(currentRule).then(properties => {            
            this.buildPropertiesTree(properties)
            this.applyGroupProperties(event.subject, event.change !== "modified")
          })          
        } else {
          this.applyGroupProperties(event.subject, event.change !== "modified")
        }
        
        
      }))
    }
    console.log("OnInit done")
    // setTimeout(() => this.recalcTreeHeight(), 1000)
  }
}
