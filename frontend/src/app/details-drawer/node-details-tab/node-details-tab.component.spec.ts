import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeDetailsTabComponent } from './node-details-tab.component';

describe('NodeDetailsTabComponent', () => {
  let component: NodeDetailsTabComponent;
  let fixture: ComponentFixture<NodeDetailsTabComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NodeDetailsTabComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeDetailsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
