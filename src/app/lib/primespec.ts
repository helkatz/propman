// import { TreeNode } from "primeng/api"
import { Breakable } from "./helper"
interface Node {
    children?: Node[]
    parent?: Node
}
export class XPrime {
    static forEachDown<TreeNode extends Node>(root: TreeNode | TreeNode[], fn: (node: TreeNode) => any) {
        if(root instanceof Array) {
            root.forEach(e => XPrime.forEachDown(e, fn))
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

    static forEachUp<TreeNode extends Node>(root: TreeNode | TreeNode[]
        , fn: (node: TreeNode) => any, excludeSelf: boolean = false) {
        if(root instanceof Array) {
            root.forEach(e => XPrime.forEachUp(e, fn))
            return
        }        
        let node: TreeNode = root as TreeNode
        if (!excludeSelf) fn(node)
        if (node.children)
            node.children.forEach(node => XPrime.forEachUp(node as TreeNode, fn))
    }
}