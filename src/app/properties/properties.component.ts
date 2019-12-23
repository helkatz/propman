import { Component, OnInit, Input } from '@angular/core';
import { TreeNode, MenuItem, SelectItem, MessageService } from 'primeng/api';
import { PropertiesService, Property, Group, PropertiesTarget, WatchSubject } from '../services/properties.service';
import { Transform } from '../lib/transform';
import { XPrime } from '../lib/primespec';
import { GroupsComponent } from '../groups/groups.component';
import { AppComponent } from '../app.component';
import { Messages } from 'primeng/primeng';
import { Utils, Breakable } from '../lib/helper';
import { PropertiesEditorComponent } from '../properties-editor/properties-editor.component';
import { ConfigService } from '../services/config.service';

@Component({
  selector: 'app-properties',
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.scss'],
  providers: []
})

export class PropertiesComponent implements OnInit {
  // @Input() app: AppComponent;
  // @Input() groups: GroupsComponent
  @Input() propertiesEditor: PropertiesEditorComponent

  contextMenuItems: MenuItem[]

  properties: TreeNode[];
  propertiesCache: {[key: string]: TreeNode[]};
  selectedProperties: TreeNode[];

  applyable = false

  constructor(private propertiesService: PropertiesService
    , private configService: ConfigService
    , private messageService: MessageService) { 

    }

  onNodeSelect(event) {    
    this.propertiesEditor.load(event.node)
  }

  applyGroupProperties(event: WatchSubject<Group>) {
    const group = event.subject
    if(!group) {
      this.applyable = false
      return
    }
    this.applyable = true
    console.log("applyProperties", group.properties_new)
    const propTarget = !group.parent ? "applied" : "excluded"
    this.properties = this.propertiesCache[propTarget]
    if(group.name === "root") {

    }
    XPrime.forEachUp(this.properties, node => {
      // console.log(node.label, node.data)
      if(node.data) {        
        node.data.applied = group.properties_new[propTarget].find(id => id === node.data.property.id) !== undefined
        if(node.data.applied) {
          let n = node
          while(n) {
            // do not expand tree when only make modifications in a group like apply new properties
            if(event.change !== "modified")
              n.expanded = true
            n = n.parent
          }
        }
      }
    })
    this.properties = [...this.properties]
  }

  clickAppliedChange = (node: any) => {
    console.log('clickAppliedChange', node)

    if(node.applied) {
      this.propertiesService.addPropertiesToGroup([node.property])
    } else {
      this.propertiesService.removePropertiesFromGroup([node.property])
    }
  }

  ngOnInit() {
    this.propertiesService.watchRules.subscribe(rule => {
      this.propertiesService.getProperties(rule).then(res => {
        console.log(res)
        this.propertiesCache = {
          "applied": [],
          "excluded": []
        }
        const expandAll = this.configService.get("properties.expandAll", true)
        Transform.tree(this.propertiesCache["applied"], res, {
          groupBy: ["type", "group"],
          apply: (to, from) => {
            to.label = from.name
            to.expanded = true
            to.data = {
              property: from,
              applied: false
            }
          }
        })
        this.properties = this.propertiesCache["applied"]
        console.log(this.propertiesCache["applied"])
        return
      })
    })
    this.propertiesService.watchGroups.subscribe(event => {
      console.log("group change detected", event)
      this.applyGroupProperties(event)
    })
  }
}
