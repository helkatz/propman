import { Injectable, OnInit } from '@angular/core'
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'
import { map, catchError } from 'rxjs/operators'
import { throwError, config, Observable, Subject } from 'rxjs'
import { Utils, Breakable } from '../lib/helper'
import { ConfigService, Environment } from './config.service';
// import * as data from './data/definitions'
import * as qb from "angular2-query-builder";
import { Database } from '../lib/database'
import { ChildActivationEnd } from '@angular/router'
import { XPrime } from '../lib/primespec'
import { stringify } from 'querystring'
import { ThrowStmt } from '@angular/compiler'
import { Transform } from '../lib/transform'
import * as lodash from 'lodash'
import * as difflib from 'deep-object-diff';

export enum Modification {
    NoAvailable, None, Changed, Removed, Added
}

export interface WatchSubject<T> {
    subject: T
    change: "removed" | "added" | "modified" | "selected"
}

export class AvailableGroup
{
    name: string
    values: Map<number, string> = new Map
}

export type PropertiesTarget = "excluded" | "applied"

export interface GroupPropertiesMap {
    [key: string]: number[]
}

export interface Group {
    name: string
    inheritFromParent?: boolean
    properties?: number[]
    properties_new?: GroupPropertiesMap
    children?: Group[]
    parent?: Group
}

export interface Condition {
    when: string
}

export interface Rule {
    id?: number
    name: string    
    parent?: Rule
    description: string
    inheritFromParent: boolean
    query?: qb.RuleSet
    groups?: Group[]
    children?: Rule[]
}
export interface PropertyExtends {
    id: number
    name: string
    additional: object
}
export interface Property {
    id: number
    type: string
    group: string
    name: string
    path: string
    additional: object
    extends?: number[]
    children?: Property[]
    parent?: Property
}
interface Data {
    rules?: Rule[],
    groups?: Group[]
    propeties?: Property[]    
}
@Injectable({ providedIn: 'root' })
export class PropertiesService implements OnInit {
    // private data: any
    
    private data: Data = {}
    private unchangedData: Data = {}

    private selectedRule: Rule
    
    private selectedGroup: Group

    public watchGroups = new Subject<WatchSubject<Group>>();
    public watchRules = new Subject<Rule>();

    constructor(private http: HttpClient
        , private configService: ConfigService) {
        setInterval(async () => {
            const changes = await Database.getSession("customer").hasChanges("properties", "table2")
            
            if(changes) {
                console.info("tableChange detected", changes)
                this.data.propeties = undefined
                this.watchRules.next(this.selectedRule)
            }
        }, 1000);
    }

    addRule = (parent: Rule, rule: Rule) => {
        if(!rule.groups) {
            rule.groups = [{
                name: "root",
                properties_new: {}
            }]
        }
        if(!parent) {
            this.data.rules.push(rule)
        } else {
            parent.children.push(rule)
            rule.parent = parent
        }
        this.selectRule(rule)
        return rule
    }

    getRule = (name: string) => {
        return this.data.rules.find(r => r.name === name)
    }

    getRules = async () => {
        if(this.data.rules)
            return this.data.rules
        await this.loadRules()
        return this.data.rules   
    }

    selectRule(rule: Rule) {
        this.selectedRule = rule
        this.selectGroup(undefined)
        this.watchRules.next(rule)
        
    }

    selectGroup(group: Group) {
        this.selectedGroup = group
        this.watchGroups.next({subject: group, change: "selected"})
    }

    getGroupProperties(target: PropertiesTarget = "applied") {
        const group = this.selectedGroup
        if(!group.properties_new) group.properties_new = {}
        if(!group.properties_new[target]) group.properties_new[target] = []
        return group.properties_new[target]
    }

