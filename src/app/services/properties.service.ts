import { Injectable, OnInit, Query } from '@angular/core'
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'
import { map, catchError } from 'rxjs/operators'
import { throwError, config, Observable, Subject } from 'rxjs'
import { Utils, Breakable } from '../lib/helper'
import { ConfigService, Environment } from './config.service';
// import * as data from './data/definitions'
import * as qb from "angular2-query-builder";
import { Database, Session } from '../lib/database'
import { ChildActivationEnd } from '@angular/router'
import { XPrime } from '../lib/primespec'
import { stringify } from 'querystring'
import { ThrowStmt, Statement } from '@angular/compiler'
import { Transform, TraverseCallBackParams } from '../lib/transform'
import * as lodash from 'lodash'
import * as difflib from 'deep-object-diff';
import { logger } from '../logging'
import * as _ from 'lodash'
import { hklib } from '../lib/hklib'

export type UserId = number
export enum Modification {
    None, Changed, Removed, Added
}

export interface WatchSubject<T> {
    subject?: T
    change: "removed" | "added" | "modified" | "selected" | "reloaded"
}

export class AvailableGroup
{
    name: string
    values: Map<number, string> = new Map
}

// export type PropertiesTarget = "excluded" | "applied"
export enum xGroupPropertyState {
    Inherited = 0,
    Disabled = 1,
    Hidden = 2,
    Applied = 3
}
export type GroupPropertyState = "disabled" | "applied" | "hidden" | "inherited"
export interface GroupPropertiesMap {
    [key: string]: number[]
}

export interface Group {
    name: string
    inheritFromParent: boolean
    // properties?: number[]
    showProperties: number[]
    hideProperties: number[]
    showPathes: string[]
    hidePathes: string[]
    // properties_new?: GroupPropertiesMap
    children?: Group[]
    parent?: Group
    rule: Rule
    modification: Modification
}

export interface GroupMap {
    [key: string]: Group[]
}

export interface PathState {
    // path?: string
    _state?: GroupPropertyState
    [key: number]: PathState
}

export interface Rule {
    id?: number
    name: string    
    path?: string
    parent?: Rule
    description: string
    inheritFromParent: boolean
    query?: Modifyable<qb.RuleSet>
    groups?: Group[]
    children?: Rule[]
    space: Space
    modification: Modification   

}

export interface PropertyExtends {
    id: number
    name: string
    value: object
}

export class Modifyable<T> {
    private value: T
    private unchanged: T
    setInitial = (v: T) => {
        this.set(v)
        this.clearModified()
    }
    set = (v: T) => {
        this.value = v
    }
    get = () => this.value
    clearModified = () => this.unchanged = _.cloneDeep(this.value)
    isModified = () => {
        // console.log("isModified", this.unchanged, this.value)
        if(this.unchanged instanceof Object) {
            let diff = Utils.getDifference(this.unchanged as Object, this.value as Object)
            // console.log(diff)
            return diff.length > 0
        }
        return false
    }
}

export interface Property {    
    id: number
    type: string
    group: string
    typeGroupId: string
    name: string
    path: string
    
    propValue: Modifyable<object>
    // ruleValue: Modifyable<object>
    // userValue: object
    children?: Property[]
    modification: Modification
    overrides: {
        ruleId?: number
        userId?: number
        ruleValue?: Modifyable<object>
        userValue?: Modifyable<object>
    }
    // parent?: Property
}

interface Data {
    rules?: Rule[],
    groups?: Group[]
    propeties?: Property[]    
}

interface Space {
    id: number
    name: string
}

interface SaveMeta {
    session: Session
    changesId: number
}

export interface User {
    id: number
    firstName: string
    lastName: string
}
function removeIntersec<T>(from: T[], intersectWith: T[]) {
    from.forEach((fp, idx) =>  {
        console.log("check to remove ", fp, idx)
        if(intersectWith.find(p => p === fp) !== undefined) {
            
            from.splice(idx, 1)
            console.log("remove", idx, _.cloneDeep(from))
        }
    })
}

@Injectable({ providedIn: 'root' })
export class PropertiesService implements OnInit {
    // private data: any
    private spaces: Space[]
    private data: Data = {}
    private unchangedData: Data = {}

    private selectedRule: Rule
    
    private selectedGroup: Group

    public watchUsers = new Subject<WatchSubject<User>>();
    public watchGroups = new Subject<WatchSubject<Group>>();
    public watchRules = new Subject<Rule>();
    public watchRulesReload = new Subject();

