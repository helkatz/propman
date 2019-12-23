import { Component, OnInit } from '@angular/core';
import { Property, PropertiesService } from '../services/properties.service';
import * as prime from 'primeng/api';
import { Database } from '../lib/database';
import { ValueTransformer } from '@angular/compiler/src/util';
import { Entity } from 'angular2-query-builder/dist/components';
import { TouchBarSegmentedControlConstructorOptions } from 'electron';
import * as lodash from 'lodash'
import * as difflib from 'deep-object-diff';
// the real type of the value 
type ValueType = "boolean" | "number" | "double" | "string" | "period" | "object" | "array"

// the type for the component to edit an value
type ComponentType = ValueType | "select" | "multiselect"

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
}

export interface ValueMeta {
  name?: string
  type: ValueType
  componentType?: ComponentType
  description?: string
  defaultValue?: any
  options?: Option[]
  role?: Role
}

export interface ValueMetaMap {
  [key: string]: ValueMeta
}

export interface TypeEntity {
  valueMeta: ValueMetaMap
}
export interface TypeEntityMap {
  [key: string]: ValueMetaMap
}

export interface Value {
  meta: ValueMeta
  value: any
}

interface TreeNodeData {
  name: string
  path: string
  meta: ValueMeta
  value: any
  isOverride: boolean
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
  role = Role.User
  tt = "hallo"
  cols: any[] = [
    { field: "name", header: "Name"},
    { field: "value", header: "Value"}
  ]
  treeNodes: TreeNode[]

  myvalue = true
  values: Value[]
  typeEntities: TypeEntityMap


  constructor(private propertiesService: PropertiesService) { }
  
  log(msg: any) {
    console.log(msg)
  }

  onVarValueChanged(data: TreeNodeData) {
    lodash.set(data.property.additional, data.path, data.value)
    console.log(data)
  }

  onMultiSelectValuesChange(data: TreeNodeData) {
    data.value = data.selectedOptions.map(o => o.value)
    lodash.set(data.property.additional, data.path, data.value)
    console.log("data", [...data.value], data)
    if(data.name === "extends") {
      
      // data.value.forEach(id => {
      //   const prop = this.propertiesService.getPropertyById(id)
      //   if(!data.property.extends.find(p => p.id === prop.id)) {
      //     console.log("apply extends", prop)
      //     data.property.extends.push(prop)
      //   }
      // })      
      this.load(data.property)
    }
    // this.load(data.property)
    console.log("data", data)
  }

  onDropdownValuesChange(data: TreeNodeData) {
    data.value = data.selectedOptions.value
    lodash.set(data.property.additional, data.path, data.value)
    console.log(data)
  }


