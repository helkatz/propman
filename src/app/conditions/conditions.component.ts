import { Component, ComponentRef, Injector, OnInit, ViewContainerRef, ViewChild
  , ComponentFactoryResolver, Type, Input, NgModule, Query } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { jqxComboBoxModule }   from 'jqwidgets-ng/jqxcombobox';
import { QueryBuilderModule, QueryBuilderConfig, RuleSet} from "angular2-query-builder";
import { PropertiesService } from '../services/properties.service';
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
  providers: []
})


export class ConditionsComponent implements OnInit {
  query: RuleSet;
  selected: string
  config: QueryBuilderConfig

  constructor(private propertiesService: PropertiesService) {

  }

  toObjects(from) {
    if(from instanceof String || from instanceof Number) {
      return [{
        name: from,
        value: from
      }]
    }
    return from.map(o => {
      if(o instanceof Object)
        return o;
      else {
        return {
          name: o,
          value: o
        }        
      }  
    })
  }
  transformOperators(operators) {
    return operators.map(o => {
      return {
        value: o,
        name: o
      }
    })
  }
  print(msg) {
    console.log(msg)
  }

  loadQuery(query: RuleSet) {
    console.log(query)
    this.query = {...query}
  }

  async addFilters() {

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
        IdChecked: {name: 'IdChecked', type: 'boolean'},
        PaymentData: {name: 'PaymentData', type: 'boolean'},
      }
    }

    const juriSettings = await Database.queryDb("customer", 
            "select name, ID from jurisdictions_settingtypes")
    juriSettings.forEach(res => {
      console.log(res)
      this.config.fields[res.name] = {
        entity: 'jurisdictionSettings',
        name: res.name,
        type: 'number'
      }
    })
    this.config = {...this.config}
    console.log(this.config.fields)
    // this.config = {...this.config}
  }
  async ngOnInit() {
    await this.addFilters()
    this.propertiesService.watchRules.subscribe(rule => {
      this.query = rule.query
      // this.loadQuery(rule.query)
    })
  }
}


@NgModule({
  imports: [
    BrowserModule, 
    jqxComboBoxModule, QueryBuilderModule, FormsModule, ReactiveFormsModule
    , CheckboxModule, MultiSelectModule, DropdownModule, ButtonModule, InputTextModule
    , MatButtonModule, MatSelectModule, MatFormFieldModule],
  declarations: [ConditionsComponent, MyQueryBuilderComponent, RulesetComponent, RuleComponent],
  exports: [ConditionsComponent]
})
export class ConditionsModule {

}
