import { Component, ComponentRef, Injector, OnInit, ViewContainerRef, ViewChild
  , ComponentFactoryResolver, Type, Input, NgModule, Query, Pipe, PipeTransform } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { jqxComboBoxModule }   from 'jqwidgets-ng/jqxcombobox';
import * as qb from "angular2-query-builder";
import { PropertiesService, Rule } from '../services/properties.service';
import { CheckboxModule, MultiSelectModule, DropdownModule, ButtonModule, InputTextModule } from 'primeng/primeng';
import { ValueConverter } from '@angular/compiler/src/render3/view/template';
import { MatSelectModule, MatButtonModule } from '@angular/material';
import { MatFormFieldModule } from '@angular/material';
import { BrowserModule } from '@angular/platform-browser';
import { MyQueryBuilderComponent } from '../query-builder/query-builder.component';
import { RulesetComponent } from '../query-builder/ruleset/ruleset.component';
import { RuleComponent } from '../query-builder/rule/rule.component';
import { Database } from '../lib/database';

type FilterType = "string" | "boolean" | "number" | "category" 
interface Filter {
  name: string
  type: FilterType
  
}
@Component({
  selector: 'app-conditions',
  templateUrl: './conditions.component.html',
  styleUrls: ['./conditions.component.scss'],
  providers: []
})


export class ConditionsComponent implements OnInit {
  query: qb.RuleSet;
  selected: string
  config: qb.QueryBuilderConfig
  classNames: qb.QueryBuilderClassNames = {
    treeContainer: "tree-container"
  }
  @ViewChild("queryBuilder", {static: false}) queryBuilder: qb.QueryBuilderComponent

  constructor(private propertiesService: PropertiesService) {
  }
  log(...msg: any[]) {
    console.log(msg)
  }

  async addFilters() {

    this.config = {
      entities: {}, fields: {}
    }
    this.config = {
      entities: {
        Simple: {
          name: "Simple",
          value: "simple"
        },
        UserSettings: {
          name: "UserSettings",
          value: "userSettings"        
        },
        JurisdictionSettings: {
          name: "JurisdictionSettings",
          value: "jurisdictionSettings"        
        }        
      },
      fields: {
        UserBrand: {
          entity: 'simple',
          name: 'UserBrand', 
          type: 'category',
          options: await Database.queryDb("customer", 
            "select name, value from maps where `group`='brands'")
        },
        UserCountry: {
          entity: 'simple',
          name: 'UserCountry',
          type: 'category',
          options: await Database.queryDb("customer", 
            "select c_country as name, i_countries as value from countries")
        },
        UserLicense: {
          entity: 'simple',
          name: 'UserLicense', 
          type: 'category',
          options: await Database.queryDb("customer", 
            "select name, value from maps where `group`='license'")
        },
        Platform: {
          entity: 'simple',
          name: 'Platform', 
          type: 'category',
          options: await Database.queryDb("customer", 
            "select name, value from maps where `group`='platform'")
        },        
        Jurisdiction: {
          entity: 'simple',
          name: 'Jurisdiction', 
          type: 'category',
          options: await Database.queryDb("customer", 
            "select concat(id, ' ', name) as name, id from jurisdictions")
        }, 
        IsTemporaryAccount: {name: 'IsTemporaryAccount', type: 'boolean'},
        HasIdChecked: {
          entity: 'simple',
          name: 'IdChecked', 
          type: 'boolean'
        },
        HasPaymentData: {
          entity: 'simple',
          name: 'PaymentData', 
          type: 'boolean'
        },
      }
    }

    const juriSettings = await Database.queryDb("customer", 
            "select name, ID from jurisdictions_settingtypes")
    juriSettings.forEach(res => {
      // console.log(res)
      this.config.fields[res.name] = {
        entity: 'jurisdictionSettings',
        name: res.name,
        type: 'number'
      }
    })

    const settings = await Database.queryDb("customer", 
            "select c_tag name, i_settings id from settings")
    settings.forEach(res => {
      // console.log(res)
      this.config.fields[res.name] = {
        entity: 'userSettings',
        name: res.name,
        type: 'number'
      }
    })

    this.config = {...this.config}
    // console.log(this.config.fields)
    // this.config = {...this.config}
  }

  onChangeEntity(rule: qb.Rule, event) {
    console.log("onChangeEntity", rule, event)
    rule.entity = event.value.value
  }
  
  onChangeField(rule: qb.Rule, event) {
    console.log("onChangeField", rule, event)
    rule.field = event.value.value
    // this.queryBuilder.getOperators()    
  }
  
  onChangeOperator(rule: qb.Rule, event) {
    console.log("onChangeOperator", rule, event)
    rule.operator = event.value.value
  }

  selectConditions(rule: Rule) {
    if(!rule) return
    const iterateRuleset = (ruleset: qb.RuleSet) => {
      rule.query.get().rules.forEach(r => {
        if(rule['condition'] !== undefined) {
          iterateRuleset(r as qb.RuleSet)
        } else {
          const rule = r as qb.Rule
          console.log("rule", rule)
          delete rule['selectedEntity']
          delete rule['selectedField']
        }
      })
    }
    // iterateRuleset(rule.query.get())
    this.query = rule.query.get()

  }

  async ngOnInit() {
    console.log("onInit", this)

    await this.addFilters()
    this.selectConditions(this.propertiesService.getSelectedRule())
    this.propertiesService.watchRules.subscribe(rule => {
      this.selectConditions(rule)
    })
  }
}

@Pipe({
  name: 'filterByEntity',
  pure: true
})

export class FilterByEntityPipe implements PipeTransform {
  transform(items: qb.Field[], entity: string): any {
      // console.log(items, term)
      return items.filter(item => item.entity == entity);
  }
}

@NgModule({
  imports: [
    BrowserModule, 
    jqxComboBoxModule, qb.QueryBuilderModule, FormsModule, ReactiveFormsModule
    , CheckboxModule, MultiSelectModule, DropdownModule, ButtonModule, InputTextModule
    , MatButtonModule, MatSelectModule, MatFormFieldModule],
  declarations: [ConditionsComponent, MyQueryBuilderComponent
    , RulesetComponent, RuleComponent, FilterByEntityPipe],
  exports: [ConditionsComponent]
})
export class ConditionsModule {

}