    constructor(private http: HttpClient
        , private configService: ConfigService) {
        // this.loadSpaces()
        // this.watchTableChange()
        
        // this.loadProperties(null)
    }

    watchTableChange() {
        setInterval(async () => {
            const changes = await Database.getSession("customer").hasChanges("properties", "table2")
            
            if(changes) {
                console.info("tableChange detected", changes)
                this.data.propeties = undefined
                // this.watchRules.next(this.selectedRule)
            }
        }, 1000);        
    }

    addRule = (parent: Rule, rule: Rule) => {
        if(!rule.groups) {
            rule.groups = [{
                name: "root",
                showProperties: [],
                hideProperties: [],
                showPathes: [],
                hidePathes: [],
                inheritFromParent: true,
                modification: Modification.Added,
                rule: rule
            }]
        }
        rule.modification = Modification.Added
        if(rule.inheritFromParent === undefined)
            rule.inheritFromParent = true
        if(!parent) {
            this.data.rules.push(rule)
        } else {
            parent.children.push(rule)
            rule.parent = parent
        }
        this.selectRule(rule)
        return rule
    }

    removeRule(rule: Rule) {
        rule.modification = Modification.Removed
        this.data.rules.filter(r => r.name.indexOf(rule.name + ".") === 0)
            .forEach(rule => rule.modification = Modification.Removed)
        if(this.selectedRule === rule) {
            this.selectRule(undefined)
        }
    }

    getRule = (name: string) => {
        return this.data.rules.find(r => r.name === name)
    }

    getRules = async () => {
        return this.data.rules
    }

    selectRule(rule: Rule) {
        this.selectedRule = rule     
        this.selectedGroup = undefined 
        this.watchRules.next(rule)
    }

    getSelectedRule = () => this.selectedRule

    notifyGroupChange() {
        if(this.selectedGroup)
            this.watchGroups.next({subject: this.selectedGroup, change: "modified"})
    }

    selectGroup(group: Group) {
        this.selectedGroup = group
        console.log("selectGroup")
        this.watchGroups.next({subject: group, change: "selected"})
    }

    getSelectedGroup = () => this.selectedGroup

    getGroupProperties(group: Group) {

        const build = (group: Group): PathState => {
            let parentObj: PathState
            const resObj: PathState = {}
            const applyRet = (path: string, state: GroupPropertyState) => 
                Transform.set(resObj, path, { _state: state })

            console.group("getGroupProperties", group)
            console.log("show", group.showProperties, "hide", group.hideProperties)

            // when we are on the root then add all props

            this.getProperties().forEach(
                prop => Transform.set(resObj, prop.path, {}))
            // } else {
            if(group.parent) {
                // apply parent properties
                parentObj = build(group.parent)
                // Transform.test()
            }
            // console.log("resObj1", _.cloneDeep(resObj))
            group.hidePathes.forEach(path => applyRet(path, "hidden"))
            group.showPathes.forEach(path => applyRet(path, "applied"))

            const doFor = (props: number[], state: GroupPropertyState) => {
                props.forEach(propId => {
                    const prop = this.getPropertyById(propId)
                    if(!prop)
                        return
                    const pathState = _.get(resObj, prop.path) as PathState
                    if(!pathState) {
                        applyRet(prop.path, "inherited")
                    }
                    else if(pathState._state !== "disabled") {
                        applyRet(prop.path, state)
                    }
                })
            }
            doFor(group.showProperties, "applied")
            doFor(group.hideProperties, "hidden")
            
            // return resObj
            /**
             * rules for
             * when node is set to hidden all childs are also hidden for same group
             *      except for already applied nodes  
             */
            Transform.traverse(resObj, (o: TraverseCallBackParams<PathState>) => {

                const parentGroupObj = _.get(parentObj, o.path) as PathState
                if(o.value._state === undefined)
                    o.value._state = group.inheritFromParent ? "inherited" : "hidden"
                if(parentGroupObj) {
                    if(parentGroupObj._state === "hidden" || parentGroupObj._state === "disabled") {
                        o.value._state = "disabled"
                    }
                }
                if(o.parent 
                    && o.parent.value._state === "hidden" 
                    && o.value._state !== "applied" 
                    && o.value._state !== "disabled") {
                    
                    o.value._state = o.parent.value._state
                }
                return false
            })
            console.log("return", _.cloneDeep(resObj))
            console.groupEnd()
            return resObj
        }
        return build(group)
    }

