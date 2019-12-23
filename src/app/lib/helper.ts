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

        let ret
        if (options.depth < 0)
            return ret


        if (obj instanceof Array) {
            if(obj.length === 0 && options.pickEmptyArray) {
                ret = []
            }
            obj.map(k => {
                const o = Utils.json_pick(k, pickFields, options)
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
                const o = Utils.json_pick(obj[k], pickFields, tmpOptions)
                // console.log('picked o', k, obj[k], o)
                if (o === undefined || o === null)
                    return ret
                // console.log('picked o', k, obj[k], o)
                if (o instanceof Array && (options.pickEmptyArray || o.length > 0)
                    || o instanceof Object && (options.pickEmptyObject || Object.keys(o).length > 0)
                    || (pickFields.indexOf(k) > -1 || (pickFields.indexOf("*") > -1) &&
                        pickFields.indexOf("!" + k) === -1)
                ) {
                    // console.log('found', o)
                    ret = ret || {}
                    ret[k] = o
                }
            })
        } else
            ret = obj
        return ret
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
