import { Component, OnInit, Input } from '@angular/core';
import { MyQueryBuilderComponent, RuleSet, Rule } from '../query-builder.component';


@Component({
  selector: 'query-builder-ruleset',
  templateUrl: './ruleset.component.html',
  styleUrls: ['./ruleset.component.scss']
})
export class RulesetComponent implements OnInit {
  @Input() queryBuilder: MyQueryBuilderComponent
  @Input() ruleSet: RuleSet
  constructor() { }

  onAddRule(event) {
    const rule: Rule = {field: this.queryBuilder.config.defaultField}
    this.ruleSet.rules.push(rule)
  }

  onAddRuleset(event) {
    const ruleSet: RuleSet = {condition: "and", rules:[]}
    this.ruleSet.rules.push(ruleSet)
  }

  ngOnInit() {
  }

}
