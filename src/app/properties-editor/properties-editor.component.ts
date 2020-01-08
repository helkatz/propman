import { Component, OnInit } from '@angular/core';
import { Property, PropertiesService, Modification, Modifyable } from '../services/properties.service';
import * as prime from 'primeng/api';
import { Database } from '../lib/database';
import { ValueTransformer } from '@angular/compiler/src/util';
import { Entity } from 'angular2-query-builder/dist/components';
import { TouchBarSegmentedControlConstructorOptions } from 'electron';
import * as lodash from 'lodash'
import * as difflib from 'deep-object-diff';
import { Mode } from '../properties/properties.component';
import { take } from 'rxjs/operators';
// the real type of the value 
type AttributeType = "boolean" | "number" | "double" | "string" | "period" | "object" | "array"

// the type for the component to edit an value
type ComponentType = AttributeType | "select" | "multiselect" | "tree" | "multiselect-cupalabs"

type Grants = "ro" | "rw" | "none"
enum Role {
  Admin = 0,
  User = 1
}
export interface xRole {
  name: string
  grants: Grants
}

export interface Option {
  name: string
  value: string | number
  category?: string
}

export interface AttributeMeta {
  entity?: string
  name?: string
  type: AttributeType
  componentType?: ComponentType
  showFilter?: boolean
  description?: string
  defaultValue?: any
  options?: Option[]
  cuppalabs?: ControlMultiselectCuppalabs[]
  role?: Role
  min?: number
  max?: number
  settings?: any
  children?: AttributeMetaMap
}

export interface AttributeMetaMap {
  [key: string]: AttributeMeta
}

export interface TypeEntity {
  valueMeta: AttributeMetaMap
}
export interface TypeEntityMap {
  [key: string]: AttributeMetaMap
}

export interface ControlMultiselectCuppalabs {
  options: {
    itemName: string
    id: any
  }[]
}
export interface Attribute {
  meta: AttributeMeta
  property: Property
  value: any
  path: string
}

interface TreeNodeData {
  name: string
  path: string
  meta: AttributeMeta
  value: any
  overidedBy: string[]
  property: Property
  selectedOptions?: Option[] | any
}

interface TreeNode {
  label: string
  data: TreeNodeData
  children?: TreeNode[]
  
}

@Component({
  selector: 'app-properties-editor',
  templateUrl: './properties-editor.component.html',
  styleUrls: ['./properties-editor.component.scss']
})

export class PropertiesEditorComponent implements OnInit {
  
  editMode: Mode
  // is bound to property.value or ruleValue or userValue
  targetAttributes: Modifyable<object>
  // holds the currently loaded property
  property: Property
  // holds overrided objects eq. when a ruleValue overrides the propValue
  overrides: Map<object, {source:object, key:string}[]> = new Map

  role = Role.User

  cols: any[] = [
    { field: "name", header: "Name"},
    { field: "value", header: "Value"}
  ]

  treeNodes: TreeNode[]

  // attributes: Attribute[]
  typeEntities: TypeEntityMap
  // unchangedProperty: Property

  constructor(private propertiesService: PropertiesService) { }
  
  log(...msg: any[]) {
    console.log(msg)
  }

  setOveridedBy(data: TreeNodeData) {
    const orb = this.editMode === "rulebased" ? "R" : this.editMode == "userbased" ? "U" : undefined
    if(orb)
      data.overidedBy = [orb]    
  }

  onVarValueChanged(data: TreeNodeData) {
    lodash.set(this.targetAttributes.get(), data.path, data.value)
    data.property.modification = Modification.Changed
    this.setOveridedBy(data)
    console.log(data)
  }

  onMultiSelectValuesChange(data: TreeNodeData) {
    data.value = data.selectedOptions.map(o => o.value)
    lodash.set(this.targetAttributes.get(), data.path, data.value)
    data.property.modification = Modification.Changed
    console.log("onMultiSelectValuesChange", [...data.value], data)
    if(data.name === "extends") {
      this.load(data.property, this.editMode)
    }
    this.setOveridedBy(data)
  }

  onDropdownValuesChange(data: TreeNodeData) {
    data.value = data.selectedOptions.value
    lodash.set(this.targetAttributes.get(), data.path, data.value)
    data.property.modification = Modification.Changed
    this.setOveridedBy(data)
    console.log(data)
  }

