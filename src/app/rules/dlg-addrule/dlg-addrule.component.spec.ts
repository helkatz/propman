import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DlgAddruleComponent } from './dlg-addrule.component';

describe('DlgAddruleComponent', () => {
  let component: DlgAddruleComponent;
  let fixture: ComponentFixture<DlgAddruleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DlgAddruleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DlgAddruleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
