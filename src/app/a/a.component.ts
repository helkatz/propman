import { Component, OnInit, Input } from '@angular/core';
import { BComponent } from '../b/b.component';

@Component({
  selector: 'app-a',
  templateUrl: './a.component.html',
  styleUrls: ['./a.component.scss']
})
export class AComponent implements OnInit {
  @Input() b: BComponent
  constructor() { }

  ngOnInit() {
  }

}
