import { Component, OnInit, Input } from '@angular/core';
import { AComponent } from '../a/a.component';

@Component({
  selector: 'app-b',
  templateUrl: './b.component.html',
  styleUrls: ['./b.component.scss']
})
export class BComponent implements OnInit {
  @Input() a: AComponent
  constructor() { }

  ngOnInit() {
  }

}
