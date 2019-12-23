import { TreeNode } from "primeng/primeng"

export class Transform {
    static tree<Target, Source>(to: Target[], from: Source[] | Map<any, any>
        , options: {
            groupBy?: string[]
            groupBySeperator?: string
            data?: (Source) =>any
            apply?: (Target, Source) => void
        } = {}) {
        
        options = {...{groupBySeperator: "."}, ...options}
        // console.group("Transform.tree, options", options, "from", from)

        const addNode = (parent: Target, from: Source) => {
            let node: Target = Object.assign({
                name: from['name'],
                children: [],
                data: options.data ? options.data(from) : from,
                parent
            })
            let children: Target[]

            if(from['children']) {
                // parent['children'] = []
                from['children'].forEach(e => {
                    node['children'].push(addNode(node, e))
                })
            }
            return node
        }
        const addNodes = (parent: Target, nodes: Target[], from: Source) => {

            let children: Target[]
            // console.log("addNodes", parent, nodes, from)
            const node: Target = Object.assign({}, from as any, {
                children: [],
                parent
            })

            if(options.apply) {
                options.apply(node, from)
            }

            nodes.push(node)

            parent = nodes[nodes.length - 1]     
            if(from['children']) {
                parent['children'] = []
                from['children'].forEach(e => {
                    addNodes(parent,  parent['children'], e)
                })
            }
            return node
        }

        const doForObject = (o: any) => {
            let treeNodes = to;
            let parent = undefined
            if(options.groupBy) {
                options.groupBy.forEach(name => {
                    const isGroupByLabelName = name === "name"
                    name = o[name]
                    if(!name)
                        return
                    // console.log("groupBy", isGroupByLabelName, name)
                    let names = name.split(options.groupBySeperator)
                    if(isGroupByLabelName) {
                        o.name = names.splice(names.length - 1)[0]
                        
                    }
                    // console.log(names)
                    names.forEach(name => {
                        let node = treeNodes.find((e) => e['name'] == name)
                        // console.log(`groupBy ${name} found ${node}`, o)
                        
                        if(!node) {
                            // treeNodes.push(addNode(parent, o))
                            
                            let children: Target[] = []

                            node = Object.assign({
                                label: name,
                                name
                            })
                            node = addNodes(parent, treeNodes, node as any)
                            /*node = Object.assign({
                                label: name,
                                children: children,
                                parent: parent
                            })*/
                            // treeNodes.push(node)
                            
                            // console.log(`node created`, node)
                        }
                        treeNodes = node['children']
                        
                        parent = node
                        
                    })
                })
                // console.log("base treeNodes", treeNodes)
            } else {
                // addNodes(parent, treeNodes, o)
            }
            addNodes(parent, treeNodes, o)
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
        // console.groupEnd()
        return to
    }
}