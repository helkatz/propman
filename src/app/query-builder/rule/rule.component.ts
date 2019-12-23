import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { QueryBuilderConfig, MyQueryBuilderComponent, Field, Rule, Operator, Option } from '../query-builder.component';
import { SelectItem } from 'primeng/api';
import { SelectorFlags } from '@angular/compiler/src/core';
import { Button } from 'primeng/primeng';

@Component({
  selector: 'query-builder-rule',
  templateUrl: './rule.component.html',
  styleUrls: ['./rule.component.scss']
})
export class RuleComponent implements OnInit {

  @Input() queryBuilder: MyQueryBuilderComponent
  @Input() rule: Rule

  // @ViewChild("buttonCondition", {static: false}) buttonCondition: Button

  fields: Field[]
  selectedField: Field

  operators: SelectItem[]
  selectedOperator: SelectItem

  selectedValues: any[]

  log(...args: any) {
    console.log(args)
  }

  get field() {
    const field = this.queryBuilder.config.fields[this.rule.field]
    // console.log("field", field)
    return field

  }

  selectField(field: Field) {
    this.rule.field = field.name
    // this.rule.value = undefined
    // if(field.type === "multiselect") {
    //   this.value = 
    // }
    this.operators = this.queryBuilder.getOperators(this.field.type).map(op => {
      return {
        name: op,
        value: op
      }
    })

  }

  onFieldChange(event) {
    this.rule.value = this.field.defaultValue
    this.selectField(event.value)
  }

  onOperatorChange(event) {
    const operator: Operator = event.value
    this.rule.operator = operator
  }

  onValuesChange(event) {
    console.log(event.value)
  }
  constructor() { }

  ngOnInit() {
    console.log("rule", this.rule)
    if(this.field.type === "multiselect") {
      console.log("multiselect")
      this.selectedValues = this.rule.value.map(rv => {
        const option = this.field.options.find(fo => fo.value === rv)
        console.log("found option", option)
        if(option) 
          return option
      })
    }
    this.fields = Object.keys(this.queryBuilder.config.fields).map(k => {
      return this.queryBuilder.config.fields[k]
      // return {
      //   name: this.queryBuilder.config.fields[k].name,
      //   value: this.queryBuilder.config.fields[k].value
      // }
    })
    this.selectedField = this.field //this.fields.find(f => f.name === this.field.name)
    this.selectField(this.field)
  }

}
