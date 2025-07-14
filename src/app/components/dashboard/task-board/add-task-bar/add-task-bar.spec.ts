import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTaskBar } from './add-task-bar';

describe('AddTaskBar', () => {
  let component: AddTaskBar;
  let fixture: ComponentFixture<AddTaskBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTaskBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddTaskBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
