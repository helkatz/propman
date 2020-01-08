import { Breakable } from "./helper"
import { types } from "./types"
import * as _ from "lodash"
import { constants } from "os"

export namespace hklib {
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
    
    export function traverse<T extends Object | []>(
        obj: T, 
        fn: (o: TraverseCallBackParams<types.Unpacked<T>>) => boolean|void,
        options?: {
          onlyNodes?: string[],
          ignoreArray?: Boolean,
          ignoreObject?: Boolean,
          ignorePlain?: Boolean
        }) {

        if(!options) options = {}
        options = {...{
            onlyNodes: [],
            ignoreArray: false,
            ignoreObject: false,
            ignorePlain: false
        }, ...options}
        const passNode = (params?: TraverseCallBackParams) => {
            console.log("passNode",params.parent.value instanceof Array,
                options.onlyNodes, params.key)
            if(params.parent.value instanceof Array) {
                
                return false
            }
            return options.onlyNodes.length && !options.onlyNodes.find(v => v === params.key)
        }
        let depth = 0
        const traverse = (obj, params?: TraverseCallBackParams) => {
            if(depth++ > 40)
                return
            const dolog = true
            const extendPath = (key) => params.path ? params.path + "." + key : key
            // console.log("dofor", obj, params)

            const call = () => {
            if(params.parent) {
                if(dolog) if(dolog) console.log("callfn", params)
                fn(params)
            }
            }
            if(obj instanceof Array) {
                if(dolog) console.group("array", params.path, obj, params.parent)
                if(!options.ignoreArray) call()
                obj.forEach((v, i) => {
                    let path = `[${i}]`
                    path = params.path ? params.path + path : path
                    // log(path, v)
                    
                    traverse(obj[i], {
                        path, key: i, value: v, parent: params
                    })
                })
                // logGroupEnd()
                if(dolog) console.groupEnd()
            } else if(obj instanceof Object) {
                if(dolog) console.group("object", params.path, obj, params.parent)
                // if(dolog) console.log("parent is array", !(params.parent.value instanceof Array))
                if(passNode(params)) {
                    if(dolog) console.groupEnd()
                    depth--
                    return
                }

                if(!options.ignoreObject) call()
                Object.keys(obj).forEach(k => {
                    const o = obj[k]
                    traverse(o, {path: extendPath(k), key: k, value: o, parent: params})
                })
                if(dolog) console.groupEnd()
            } else {
                if(dolog) console.log("value", params.path, obj, params.parent)
                if(!options.ignorePlain) call()
            }
            depth--
        }
        traverse(obj, {key: "", value: obj})
    }

    function set<T>(obj: T, path: string, value) {
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
  
    export function forEachUp<TreeNode extends Node>(root: TreeNode | TreeNode[], fn: (node: TreeNode) => any) {
        if(root instanceof Array) {
            root.forEach(e => forEachUp(e, fn))
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
    export function forEachDown<TreeNode extends Node>(root: TreeNode | TreeNode[]
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
        const forEachDown = (node, parent) => {
            if(node instanceof Array) {
                node.forEach(e => forEachDown(e, parent))
                return
            }

            // let node: TreeNode = node as TreeNode
            // console.log(`forEachDown`, options, node)
            if(options.onlyNodeWithChild && (node.children === undefined || !node.children.length))
                return

            if (!options.excludeSelf) fn(node, parent)
            if (node.children) forEachDown(node.children, node)
                // node.children.forEach(child => forEachDown(child as TreeNode, node))
        }
        forEachDown(root, undefined)
    }     

    export function toTree<Target, Source>(to: Target[], from: Source[] | Map<any, any>        
        , options: {
            groupBy?: string[]          // groups by fields
            groupBySeperator?: string   // groups groupBy field also by seperator default is dot
            nodeNameField?: string      // declares the nodeNameField default is name
            labelNameField?: string     // declares the labelName default is name
            autoApply?: boolean         // applies all from.fields to the node
            sortChildren?: boolean 
            apply?: (to: Target, from: Source) => void
        } = {}) {
                
        options = {
            ...{
                groupBySeperator: ".",
                nodeNameField: "name",
                labelNameField: "name",
                autoApply: false,
                sortChildren: false
            }, 
            ...options
        }

        const addNodes = (name: string, parent: Node, nodes: Node[], from?: Source) => {
            // console.log("addNodes", name, from)
            // console.log("addNodes parent", parent, "toNodes", _.cloneDeep(nodes), "from", _.cloneDeep(from))
            let applyFrom = options.autoApply && from ? from : {}
            let nodePath = parent ? parent['nodePath'] +  "." +  name : name
            let node: Target = Object.assign({}, applyFrom, {
                children: [],
                parent,
                nodePath
            } as any)
            if(from)
                node['data'] = from
            node[options.labelNameField] = name //from[options.nodeNameField]
            if(options.apply) {
                options.apply(node, from)
            }

            nodes.push(node)

            parent = nodes[nodes.length - 1]     
            if(from && from['children']) {
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
                    let name = _.get(o, groupName)
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
                        let node = treeNodes.find((e) => e[options.labelNameField] == name)
                        // console.log(`groupBy ${name} found`
                        //     , _.cloneDeep(node), "searched in treeNodes"
                        //     , _.cloneDeep(treeNodes))
                        
                        if(!node) {
                            node = Object.assign({
                                label: name,
                                name
                            })
                            // console.log("groupby.addNodes", name)
                            node = addNodes(name, parent, treeNodes)
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
        if(options.sortChildren) {
            forEachDown(to as Node, node => {
                node.children.sort(v => v.children !== undefined && v.children.length > 0 ? -1 : 1)
                // console.log(`tree ${node['nodePath']}`, node)
            }, {onlyNodeWithChild: true})
        }
        // console.groupEnd()
        return to
    }  
}