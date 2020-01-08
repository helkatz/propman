import * as lodash from 'lodash'
import { RootRenderer } from '@angular/core'
import * as _ from 'lodash'
namespace internal {
    export type RecursionMap = Map<object, string>
    export interface Difference {
        path: string
        type: "changed"|"added"|"removed"
        obj1: any
        obj2: any
    }
    export let depth = 0
    export function getDifference(path: string, diffs: Difference[], recursionMap: RecursionMap, obj1, obj2) {
        const doLog = false
        if(depth++ > 20)
            return
        const extendPath = (next) => path.length ? path + "." + next : next
        const getType = (obj: any) => {
            if(_.isArray(obj))
                return "plainArray"            
            if(_.isPlainObject(obj))
                return "plainObject"
            return typeof obj

        }
        if(doLog) console.group(`getDifference ${path} ${getType(obj1)} ${getType(obj2)}`)
        if(obj1 !== undefined && obj2 !== undefined && typeof obj1 !== typeof obj2) {
            diffs.push({
                path: path,
                type: `changed`,
                obj1, obj2
            })
            if(doLog) console.log("type changed")
        }
        else if(lodash.isArray(obj1)) {
            if(doLog) console.log("check array")
            if(obj2.length > obj1.length)
                obj2.forEach((v, i) => getDifference(`${path}[${i}]`, diffs, recursionMap, obj1[i], obj2[i]))
            else
                obj1.forEach((v, i) => getDifference(`${path}[${i}]`, diffs, recursionMap, obj1[i], obj2[i]))
        } 
        else if(lodash.isPlainObject(obj1)) {
            if(doLog) console.log("check plain object")

            const obj = recursionMap.get(obj1)
            if(obj !== undefined) {
                if(doLog) console.warn(`###### found in recursion ${obj} ${path}`)
                return
            }
            recursionMap.set(obj1, path)


            const keys = Object.keys({...obj1, ...obj2})
            keys.forEach(k => {
                if(doLog) console.log(`check object.member ${k} ${getType(obj1[k])}`)
                // if(k == "parent")
                //     return
                if(obj1[k] !== undefined && obj2[k] === undefined) {
                    if(doLog) console.log("removed")
                    diffs.push({
                        path: extendPath(k),
                        type: `removed`,
                        obj1: obj1[k],
                        obj2: obj2[k]
                    })
                }
                else if(obj1[k] === undefined && obj2[k] !== undefined) {
                    if(doLog) console.log("added")
                    diffs.push({
                        path: extendPath(k),
                        type: `added`,
                        obj1: obj1[k],
                        obj2: obj2[k]
                    })
                }
                else {
                    
                    getDifference(extendPath(k), diffs, recursionMap, obj1[k], obj2[k])
                }
            })

        } else {
            if(obj1 !== obj2) {
                diffs.push({
                    path: path,
                    type: "changed",
                    obj1, obj2
                })
    
                if(doLog) console.log(`diff ${path} ${obj1} !== ${obj2}`)
            }
        }
        if(doLog) console.groupEnd()
        depth--
    }   
}
export class Utils {
    static extend(obj1, obj2) {

        for (var p in obj2) {
          try {
            // Property in destination object set; update its value.
            if ( obj2[p].constructor==Object ) {
              obj1[p] = Utils.extend(obj1[p], obj2[p]);      
            } else {
              obj1[p] = obj2[p];      
            }      
          } catch(e) {
            // Property in destination object not set; create it and set its value.
            obj1[p] = obj2[p];      
          }
        }      
        return obj1;
    }
    // picks fields from an json object|array
    static json_pick(obj: Object | Array<any>, pickFields: Array<string>, options?: {
        depth?: number,
        pickEmptyArray?: boolean
        pickEmptyObject?: boolean}
        ) {
        // console.log(obj, pickFields)
        if(options === undefined) options = {}
        if(options.depth === undefined) options.depth = 1
        if(options.pickEmptyArray === undefined) options.pickEmptyArray = true
        if(options.pickEmptyObject === undefined) options.pickEmptyObject = true
        
        const recursivePick = (obj: Object | Array<any>, parentPath: string, options) => {
            const extendPath = (key: string) => parentPath.length ? parentPath + "." + key : key
            let ret
            if (options.depth < 0)
                return ret


            if (obj instanceof Array) {
                if(obj.length === 0 && options.pickEmptyArray) {
                    ret = []
                }
                obj.map((v, i) => {
                    const o = recursivePick(v, `${parentPath}[${i}]`, options)
                    if ( false && !(o instanceof Object || o instanceof Array)) {
                        return ret
                    }
                    if (o !== undefined) {
                        ret = ret || []
                        ret.push(o)
                    }
                })
            } else if (obj instanceof Object) {
                Object.keys(obj).map(k => {
                    const tmpOptions = {...options}
                    tmpOptions.depth--
                    const path = extendPath(k)
                    const o = recursivePick(obj[k], path, tmpOptions)
                    // console.log('picked o', k, obj[k], o)
                    if (o === undefined || o === null)
                        return ret
                    
                    if (
                        (
                            (o instanceof Array && (options.pickEmptyArray || o.length > 0)
                            || o instanceof Object && (options.pickEmptyObject || Object.keys(o).length > 0)
                            || (pickFields.indexOf(k) > -1 || pickFields.indexOf("*") > -1)
                        )
                        && pickFields.indexOf("!" + k) == -1)
                    ) {
                        // console.log('xpicked o', k, obj[k], o, pickFields.indexOf("!" + k))
                        // console.log('found', o)
                        ret = ret || {}
                        ret[k] = o
                    }
                })
            } else
                ret = obj
            return ret
        }
        return recursivePick(obj, "", options)
    }

    static getDifference(obj1, obj2) {
        internal.depth = 0
        const recursionMap: internal.RecursionMap = new Map
        const diffs: internal.Difference[] = []
        internal.getDifference("", diffs, recursionMap, obj1, obj2)
        return diffs
    }
}

export class Breakable {
    static execute(fn: (breakable: Breakable) => any) {
        const breakable = new Breakable
        try {
            fn(breakable)
        } catch (o) {
            // console.log('braked', o)
            // when not a nested one
            if (o.self === breakable)
                return o.value
            throw o
        }
    }

    return(value: any) {
        throw {value: value, self: this}
    }

    returnWithWhen(value: any, condition: boolean) {
        if (condition) throw {value: value, self: this}
    }

    breakWWhenNEq(except: any, value: any) {
        if (except !== value) throw {value: value, self: this}
    }

    breakWWhenTrue(value: boolean) {
        if (value) throw {value: value, self: this}
    }

}
