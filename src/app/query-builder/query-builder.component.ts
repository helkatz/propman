import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Fieldset } from 'primeng/primeng';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

export type Type = "multiselect" | "select" | "string" | "number" | "boolean"
namespace operators {
  export interface EQ { name: "Equal", op: "="}
  export interface NOTEQ { name: "Not Equal", op: "!="}
  export interface GT { name: "Greater Then", op: ">"}
  export interface LT { name: "Less Then", op: "<"}
  export interface IN { name: "In", op: "in"}
  export interface NOTIN { name: "Not In", op: "notin"}
}
export type Operator = "in" | "notin" | "<" | ">" | "=" | "!=" | "<=" | ">=" | "<>"
// export type Operator = operators.EQ | NOTEQ

export type Condition = "and" | "or"


export interface Rule {
  field?: string
  operator?: Operator
  value?: any | any[]
}

export interface RuleSet {
  condition?: Condition
  rules?: Array<RuleSet | Rule>
}

export interface Option {
  name: string;
  value: any;
}

export interface Field {
  name: string
  type: Type
  value?: string | number
  defaultValue?: string | number | any[]
  options?: Option[]
}

export interface FieldMap {
  [key: string]: Field;
}

export interface OperatorMap {
  [key: string]: Operator;
}

export interface QueryBuilderConfig {
  fields: FieldMap;
  defaultField: string
}

@Component({
  selector: 'app-query-builder',
  templateUrl: './query-builder.component.html',
  styleUrls: ['./query-builder.component.scss'],
  providers:[    { provide: NG_VALUE_ACCESSOR, useExisting: MyQueryBuilderComponent, multi: true }]
})
export class MyQueryBuilderComponent implements OnInit {

  config: QueryBuilderConfig = {
    
    fields: {
      UserBrand: {name: 'UserBrand', type: 'number'},
      UserCountry: {
        name: 'UserCountry',
        type: "multiselect",
        options: [
          {name: 'Austria', value: 14},
          {name: 'German', value: 82}
        ]
      },
      UserLicense: {name: 'UserLicense', type: 'number'},
      IsTemporaryAccount: {name: 'IsTemporaryAccount', type: 'boolean'},
      IdChecked: {name: 'IdChecked', type: 'boolean'},
      PaymentData: {name: 'PaymentData', type: 'boolean'},
    },
    defaultField: "UserBrand"
  }
   
  ruleSet: RuleSet = {
    condition: "and",
    rules: [
      {
        field: "UserBrand",
        operator: "=",
        value: 1
      },
      {
        field: "UserCountry",
        operator: "in",
        value: [14,82]
      }
    ]
  }

  constructor() { }

  getOperators(type: Type): Operator[] {
    switch(type) {
      case "boolean": return ["="]
      case "number": return ["<", ">", "<=", ">=", "="]
      case "multiselect": return ["in", "notin"]
      case "string": return ["=", "!="]
    }
  }

  ngOnInit() {
    console.log("OnInit", this)
  }

}