    addPropertiesToGroup(properties: Property[], target: PropertiesTarget = "applied") {
        
        const group = this.selectedGroup
        const targetProperties = this.getGroupProperties(target)
        console.log("properties", [...targetProperties])
        const removeApplied = (prop: Property) => {
            if(prop.parent) {
                removeApplied(prop.parent)
                return
            }

            prop.children.forEach(prop => {
                this.removePropertiesFromGroup([prop], target)
            });
            this.removePropertiesFromGroup([prop], target)
        }

        properties.forEach(prop => {
            removeApplied(prop)
            targetProperties.push(prop.id)
        })
        this.watchGroups.next({subject: group, change: "modified" })
        console.log("properties added", [...targetProperties])
    }

    removePropertiesFromGroup(properties: Property[], target: PropertiesTarget = "applied") {
        const group = this.selectedGroup
        const targetProperties = this.getGroupProperties(target)
        properties.forEach(prop => {
            targetProperties.find((id, idx, arr) => {
                if(prop.id === id)
                    arr.splice(idx, 1)
            })
        // group.properties.splice(group.properties.indexOf(prop.id), 1)
        })
    }

    getPropertyById(id: number) {
        console.log("search in", id, this.data.propeties)
        return this.data.propeties.find(p => p.id === id)
    }

    async getProperties(rule: Rule) {
        if(this.data.propeties) {
            // console.log("return this.availablePropeties")
            return this.data.propeties
        }
        
        let sql = `
            SELECT 
                concat_ws('/', pt.name, pg.name, p.name) as path, 
                pg.name as \`group\`,
                pt.name as \`type\`,
                prv.value as override_value,
                prv.description as override_description,
                p.id,
                p.name,
                p.additional,
                p_extends.id as \`extends_id\`,
                p_extends.name as \`extends_name\`,
                p_extends.additional as \`extends_additional\`
            FROM properties p
                LEFT JOIN properties_groups pg ON pg.id=p.properties_groups_id
                LEFT JOIN properties p_extends ON FIND_IN_SET(p_extends.id, p.extends)
                LEFT JOIN properties_rules_values prv ON prv.properties_id=p.id
                    AND prv.properties_rules_id=?
                JOIN properties_types pt ON pt.id=p.properties_types_id
                
            WHERE 
                p.id in(SELECT min(id) from properties 
                    group by concat_ws('/', name, properties_types_id, properties_groups_id))
                #p.id in(109,108,1,3)
        `
        let args: any[] = [rule.id]
        const sess = Database.getSession('customer')
        const result = await sess.query<any>(sql, args)
        const allValuesMap: Map<string, any> = new Map
        const idMap: Map<number, Property> = new Map
        const availablePropeties = []
        result.results.forEach(o => {
            let newProp: Property = {
                id: o.id, type: o.type, group: o.group, additional: o.additional,
                name: o.name, path: o.path, extends: []
            }
            // console.log("result", o)
            const parseJson = (str: string) => {
                try {
                    // console.log("parseJson", str)
                    if(!str || str.length === 0)
                        return {}
                    return JSON.parse(str)
                } catch(e) {
                    console.error("JSON.parse failed", str, e)
                    throw e
                }
            }
            try {
                newProp.additional = parseJson(o.additional)
                if(newProp.additional['extends'] === undefined)
                    newProp.additional['extends'] = []
                // console.log(newProp.additional)
                Object.keys(newProp.additional).forEach(varName => {
                    const value = newProp.additional[varName]
                    allValuesMap.set(varName, value)
                })
                let baseProp = idMap.get(newProp.id) || newProp
                if(o.extends_id) {  
                    const extends_additional = {} 
                    extends_additional[o.extends_name] = parseJson(o.extends_additional)  
                    console.log("extends_additional", extends_additional)   
                    // baseProp.additional = Utils.extend(baseProp.additional, extends_additional)

                    // baseProp.extends.push({
                    //     id: o.extends_id,
                    //     name: o.extends_name,
                    //     additional: JSON.parse(o.extends_additional)
                    // })
                }
                if(baseProp === newProp) {
                    idMap.set(newProp.id, newProp)
                    availablePropeties.push(newProp)
                }
            } catch(e) {
                console.error(`load property.member failed ${o.path}`, e)
            }
        })
        this.data.propeties = availablePropeties

        // this.unchangedData.propeties = JSON.parse(JSON.stringify(this.data.propeties));
        this.unchangedData.propeties = lodash.cloneDeep(this.data.propeties)
        console.log("loaded properties", this.data.propeties, this.unchangedData.propeties)
        
        return this.data.propeties
    }