    updateGroupPropertiesByPath(pathes: string[], state: GroupPropertyState) {
        const group = this.selectedGroup
   
        if(state === "applied") {  
            removeIntersec(group.hidePathes, pathes)     
            group.showPathes.push(...pathes)
        }
        if(state === "hidden") {
            removeIntersec(group.showPathes, pathes) 
            group.hidePathes.push(...pathes)
        }
        if(state === "inherited") {
            removeIntersec(group.hidePathes, pathes)
            removeIntersec(group.showPathes, pathes)
        }
        group.hidePathes.sort()
        group.showPathes.sort()
        console.log(`updateGroupPropertiesByPath ${group.name}`
            , "show", group.showPathes, "hide", group.hidePathes, pathes, state)     
        this.watchGroups.next({subject: group, change: "modified" })        
    }
    
    updateGroupProperties(properties: number[], state: GroupPropertyState) {
        const group = this.selectedGroup

        if(state === "applied") {  
            removeIntersec(group.hideProperties, properties)     
            group.showProperties.push(...properties)
        }
        if(state === "hidden") {
            removeIntersec(group.showProperties, properties) 
            group.hideProperties.push(...properties)
        }
        if(state === "inherited") {
            removeIntersec(group.hideProperties, properties)
            removeIntersec(group.showProperties, properties)
        }
        console.log(`updateGroupProperties ${group.name}`
            , "show", group.showProperties, "hide", group.hideProperties, properties, state)

        this.watchGroups.next({subject: group, change: "modified" })
    }

    getPropertyById(id: number) {
        // console.log("search in", id, this.data.propeties)
        return this.data.propeties.find(p => p.id === id)
    }

    getProperties() {
        return this.data.propeties
    }

    async loadUsers() {
        let sql = `
            SELECT 
                i_user as id, 
                c_firstname as firstName,
                c_secondname as lastName
            FROM user u
                
            WHERE TRUE
            ORDER BY id
            LIMIT 1000
        `
        let args: any[] = []
        const sess = Database.getSession('customer')
        const result = await sess.query<User>(sql, args)
        return result.results  
    }
    /**
     * without params it loads the default values of properties 
     * @param rule when given then also rulebased props are fetched
     * @param userId when given then also userbased props ar fetched
     */
    async loadProperties(rule?: Rule, userId?) {
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

        console.log("loadProperties for rule", rule)    
        // if(this.data.propeties) {
        //     console.log("loadProperties already loaded")    
        //     return this.data.propeties
        // }
        
        let sql = `
            SELECT 
                concat_ws('.', pt.name, pg.name, p.name) as path, 
                concat_ws('_', pt.id, pg.id) as type_group_id,
                pg.name as \`group\`,
                pt.name as \`type\`,
                ifnull(prv.value, '{}') as rule_value,
                ifnull(puv.value, '{}') as user_value,
                p.id,
                p.name,
                p.value
            FROM properties p
                LEFT JOIN properties_groups pg ON pg.id=p.properties_groups_id
                LEFT JOIN properties_rules_values prv ON prv.properties_id=p.id
                    AND prv.properties_rules_id=?
                LEFT JOIN properties_user_values puv ON puv.properties_id=p.id
                    AND puv.user_id=?
                JOIN properties_types pt ON pt.id=p.properties_types_id
                
            WHERE 
                p.id in(SELECT min(id) from properties 
                    group by concat_ws('/', name, properties_types_id, properties_groups_id))
                #p.id in(109,108,1,3)
                #AND p.id in(31,82, 12)
            ORDER BY p.id
            #LIMIT 5
        `
        let args: any[] = [rule ? rule.id : 0, userId ? userId : -1]
        const sess = Database.getSession('customer')
        const result = await sess.query<any>(sql, args)

        const availablePropeties: Property[] = []
        result.results.forEach(o => {
            let newProp: Property = {
                id: o.id, type: o.type, group: o.group,
                name: o.name, path: o.path, typeGroupId: o.type_group_id,
                modification: Modification.None,
                propValue: new Modifyable, 
                overrides: {
                    ruleValue: new Modifyable,
                    userValue: new Modifyable
                }
            }
            try {
                newProp.propValue.set(parseJson(o.value))
                newProp.propValue.clearModified()

                newProp.overrides.ruleValue.set(parseJson(o.rule_value))
                newProp.overrides.ruleValue.clearModified()
                if(rule)
                    newProp.overrides.ruleId = rule.id

                newProp.overrides.userValue.set(parseJson(o.user_value))
                newProp.overrides.userValue.clearModified()
                if(userId)
                    newProp.overrides.userId = userId
                // newProp.additional = parseJson(o.additional)
                availablePropeties.push(newProp)
            } catch(e) {
                console.error(`load property.member failed ${o.path}`, e)
            }
        })
        this.data.propeties = availablePropeties

        this.unchangedData.propeties = lodash.cloneDeep(this.data.propeties)

        console.log("loaded properties", this.data.propeties)
        return this.data.propeties
    }

