import { ConfigService, Environment } from '../services/config.service';
import { Component, OnInit, Injectable, Input } from '@angular/core'
import { DynamicDialogConfig, SelectItem } from 'primeng/api'
// import * as etcd_service from '../properties.service'
import { isEqual } from 'lodash'

// var _ = require('lodash/core');

class ConfigurationBase {
    constructor(
        public config: DynamicDialogConfig
        , private configService: ConfigService) {

    }

}

@Component({
    selector: 'host-configuration-tab',
    templateUrl: './host-configuration-tab.html',
    styleUrls: ['./settings-dialog.component.css'],

})

// @Injectable()
export class HostConfigurationTab implements OnInit {
    selectedEnviron: Environment
    editEnviron: Environment
    environs: Environment[]

    constructor(private configService: ConfigService) {

    }

    onEnvironChange(event) {
        this.editEnviron = { ...this.selectedEnviron }
        console.log('onChange', event)
    }

    checkButtonState(action: 'add' | 'remove' | 'save') {
        // console.log('checkButtonState', action, this.environs, this.selectedEnviron, this.editEnviron)
        if (action === 'add')
            return !this.editEnviron.name || this.environs.findIndex(env => env.name === this.editEnviron.name) >= 0
        if (action === 'remove')
            return !this.selectedEnviron
        if (action === 'save')
            return !this.selectedEnviron || isEqual(this.selectedEnviron, this.editEnviron)
        return false
    }

    addHost() {
        this.selectedEnviron = { ...this.editEnviron }
        this.environs.push(this.selectedEnviron)
        this.environs = [...this.environs]
        this.configService.writeEnvironments(this.environs)
    }

    saveHost() {
        const idx = this.environs.findIndex(env => env.name === this.selectedEnviron.name)
        this.environs[idx] = { ...this.editEnviron }
        this.environs = [...this.environs]
        this.configService.writeEnvironments(this.environs)
    }

    removeHost() {
        if (this.selectedEnviron) {
            const idx = this.environs.indexOf(this.selectedEnviron)
            this.environs.splice(idx, 1)
            this.environs = [...this.environs]
            // this.configService.writeEnvironments(this.environs)
        }
        console.log(this.environs)
    }

    ngOnInit() {
        console.log('HostConfigurationTab.onInit')
        this.environs = [...this.configService.getEnvironments() ]
        if (this.environs.length) {
            this.selectedEnviron = this.environs[0]
            this.editEnviron = {...this.selectedEnviron}
        } else {
            this.editEnviron = {
                name: '', host: '', query: '', default: false, writeable: false, user: '', pass: ''
            }
        }
    }
}

@Component({
    selector: 'generell-configuration-tab',
    templateUrl: './generell-configuration-tab.html',
    styleUrls: ['./settings-dialog.component.css'],

})

// @Injectable()
export class GenerellConfigurationTab implements OnInit {

    themes: SelectItem[] = [
        { value: 'bootsrap' }, { value: 'cruze' }, { value: 'cupertino' }, { value: 'darkness' }
        , { value: 'flick' }, { value: 'home' }, { value: 'kasper' }, { value: 'lightness' }
        , { value: 'ludvig' }, { value: 'luna-amber' }, { value: 'luna-blue' }, { value: 'luna-green' }
        , { value: 'luna-pink' }, { value: 'nova-colored' }, { value: 'nova-dark' }, { value: 'nova-light' }
        , { value: 'omega' }, { value: 'pepper-grinder' }, { value: 'redmond' }, { value: 'rhea' }, { value: 'rocket' }
        , { value: 'south-street' }, { value: 'start' }, { value: 'trontastic' }, { value: 'voclain' }
    ]

    selectedTheme: SelectItem

    constructor(private configService: ConfigService) {

    }

    changeTheme(event) {
        console.log(this.configService)
        this.configService.writeTheme(this.selectedTheme.value)
    }

    ngOnInit(): void {
        const configTheme = this.configService.getTheme()
        this.selectedTheme = this.themes.find(theme => theme.value === configTheme)
        // console.log('selectedTheme', theme, this.selectedTheme)
    }
}

@Component({
    templateUrl: './settings-dialog.component.html',
    styleUrls: ['./settings-dialog.component.css'],
    providers: [HostConfigurationTab]
})

export class SettingsDialogComponent implements OnInit {

    // Modification = etcd_service.Modification
    display = true
    selectedEnviron: Environment
    editEnviron: Environment
    environs: Environment[]

    constructor(
        public config: DynamicDialogConfig
        , private configService: ConfigService) {

    }

    showDialog() {
        this.display = true
    }
    ngOnInit(): void {
    }
}
