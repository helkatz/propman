import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { map, catchError } from "rxjs/operators";

//@Injectable()
export class LoggerService {
    constructor(
        private http: HttpClient) {
        
    }
    trace = (...args: any) => {
        console.log(...args)
        let url = 'http://localhost:3000/jslogger/log'
        let headers = new HttpHeaders();
        headers = headers
            .append('Content-Type', 'application/json')
            .append('Access-Control-Allow-Origin', '*');
        
        let body = {
            error: "the message"
        };        
        //params = params.append("recursive", "1")         
        console.log("body", body)
        return this.http.post(url, body, { headers: headers })
            .subscribe()
    }
}