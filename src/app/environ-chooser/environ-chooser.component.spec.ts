import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EnvironChooserComponent } from './environ-chooser.component';

describe('EnvironChooserComponent', () => {
  let component: EnvironChooserComponent;
  let fixture: ComponentFixture<EnvironChooserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EnvironChooserComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EnvironChooserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
