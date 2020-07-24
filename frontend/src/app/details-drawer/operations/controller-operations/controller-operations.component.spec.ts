import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ControllerOperationsComponent } from './controller-operations.component';

describe('ControllerOperationsComponent', () => {
  let component: ControllerOperationsComponent;
  let fixture: ComponentFixture<ControllerOperationsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ControllerOperationsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ControllerOperationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
