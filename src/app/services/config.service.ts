import { Injectable, Output, EventEmitter } from '@angular/core'
import * as jsonpath from 'jsonpath'
import * as fs from 'fs'
import { Subject } from 'rxjs';
import { remote, ipcRenderer } from 'electron';
export enum StorageEngine {
    LocalStorage,
    Redis
}

export interface Environment {
    name: string;
    host: string;
    query: string;
    default?: boolean
    writeable?: boolean
    user?: string
    pass?: string
}

export interface ChangeEvent {
    name: string
}
@Injectable()
export class ConfigService {
    engine: StorageEngine = StorageEngine.LocalStorage
    config: Object
    configPath: string
    preventStoring = false
    private configChanged = new Subject<Object>();
    @Output() change: EventEmitter<Object> = new EventEmitter();
    configChanged$ = this.configChanged.asObservable();

    readConfig() {
        let f: Buffer
        try {
            f = fs.readFileSync(this.configPath);
        } catch (err) {
            fs.writeFileSync(this.configPath, '{}')
            f = fs.readFileSync(this.configPath);
        }
        // console.log(f.toString())
        this.config = JSON.parse(f.toString())
    }

    saveConfig() {
        if (this.preventStoring)
            return
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }

    constructor() {

        this.configPath = remote.app.getPath('userData') + '/propman.json'
        this.readConfig()
    }

    broadcast(name: string) {
        this.change.emit(name)
    }

    useStorageEngine(engine: StorageEngine) {

    }

    getTheme(): string {
        return this.config['theme'] || 'omega'
    }

    writeTheme(theme: string) {
        this.config['theme'] = theme
        this.saveConfig()
        this.broadcast('theme')
    }


    getEnvironments(): Environment[] {
        return this.config['environments'] || []
    }

    writeEnvironments(environs: Environment[]) {
        this.config['environments'] = [...environs]
        this.saveConfig()
        this.broadcast('environments')
    }

    writeJson(name: string, json: object) {
        // console.log('writeJson', JSON.stringify(json, null, 2))
        this.config[name] = json
        this.saveConfig()
    }

    readJson(name: string, def?: object) {
        return this.config[name] || def
    }

    get<T>(name: string, def?: T) {
        return this.config[name] as T || def
    }
}
