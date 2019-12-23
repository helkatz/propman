import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MessageService {
    private subject = new Subject<any>();

    sendMessage(tag: string, data: any) {
        this.subject.next({ tag, data });
    }

    clearMessages() {
        this.subject.next();
    }

    messages(): Observable<any> {
        return this.subject.asObservable();
    }
}