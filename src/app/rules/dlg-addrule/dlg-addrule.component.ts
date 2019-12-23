import { Component, OnInit } from '@angular/core';


export class DlgAddRuleParams
{
  groupName: string
  description: string
  inheritFromParent: boolean
}

@Component({
  selector: 'app-dlg-addrule',
  templateUrl: './dlg-addrule.component.html',
  styleUrls: ['./dlg-addrule.component.scss']
})
export class DlgAddruleComponent implements OnInit {

  params: DlgAddRuleParams = new DlgAddRuleParams
  
  accept = (params: DlgAddRuleParams) => {}
  cancel = () => { this.setVsible(false) }

  constructor() { }

  display: boolean = false;

  setVsible(visible: boolean) {
      this.display = visible;
  }
  

  ngOnInit() {
  }

}
