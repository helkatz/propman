import { Component, OnInit, Output, EventEmitter, Injectable } from '@angular/core'
import { SelectItem } from 'primeng/api'
import { Environment, ConfigService } from '../services/config.service'
import { Subject, Subscription } from 'rxjs';

type MessageCallback = (payload: any) => void;

@Injectable()
export class EnvironChooserService {
    private handler = new Subject<Environment[]>();
    broadcast() {
        this.handler.next()
    }
    subscribe(callback: MessageCallback): Subscription {
        return this.handler.subscribe(callback)
    }
}

@Component({
    selector: 'app-environ-chooser',
    templateUrl: './environ-chooser.component.html',
    styleUrls: ['./environ-chooser.component.css'],
    // providers: [ConfigService]
})

export class EnvironChooserComponent implements OnInit {

    environs: Environment[] = [];
    selectedEnvirons: Environment[] = [];

    constructor(
        private configService: ConfigService
    ) {
        this.configService.change.subscribe(name => {
            if (name !== 'environments')
                return
            console.log('EnvironChooserComponent.changed event received', this.configService.getEnvironments())

            this.environs = [...this.configService.getEnvironments()]

            this.selectedEnvirons = []
            // this.environs.findIndex(env => return env.name === this.selectedEnvirons)
        });
    }

    ngOnInit() {

        console.log('EnvironChooserComponent.ngOnInit')
        this.environs = this.configService.getEnvironments()
        this.configService.getEnvironments().forEach((environ, idx) => {
            if (environ.default)
                this.selectedEnvirons.push(environ)
        })
        // this.environChooser.broadcast()
    }
}