    getAvailableGroups() {    
        return this.data.groups
    }

    getSelectedSpace() {
        return this.spaces[0]
    }

    async loadSpaces() {
        this.spaces = [{
            id: 1,
            name: "JEDI",
        },
        {
            id: 2,
            name: "Config"
        }]        
    }

    async loadRules() {
        await this.loadSpaces()
        let sql = `
            SELECT
                id, name, description, spaces_id, ifnull(query, '{}') as query,
                groups
            FROM properties_rules #limit 3
        `
        let args: any[] = []
        const sess = Database.getSession('customer')
        const data = await sess.query<any>(sql, args)

        console.log("rules loaded", data)

        let rules: Rule[] = []// = _.cloneDeep(data.results)
        data.results.forEach(r => {
            const rule: Rule = {
                id: r.id,
                modification: Modification.None,
                description: r.description,
                name: r.name,
                inheritFromParent: true,
                space: this.spaces.find(s => s.id == r.spaces_id)
            }
            // rule.modification = Modification.None
            rule.groups = JSON.parse(r.groups)
            rule.query = new Modifyable
            rule.query.setInitial(JSON.parse(r.query))
            // rule.space = this.spaces.find(s => s.id == r.spaces_id)
            rules.push(rule)
            hklib.forEachDown(rule.groups, (group, parent) => {
                group.rule = rule
                group.parent = parent
                if(!group.showProperties) group.showProperties = []
                if(!group.hideProperties) group.hideProperties = []
                if(!group.hidePathes) group.hidePathes = []
                if(!group.showPathes) group.showPathes = []
            })            
        })
        this.data.rules = rules
        console.log(rules)
 
        this.unchangedData.rules = lodash.cloneDeep(this.data.rules)
        // this.watchRulesReload.next()
    }

    getGroupsChanges() {
        this.data.rules.forEach(r => {
            r.groups
            this.unchangedData.rules
        })
    }

    async saveProerties(saveSession: SaveMeta) {
        this.data.propeties.forEach((prop, idx) => {
            if(prop.modification === Modification.None
                && !prop.propValue.isModified()
                && !prop.overrides.ruleValue.isModified()
                && !prop.overrides.userValue.isModified())
                return
            // console.log("change detected", this.data.propeties[idx], this.unchangedData.propeties[idx])
            this.saveProperty(saveSession, this.data.propeties[idx])
        })
    }

    async saveHistory(sess: Session, table: string, pks: object) {
        let sql = `
            insert into ${table}_history
            select * from ${table}
            where true`

        if(pks && Object.keys(pks).length === 0) {
            throw "saveHistory primary key required"
        }

        const args = []
        Object.keys(pks).forEach(pk => {
            sql += ` AND ${pk}=?`
            args.push(pks[pk])
        })
        return await sess.queryxx(sql, args)
    }

