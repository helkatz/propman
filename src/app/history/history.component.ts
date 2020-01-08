import { Component, OnInit } from '@angular/core';

interface Hisotry {
  id: number
  modified: Date
}
@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {

  history: Hisotry[];

  cols: any[] = [
    {field: "id", header: "Id"},
    {field: "date", header: "Date"}
  ]


  constructor() { }

  ngOnInit() {
  }

}
