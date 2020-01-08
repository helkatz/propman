import * as mysql from 'mysql';
import * as m from 'mysql'
import { inc } from 'semver';
import { Timestamp } from 'rxjs/internal/operators/timestamp';

// import { Err } from './error';
// import { app } from '../app';
var util = require('util')
interface Result {
    results: any[],
    fields: any[]
}

interface IResult<T> {
    results: Array<T>,
    fields: any[]
}

interface BuildOptions {
    insert?: boolean
    onDuplicateKeyUpdate?: boolean
}

export class UpdateSqlBuilder {
    private preparedFields_: any[] = []
    private args_: any[] = []
    private where_: string = ''
    private table_: string = ''
    private db_: string
    constructor(db: string) {
        this.db_ = db
    }

    table(name: string) {
        this.table_ = name
    }

    addPrepared(fieldName: string, value: any) {
        this.preparedFields_.push(fieldName)
        this.args_.push(value)
    }

    where(where: string, args: any[]) {
        this.where_ = where
        this.args_.push(args)
    }

    async execute(options: BuildOptions = {}) {
        let sql = options.insert ? `insert into ` : `update `
        sql += this.table_ + ' '
        
        let fields = ''
        let duplicateUpdateSql = ''
        this.preparedFields_.forEach(fieldName => {
            if (fields.length > 0) {
                fields += ','
                duplicateUpdateSql += ','
            }
            fields += `${fieldName} = ?`
            duplicateUpdateSql += `${fieldName} = VALUES(${fieldName})`
        });

        if (fields.length === 0)
            return undefined
        sql += `set ${fields}\n`
        if(this.where_.length > 0)
            sql += this.where_ + '\n'
        if (options.onDuplicateKeyUpdate) {
            sql += duplicateUpdateSql
        }
        var sess = Database.getSession(this.db_)
        const res: any = await sess.query(sql, this.args_)
        return res
    }
}

interface TableChanges {
    table: string
    updateTime: number
    dataLength: number
}

export class Session
{
    static lastChanges: Map<string, TableChanges> = new Map

    constructor(private pool: mysql.Pool) {
        // console.log("Session.constructor")
        //console.log("pool = ", this.pool)
    }
    queryxx(sql: string, values: any): Promise<Result> {
        if(sql.match(new RegExp('^[ \t\n]*(insert|update|delete)', "i")))
            console.log("query %s", sql, values)
        return new Promise((resolve, reject) => {
            let data = this.pool.query(sql, values, async (error, results, fields) => {                
                if (error) {
                    error.name = "MysqlError"
                    reject(error)
                    //throw new Err(error)
                }
                // console.log(typeof results)
                var res: Result  = {results, fields}
                resolve(res)
              })
        })
    }

    async execute(sql: string, values: any) {
        await this.pool.query(sql, values)        
    }

    async hasChanges(...tables: string[]) {
        const args = []
        const inClause = tables.map(name => `'${name}'`).join(",")
        const res = await this.query<TableChanges>(`
            select 
                TABLE_NAME as \`table\`, 
                UNIX_TIMESTAMP(UPDATE_TIME) as updateTime, 
                DATA_LENGTH as dataLength
            from information_schema.tables 
            where TABLE_NAME in(${inClause}) and UPDATE_TIME IS NOT NULL
        `, args)
        let changes: TableChanges[] = []
        res.results.forEach(o => {
            let lastChange = Session.lastChanges.get(o.table)
            if(lastChange && 
                ( lastChange.updateTime < o.updateTime 
                || lastChange.dataLength != o.dataLength)
            ) {
                    changes.push({...o})
            }
            Session.lastChanges.set(o.table, o)
        })
        return changes.length > 0 ? changes : undefined
        
    }

    query<T = any>(sql: string, values: any): Promise<IResult<T>> {
        // console.log("query2", sql, values)
        return new Promise((resolve, reject) => {
            let data = this.pool.query(sql, values, async (error, results: Array<T>, fields) => {                
                if (error) {
                    error.name = "MysqlError"
                    reject(error)
                    //throw new Err(error)
                }
                
                var res: IResult<T> = {
                    results: results as Array<T>,
                    fields: fields
                }
                // results.forEach((v, k) => {
                //     console.log(v, k)
                // })
                // console.log(res.results)
                resolve(res)
              })
        })
    }    
}

const databases = {
    local: {
        customer: {
            connectionLimit: 1,
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'cashpoint'
        }
    },
    test: {
        customer: {
            connectionLimit: 1,
            host: 'customer.test.mysql',
            user: 'h.katz',
            password: 'aez9KeLo8vuphoh3',
            database: 'customer'
        }
    }
}
export class Database
{    
    private static pools_: Map<string, mysql.Pool>
    static Initialize() {
        this.pools_ = new Map;
    }

    static getConnection(name: string): Promise<mysql.PoolConnection> {
        let pool: mysql.Pool
        if (this.pools_.has(name)) {
            pool = this.pools_.get(name)
        } else {
            console.log(`create database.pool for ${name}`)
            pool = mysql.createPool(databases.local[name])
            console.log('pool.getConnection')
            
            // pool.getConnection = util.promisify(pool.getConnection)
            console.log('pool.getConnection done')
            // pool.acquireConnection(()
            this.pools_.set(name, pool)
        }
        return new Promise((resolve, reject) => {
            pool.getConnection((error, con) => {
                if (error) {
                    error.name = "MysqlError"
                    reject(error)
                }
                resolve(con)
            })
        })        
    }

    static getSession(name: string) {        
        let pool: mysql.Pool
        if (this.pools_.has(name)) {
            pool = this.pools_.get(name)
        } else {
            console.log(`create database.pool for ${name}`)
            pool = mysql.createPool(databases.local[name])
            console.log('pool.getConnection')
            
            // pool.getConnection = util.promisify(pool.getConnection)
            console.log('pool.getConnection done')
            // pool.acquireConnection(()
            this.pools_.set(name, pool)
        }
        return new Session(pool)
    }

    static async queryDb(db: string, query: string) {
        let sess = Database.getSession(db)
        return sess.query<any>(query, []).then(res => {
          return res.results
        })
      }    
}
interface IUpdateSql {
    sql?: string
    args?: any[]
}
interface IFieldMap {
    name: string
}
// function buildUpdateSql<T extends IModDetection>(o: T, table: string, doInsert: boolean = false, fields: object) {

//     let ret: IUpdateSql = {}
//     ret.sql = doInsert
//         ? `insert into ${table} set\n`
//         : `update ${table} set\n`
    
//     const modified = o.getModified()
//     if (Object.keys(modified).length === 0)
//         return

//     ret.args = []
//     for (let k of (Object.keys(fields))) {   
//         if (modified[k] === undefined)
//             continue
//         const dbField = fields[k]
//         if (dbField === undefined)
//             throw new Err(`UserModel.update property ${k} not found in dbFieldMap`)
        
//         console.log(`modified ${k} = ${o[k]} ${dbField}`)
//         if (ret.args.length > 0)
//             ret.sql += ','
//         ret.sql += `${dbField}=? `
//         ret.args.push(o[k])
//     }
//     return ret
// }
Database.Initialize()
// export {Database, Session};