  getAttributeMetaInfo(values: any[], varName: string, parent: Attribute) {
    const entity = values['entity'];
    console.log(`getAttributeMetaInfo entity: ${entity}, name: ${varName}, parent:`, parent)
    
    const searchEntities: string[] = []

    if(parent && parent.meta.children && parent.meta.children.hasOwnProperty(varName)) {
      const childEntity = parent.meta.children[varName]
      console.log("childEntoty found", childEntity)
    }
    if(entity && this.typeEntities[entity])
      searchEntities.push(entity)

    searchEntities.push('default')

    Object.keys(this.typeEntities).forEach(key => {
      if(key !== entity && key !== 'default') {
        searchEntities.push(key)
      }
    })
    const takenEntity = searchEntities.find(e => this.typeEntities[e][varName] !== undefined) || ""
    
    const valueMetaMap = this.typeEntities[takenEntity] || {}
    let valueMeta = valueMetaMap[varName]
    console.log("takeEntity", takenEntity, "valueMetaMap", valueMetaMap, "valueMeta", valueMeta)
    const value = values[varName]

    if(!valueMeta)
      valueMeta = {
        name: varName,
        type: value instanceof Object ? 'object' : 'string' 
      }
    if(!valueMeta.componentType)
      valueMeta.componentType = valueMeta.type
    if(!valueMeta.name)
      valueMeta.name = varName
    if(valueMeta.role === undefined)
      valueMeta.role = Role.User   
    valueMeta.entity = takenEntity   
    return lodash.cloneDeep(valueMeta)
  }

  getSelectedOptions(attr: Attribute) {

    if(attr.meta.componentType === "select") {
      return attr.meta.options.find(option => option.value == attr.value)
    }

    if(attr.meta.componentType === "multiselect") {
      
      // when field is extends then remove the curretn prop from options to avoid recursion
      if(attr.meta.name === "extends") {
        const removeIndex = attr.meta.options.findIndex(o => o.value == attr.property.id)
        attr.meta.options.splice(removeIndex, 1)
      }

      const selectedOptions = []
      attr.meta.options.forEach(option => {
        if(attr.value.find(v => v == option.value))
          selectedOptions.push(option)
      })
      return selectedOptions
      // console.log("selectedOptions", key, value, selectedOptions)
    }    
  }
  
  buildAttributesEditor = (treeNodes: TreeNode[], attributes: any, parent: Attribute) => {

    const overidedBy = (varName: string): string[] => {
      const obj = this.overrides.get(attributes)
      if(!obj)
        return undefined

      const foundOverride = obj.filter(o => o.key === varName)
      return foundOverride.map(found => {
        let changedBy: string = 
          found.source == this.property.overrides.ruleValue.get() ? "R" :
          found.source == this.property.overrides.userValue.get() ? "U" : undefined
          // console.log("overidedBy", varName, foundOverride, this.property, obj)
        return changedBy
      })
    }

    
    Object.keys(attributes).forEach(key => {
      const path = parent ? parent + "." + key : key
      const attr: Attribute = {
        meta: this.getAttributeMetaInfo(attributes, key, parent),
        value: attributes[key],
        property: this.property,
        path: path
      }

      const treeNode: TreeNode = {
        label: key,
        data: {
          name: key,
          path: attr.path,
          meta: attr.meta,
          value: attr.value,
          overidedBy: overidedBy(key),
          property: this.property,
          selectedOptions: this.getSelectedOptions(attr)
        }
      }

      if(attr.meta.role >= this.role) {
        treeNodes.push(treeNode)
      }            
      console.log("attribute", attr)
      if(attr.meta.type === "object") {
        treeNode.data.meta.componentType = "object"
        treeNode.children = []
        this.buildAttributesEditor(treeNode.children, attr.value, attr)
      }
    })
  }

  load(property: Property, mode: Mode) {
    this.editMode = mode
    if(mode === "userbased")
      this.targetAttributes = property.overrides.userValue
    else if(mode == "rulebased")
      this.targetAttributes = property.overrides.ruleValue
    else
      this.targetAttributes = property.propValue
    this.property = property
    this.overrides = new Map

    const treeNodes: TreeNode[] = []
    console.log("edit property", mode, property, this.typeEntities)

    // this fillsup the overrides map to determine which attribute is overided
    const mergeCallbackWithDiffDetection = (objValue, srcValue, key: string, obj, src) => {
      // check override src would be merged into obj when obj is undefined then
      // this will not marked as overide
      if(objValue !== undefined) {
        const orObj = this.overrides.get(obj)
        if(orObj) {
          orObj.push({key, source: src})
        } else
          this.overrides.set(obj, [{key, source: srcValue}])
      }
      return mergeCallback(objValue, srcValue)
    }

    const mergeCallback = (objValue, srcValue) => {
      if (lodash.isArray(objValue)) {
        return srcValue;
      }
    }

    const mergeExtends = (merged: any, from: number[]) => {
      // console.log("mergeExtends")
      from.forEach(id => {        
        const extends_prop = this.propertiesService.getPropertyById(id)
        console.log("mergeExtends", id, extends_prop)
        const node = {}
        node[extends_prop.name] = lodash.cloneDeep(extends_prop.propValue.get())
        if(node[extends_prop.name]['extends'] !== undefined) {
          mergeExtends(node[extends_prop.name], node[extends_prop.name]['extends'])
          delete node[extends_prop.name]['extends']
        }
     
        lodash.mergeWith(merged, node, mergeCallback)
      })
    }

    // install internal attributes 
    const internals = {
      extends: []
    }
    
    const merged = {}

    // fill merged first with extends then internals and last from property
    console.log("merge internals") 
    lodash.mergeWith(merged, internals, mergeCallbackWithDiffDetection)
    const mergeSources = [
      property.propValue.get(),
      property.overrides.ruleValue.get(),
      property.overrides.userValue.get()
    ]

    mergeSources.forEach(src => {
      if(src.hasOwnProperty("extends"))
        mergeExtends(merged, src["extends"])
    })

    mergeSources.forEach(src => {
      lodash.mergeWith(merged, src, mergeCallbackWithDiffDetection)
    })

    // console.log("buildValuesEditor", merged, this.overrides)
    this.buildAttributesEditor(treeNodes, merged, null)
    this.treeNodes = [...treeNodes]
    console.log("buildValuesEditor", treeNodes)
  }