  load(property: Property) {
    const treeNodes: TreeNode[] = []
    console.log("edit property", property, this.typeEntities)

    const treeNodeMap: Map<string, TreeNode> = new Map
    let values: Value[] = []
    const overrides: Map<object, string[]> = new Map
    
    const findTypeInfo = (values: any[], varName: string) => {
      const entity = values['entity'];
      // console.log("entity", entity, this.typeEntities)
      
      const searchEntities: ValueMetaMap[] = []
      if(entity && this.typeEntities[entity])
        searchEntities.push(this.typeEntities[entity])

      searchEntities.push(this.typeEntities['default'])

      Object.keys(this.typeEntities).forEach(key => {
        if(key !== entity && key !== 'default') {
          searchEntities.push(this.typeEntities[key])
        }
      })

      const valueMetaMap = searchEntities.find(e => e[varName] !== undefined) || {}
      let valueMeta = valueMetaMap[varName]

      const value = values[varName]

      if(!valueMeta)
        valueMeta = { 
          type: value instanceof Object ? 'object' : 'string' 
        }
      if(!valueMeta.componentType)
        valueMeta.componentType = valueMeta.type
      if(!valueMeta.name)
        valueMeta.name = varName
      if(valueMeta.role === undefined)
        valueMeta.role = Role.User      
      return lodash.cloneDeep(valueMeta)
    }

    const buildValuesEditor = (treeNodes: TreeNode[], values: any, parent: string) => {
      const isOverride = (varName: string) =>{
        const obj = overrides.get(values)
        return obj && obj.find(name => name === varName) !== undefined
      }
      Object.keys(values).forEach(key => {
        // console.log("isOverride", isOverride(key))
        const value = values[key]
        const path = parent ? parent + "." + key : key
        let valueMeta = findTypeInfo(values, key) //typeEntity[key] || this.typeEntities['default'][key]

        let selectedOptions: Option[] | any
        if(valueMeta.componentType === "multiselect" || valueMeta.componentType === "select") {
          
          // when field is extends then remove the curretn prop from options to avoid recursion
          if(key === "extends") {
            const removeIndex = valueMeta.options.findIndex(o => o.value == property.id)
            valueMeta.options.splice(removeIndex, 1)
          }
          valueMeta.options.forEach(o => {
            if(valueMeta.componentType === "select") {
              if(o.value == value)
                selectedOptions = o
            } else {
              // if(key == "extends")
              //   console.log("extends", value, o)
              selectedOptions = []
              value.find((v) => {
                
                if(v == o.value) {
                  console.log("selectedOptions.push", v, o)
                  selectedOptions.push(o)
                }
              })
            }
          })
          console.log("selectedOptions", key, value, selectedOptions)
        }

        
        let treeNode = treeNodeMap.get(path)
        if(treeNode) {
          // treeNode.data.
        }
        else {
          treeNode = {
            label: key,
            data: {
              name: key,
              path,
              meta: valueMeta,
              value: value,
              isOverride: isOverride(key),
              property: property,
              selectedOptions
            }
          }
          if(valueMeta.role >= this.role) {
            treeNodes.push(treeNode)
          }            
        }



        if(valueMeta.type === "object") {
          treeNode.data.meta.componentType = "object"
          treeNode.children = []
          buildValuesEditor(treeNode.children, value, path)
        }
      })
    }
    
    // install internals those are alos additionals but reserved
    const internals = {
      // entity: 'internal',
      extends: []
    }
    
    const mergeCallbackWithDiffDetection = (objValue, srcValue, key, obj, src) => {
      // check override src would be merged into obj when obj is undefined then
      // this will not marked as overide
      const diff = difflib.detailedDiff(objValue, srcValue)
      if(objValue !== undefined) {
        const orObj = overrides.get(obj)
        if(orObj) {
          orObj.push(key)
        } else
          overrides.set(obj, [key])
        console.log(`diff ${key} ${objValue} => ${srcValue}`, obj, src, src[key] === obj[key])
      }
      return mergeCallback(objValue, srcValue)
    }
    const mergeCallback = (objValue, srcValue) => {

      if (lodash.isArray(objValue)) {
        return srcValue;
      }
    }

    const mergeExtends = (merged: any, from: number[]) => {
      from.forEach(id => {        
        const extends_prop = this.propertiesService.getPropertyById(id)
        console.log("mergeExtends", id, extends_prop)
        const node = {}
        node[extends_prop.name] = extends_prop.additional
         
        mergeExtends(node[extends_prop.name], extends_prop.additional['extends'])

        // extends should not be in merged save it and add it later again
        const saveExtends = extends_prop.additional['extends']
        delete extends_prop.additional['extends']
        lodash.mergeWith(merged, node, mergeCallback)
        extends_prop.additional['extends'] = saveExtends
      })
    }

    const merged = {}
    // fill merged first with extends then internalsand last from property
    console.log("merge internals") 
    lodash.mergeWith(merged, internals, mergeCallbackWithDiffDetection)
 
    mergeExtends(merged, property.additional['extends'])
    console.log("merge property.additional") 
    lodash.mergeWith(merged, property.additional, mergeCallbackWithDiffDetection)

    console.log("buildValuesEditor", merged, overrides)
    buildValuesEditor(treeNodes, merged, null)
    // buildValuesEditor(treeNodes, internals, null)

    // now handle all property additionals
    // buildValuesEditor(treeNodes, property.additional, null)


    this.treeNodes = [...treeNodes]
  }

  async ngOnInit() {
    this.typeEntities = {
      default: {
        extends: {
          type: "array",
          componentType: "multiselect",
          // role: Role.Admin,
          options: await Database.queryDb("customer", 
            `
              select name, id as value from properties p
              WHERE p.id in(SELECT min(id) from properties 
              group by concat_ws('/', name, properties_types_id, properties_groups_id))
            `)

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
          type: "number"
        }
      }
    
    }
    console.log("onInit", this.typeEntities)
  }

}