    getAvailableGroups() {    
        return this.data.groups
    }

    // async loadData() {
    //     console.log("loadData", this.data)
    //     if(this.data)
    //         return this.data
    //     let sql = `
    //         SELECT data FROM properties_deploys
    //         ORDER BY id DESC
    //         LIMIT 1
    //     `
    //     let args: any[] = []
    //     const sess = Database.getSession('customer')
    //     const data = await sess.query<string>(sql, args)
    //     this.data = JSON.parse(data.results[0]["data"])

    //     // console.log("loadData done", this.data.rules, data.results[0])
    // }

    async loadRules() {
        let sql = `
            SELECT * FROM properties_rules #limit 1
        `
        let args: any[] = []
        const sess = Database.getSession('customer')
        const data = await sess.query<any>(sql, args)
        console.log("rules loaded", data)

        const createGroups = (parent, groups) => {
            groups.forEach(g => {
                // console.log("find in groups properties", rule.name, g.name)
                if(!g.properties_new) {
                    g.properties_new = {
                        "applied": g.properties
                    }
                }
                g.parent = parent
                if(g.children) {
                    createGroups(g, g.children)
                }
            })
            return groups
        }        
        const createRules = (parent: Rule, rules: any[]) => {
            // const rules 
            rules.forEach(rule => {
                if(!rule.description)
                    rule.description = ""
                rule.parent = parent
                
                // console.log("rulePath", getPath(rule))

                createGroups(null, rule.groups)
                if(rule.children) {
                    createRules(rule, rule.children)
                }
                // this.saveRule(rule)
            })
            return rules
        }
        const tree = [];
        this.data.rules = []
        // console.log("transformed to tree", data.results)
        Transform.tree(this.data.rules, data.results, {
            groupBySeperator: "/", 
            groupBy: ["name"], 
            apply: (to, from) => {
                // console.log("apply", to, from)
                to.name = from.name
                to.groups = []
                Transform.tree(to.groups, JSON.parse(from.groups))
                to.query = JSON.parse(from.query)
            }})    
        // console.log("transformed to tree", this.rules)
    }
    async saveProerties() {
        const diff = difflib.detailedDiff(this.unchangedData.propeties, this.data.propeties)
        console.log("diff ", diff)
    }

    async saveRule(rule: Rule) {
        const getPath = (rule: Rule) => {
            let path: string
            path = rule.name
            while(rule.parent) {
                rule = rule.parent
                path = rule.name + "/" + path
            }
            return path
        }

        let sql = `
            INSERT INTO properties_rules
                (id, name, description, query, groups)
            VALUES(?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                query=VALUES(query), 
                groups=VALUES(groups),
                name=VALUES(name), 
                description=VALUES(description)
        `
        let args: any[] = [
            rule.id,
            getPath(rule), 
            rule.description, 
            JSON.stringify(rule.query),
            JSON.stringify(Utils.json_pick(rule.groups, ["*", "!parent"], { depth: 5 }))
        ]
        const sess = Database.getSession('customer')
        await sess.queryxx(sql, args)

    }

    async saveChanges() {
        this.saveProerties();
        XPrime.forEachUp(this.data.rules, rule => {
            // this.saveRule(rule)
        })
    }

    // async deploy() {
    //     // console.log(this.data)
    //     const saveData = Utils.json_pick(this.data, ["*", "!parent"], {
    //         depth: 5
    //     })
    //     let sql = `
    //         INSERT INTO properties_deploys
    //             (message, data, user)
    //         VALUES(?, ?, ?)
    //     `
    //     let args: any[] = ['Message', JSON.stringify(saveData), 'h.katz']
    //     const sess = Database.getSession('customer')
    //     await sess.queryxx(sql, args)        
    // }

    hasChanges() {
        return true
    }

    ngOnInit(): void {
    }    
}