  async fetchExtendsOptions() {
    const result = await Database.queryDb("customer", 
    `
      select concat_ws('.', pt.name, p.name) as name, p.id as value, pt.name as category from properties p
        left join properties_types pt on pt.id=p.properties_types_id
      WHERE true                
        and p.properties_types_id in(11,12,13)
      #limit 1
    `)
    console.log("extendsOptions", result)
    return result as Option[]    
  }
  async ngOnInit() {
    this.typeEntities = {
      default: {
        extends: {
          type: "array",
          componentType: "multiselect",
          showFilter: true,
          // role: Role.Admin,
          //@TODO multiselect bug does not show last line so to fix it for the moment just add an unused line
          options: await (await this.fetchExtendsOptions())
            .concat([{name: "none", value: "none"}])
        },
        xextends: {
          type: "array",
          componentType: "multiselect-cupalabs",
          showFilter: true,
          settings: {
            primaryKey: 'value',
            labelKey: 'name',
            singleSelection: false,
            enableSearchFilter: true,
            groupBy: "category",
            badgeShowLimit: 5
          },
          // role: Role.Admin,
          //@TODO multiselect bug does not show last line so to fix it for the moment just add an unused line
          options: await (await this.fetchExtendsOptions())
        },        
        entity: {
          type: "string",
          role: Role.Admin
        },
        value: {
          type: "number",
          defaultValue: 0
        },
        period: {
          type: "period",
          componentType: "select",
          options: [
            { name: '1 Day', value: "1d" },
            { name: '1 Week', value: "7d" },
            { name: '1 Month', value: "1m" },
            { name: 'CalendarMonth', value: "1M" }
          ],
          defaultValue: "1d",
          description: "select period for this property"
        },
        determineActivationDelay: {
          type: "boolean",
          defaultValue: true
        },     
        validator: {
          type: "object"
        },
        "validator.period": {
            type: "string"
        },
        activationDelay: {
          type: "number",
          componentType: "select",
          options: [
            { name: '1 Day', value: "1d" },
            { name: '1 Week', value: "7d" },
            { name: '1 Month', value: "1m" },
            { name: 'CalendarMonth', value: "1M" }
          ],
          defaultValue: "1d",
          description: "sets the activation delay in minutes!"
        },

      },
      periodicLimit: {
        validator: {
          type: "object",
          children: {
            period: {
              type: "string"
            },
            value: {
              type: "number"
            }
          }
        },
        xperiod: {
          type: "string",
          componentType: "multiselect",
          options: [
            { name: '1 Day', value: "1d" },
            { name: '1 Week', value: "7d" },
            { name: '1 Month', value: "1m" },
            { name: 'CalendarMonth', value: "1M" }
          ],
          defaultValue: "1d",
          description: "select period for this property"
        },
      },
      limits: {
        disableWhenValue0: {
          type: "boolean",
          defaultValue: true,
          description: "when true and value is set to 0 then this limit is infinite"
        },
        restrictedChange: {
          type: "number",
          componentType: "select",
          options: [
            { name: 'None', value: 0 },
            { name: 'Increase', value: 1 },
            { name: 'Decrease', value: 2 },
            { name: 'Both', value: 3 }
          ],
          defaultValue: 1,
          description: "select further restrictions after change"
        }
      },
      notifications: {
        group: {
          type: "string",
          componentType: "select",
          options: await Database.queryDb("customer", 
            "select name, value from maps where `group`='notifications.groups'")
        },        
        targets: {
          type: "array",
          componentType: "multiselect",
          options: await Database.queryDb("customer", 
            "select name, value from maps where `group`='notifications.targets'")
        },
        changeType: {
          type: "number",
          min: 0,
          max: 2
        }
      }
    
    }
    console.log("onInit", this.typeEntities)
  }

}
