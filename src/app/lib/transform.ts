// import { TreeNode } from "primeng/primeng"
import { Breakable } from "./helper"
import * as _ from "lodash"
import { keyframes } from "@angular/animations"

interface Node {
    children?: Node[]
    parent?: Node
}

export interface TraverseCallBackParams<T = any> {
    path?: string
    key?: string | number
    value?: T
    parent?: TraverseCallBackParams<T>
}


export class Transform {
    static traverse = (obj: Object | [], fn: (o: TraverseCallBackParams) => boolean|void) => {
        const traverse = (obj, params?: TraverseCallBackParams) => {
            const extendPath = (key) => params.path ? params.path + "." + key : key
            if(obj instanceof Array) {
                obj.forEach((v, i) => {
                    const path = `${extendPath(params.key)}[${i}]`
                    traverse(obj[i], {
                        path, key: i, value: v, parent: params
                    })
                })
            } else if(obj instanceof Object) {
                if(params.parent) fn(params)
                Object.keys(obj).forEach(k => {
                    const o = obj[k]
                    traverse(o, {path: extendPath(k), key: k, value: o, parent: params})
                })
            }
        }
        traverse(obj, {key: "", value: obj})
    }

    static set<T>(obj: T, path: string, value) {
        const keys = path.split(".")
        for(let i = 0; i < keys.length - 1; i++) {
            let key = keys[i]
            if(!obj[key]) obj[key] = {}
            obj = obj[key]
        }
        let key = keys[keys.length - 1]
        if(!obj[key]) 
            obj[key] = value
        else if(value instanceof Object) {
            Object.assign(obj[key], value)
        }
        else
          obj[key] = value          
    }
  
    static forEachUp<TreeNode extends Node>(root: TreeNode | TreeNode[], fn: (node: TreeNode) => any) {
        if(root instanceof Array) {
            root.forEach(e => Transform.forEachUp(e, fn))
        }
        
        let node = root as TreeNode
        return Breakable.execute(ba => {
            ba.breakWWhenNEq(undefined, fn(node))
            while (node.parent) {
                node = node.parent as TreeNode
                ba.breakWWhenNEq(undefined, fn(node))
            }
        })
    }

    static forEachDown<TreeNode extends Node>(root: TreeNode | TreeNode[]
        , fn: (node: TreeNode, parent?: TreeNode) => any
        , options: {
            excludeSelf?: boolean
            onlyNodeWithChild?: boolean
        } = {}) {
        options = {...{
            excludeSelf: false,
            onlyNodeWithChild: false

            }, ...options
        }
        if(root instanceof Array) {
            root.forEach(e => Transform.forEachDown(e, fn, options))
            return
        }

        let node: TreeNode = root as TreeNode
        // console.log(`forEachDown`, options, node)
        if(options.onlyNodeWithChild && (node.children === undefined || !node.children.length))
            return

        if (!options.excludeSelf) fn(node)
        if (node.children)
            node.children.forEach(node => Transform.forEachDown(node as TreeNode, fn, options))
    }    

    static tree<Target, Source>(to: Target[], from: Source[] | Map<any, any>        
        , options: {
            groupBy?: string[]          // groups by fields
            groupBySeperator?: string   // groups groupBy field also by seperator default is dot
            nodeNameField?: string      // declares the nodeNameField default is name
            labelNameField?: string     // declares the labelName default is name
            autoApply?: boolean         // applies all from.fields to the node
            apply?: (to: Target, from: Source) => void
        } = {}) {
                
        options = {
            ...{
                groupBySeperator: ".",
                nodeNameField: "name",
                labelNameField: "name",
                autoApply: true
            }, 
            ...options
        }

        const addNodes = (name: string, parent: Node, nodes: Node[], from: Source) => {
            console.log("addNodes", name, from)
            // console.log("addNodes parent", parent, "toNodes", _.cloneDeep(nodes), "from", _.cloneDeep(from))
            let applyFrom = options.autoApply ? from : {}
            let nodePath = parent ? parent['nodePath'] +  "." +  name : name
            let node: Target = Object.assign({}, applyFrom, {
                children: [],
                parent,
                nodePath
            } as any)

            node[options.labelNameField] = name //from[options.nodeNameField]
            if(options.apply) {
                options.apply(node, from)
            }

            nodes.push(node)

            parent = nodes[nodes.length - 1]     
            if(from['children']) {
                parent['children'] = []
                from['children'].forEach(e => {
                    addNodes(e[options.nodeNameField], parent,  parent.children, e)
                })
            }
            return node
        }

        const doForObject = (o: any) => {
            let treeNodes = to;
            let parent = undefined
            let path = ""
            let nodeName = o[options.nodeNameField]
            // console.log("doForObject", o)
            if(options.groupBy) {
                options.groupBy.forEach(groupName => {
                    const isGroupByLabelName = groupName === options.nodeNameField
                    let name = o[groupName]
                    if(!name)
                        return
                    // console.log("groupBy", isGroupByLabelName, name)
                    let names = name.split(options.groupBySeperator)

                    // when group by label name then the labelname is the last group
                    if(isGroupByLabelName) {
                        nodeName = names.splice(names.length - 1)[0]
                        // o[groupName] = o.name
                    }
                    // console.log("groupBy", groupName, names)
                    names.forEach(name => {
                        path = path.length ? path + "." + name : name
                        let node = treeNodes.find((e) => e[options.nodeNameField] == name)
                        // console.log(`groupBy ${name} found`
                        //     , _.cloneDeep(node), "searched in treeNodes"
                        //     , _.cloneDeep(treeNodes))
                        
                        if(!node) {
                            node = Object.assign({
                                label: name,
                                name
                            })
                            node = addNodes(name, parent, treeNodes, node as any)
                        }

                        treeNodes = node['children']
                        // node[groupName] = name
                        parent = node
                        // o[groupName] = name
                        
                    })
                })
                // console.log("base treeNodes", treeNodes)
            }
            addNodes(nodeName, parent, treeNodes, o)
            // return  

            
        }
        if(from instanceof Map) {
            from.forEach(o => {
                doForObject(o)
            })
        }
        else if(from instanceof Array) {
            from.forEach((o) => doForObject(o))
        }
        // console.log("done", to)
        Transform.forEachDown(to as Node, node => {
            node.children.sort(v => v.children !== undefined && v.children.length > 0 ? -1 : 1)
            // console.log(`tree ${node['nodePath']}`, node)
        }, {onlyNodeWithChild: true})
        // console.groupEnd()
        return to
    }
}