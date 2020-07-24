import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { NodeOperationsComponent } from './node-operations.component';

describe('NodeOperationsComponent', () => {
  let component: NodeOperationsComponent;
  let fixture: ComponentFixture<NodeOperationsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NodeOperationsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeOperationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