    async saveProperty(saveSession: SaveMeta, property: Property) {
        const sess = Database.getSession('customer')
        // console.log("saveProperty valueValue changed", property.ruleValue.isModified())
        console.log("saveProperty changes"
            , `ruleValue ${property.overrides.ruleId}`, property.overrides.ruleValue.isModified()
            , `userValue ${property.overrides.userId}`, property.overrides.userValue.isModified())
        // console.log("saveProperty userValue changed", property.ruleValue.isModified())
        // return
        if(property.modification === Modification.Removed) {
            console.log("delete property", property)
            await this.saveHistory(sess, "properties", {id: property.id})
            await sess.queryxx("delete from properties where id=?", [property.id])
        } else if(property.modification !== Modification.None) {
            console.log("update property", property)
            if(property.propValue.isModified()) {
                await this.saveHistory(sess, "properties", {id: property.id})
                
                let sql = `
                    INSERT INTO properties
                        (id, name, value, properties_changes_id)
                    VALUES(?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        name=VALUES(name), 
                        value=VALUES(value),
                        description=VALUES(description),
                        properties_changes_id=VALUES(properties_changes_id)
                `
                let args: any[] = [
                    property.id,
                    property.name,
                    JSON.stringify(property.propValue.get()),
                    saveSession.changesId
                ]
                await sess.queryxx(sql, args)
                property.propValue.clearModified()
            }

            if(property.overrides.ruleId && property.overrides.ruleValue.isModified()) {
                console.log("insert ruleValue change")                
                await this.saveHistory(sess, "properties_rules_values", 
                    {
                        properties_rules_id: property.overrides.ruleId,
                        properties_id: property.id
                    })

                let sql = `
                    insert into properties_rules_values
                        (properties_rules_id, properties_id, value, properties_changes_id)
                    values(?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        value=VALUES(value),
                        properties_changes_id=VALUES(properties_changes_id)
                `
                let args = [
                    property.overrides.ruleId, 
                    property.id, 
                    JSON.stringify(property.overrides.ruleValue.get()), 
                    saveSession.changesId
                ]
                await sess.queryxx(sql, args)
                //@TODO check sql result
                property.overrides.ruleValue.clearModified()                
            }
            if(property.overrides.userId && property.overrides.userValue.isModified()) {
                console.log("insert userValue change")
                await this.saveHistory(sess, "properties_user_values", 
                    {
                        user_id: property.overrides.userId,
                        properties_id: property.id
                    })

                let sql = `
                    insert into properties_user_values
                        (user_id, properties_id, value, properties_changes_id)
                    values(?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        value=VALUES(value),
                        properties_changes_id=VALUES(properties_changes_id)
                `
                let args = [
                    property.overrides.userId, 
                    property.id, 
                    JSON.stringify(property.overrides.userValue.get()), 
                    saveSession.changesId
                ]
                await sess.queryxx(sql, args)
                //@TODO check sql result
                property.overrides.userValue.clearModified()                
            }
        }
    }

    hasRuleChanged(rule: Rule) {
        return rule.modification !== Modification.None
            || rule.query.isModified()
    }

    async saveRule(saveSession: SaveMeta, rule: Rule) {

        const sess = saveSession.session
        if(rule.modification === Modification.Removed) {
            console.log("delete rule", rule)
            await this.saveHistory(sess, "properties_rules", {id: rule.id})
            await sess.queryxx("delete from properties_rules where id=?", [rule.id])
        } else if(this.hasRuleChanged(rule)) {
            console.log("update rule", rule)
            await this.saveHistory(sess, "properties_rules", {id: rule.id})

            let sql = `
                INSERT INTO properties_rules
                    (id, name, description, query, groups, properties_changes_id)
                VALUES(?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                    query=VALUES(query), 
                    groups=VALUES(groups),
                    name=VALUES(name), 
                    description=VALUES(description),
                    properties_changes_id=VALUES(properties_changes_id)
            `
            let args: any[] = [
                rule.id,
                rule.name, 
                rule.description, 
                JSON.stringify(rule.query.get()),
                JSON.stringify(Utils.json_pick(rule.groups, ["*", "!parent", "!rule"])),
                saveSession.changesId
            ]
            await sess.queryxx(sql, args)
            rule.query.clearModified()
        }
    }

    saveRules(saveSession: SaveMeta) {
        if(this.data.rules)
            this.data.rules.forEach(rule => this.saveRule(saveSession, rule))
    }

    createSaveable() {
        let r: Rule
        const pickRules = ["*", "!parent", "!space", "!rule"]
        Transform.traverse(this.unchangedData.rules, o => {
            this.data.rules
        })
        //@TODO find a better way to find fields to save
        const rules = Utils.json_pick(this.data.rules, pickRules, {depth: 10})
        

        const unchangedRUles = Utils.json_pick(this.unchangedData.rules, pickRules, {depth: 10})
        console.log("picked", unchangedRUles, rules)
        console.log("call getdiff")
        const diffs = Utils.getDifference(unchangedRUles, rules)
        console.log("diff by getDifference", diffs)        
    }

    async createChangesId(sess: Session, description: string) {
        await sess.queryxx(`
            insert into properties_changes 
                (description) 
            values(?)`, [description])
        return sess.query("SELECT LAST_INSERT_ID() as id", [])
    }

    async saveChanges() {
        
        const sess = Database.getSession('customer')
        sess.queryxx("START TRANSACTION", [])
        try {
            await this.createChangesId(sess, "change").then(async res => {
                const saveSession: SaveMeta = {
                    session: sess,
                    changesId: res.results[0]['id']
                }
                console.log("changes id", res.results)
                await this.saveRules(saveSession)
                await this.saveProerties(saveSession)
            })
        } catch(e) {
            sess.queryxx("ROLLBACK", [])
            console.error("error in saveChanges", e)
        }
        sess.queryxx("COMMIT", [])
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
