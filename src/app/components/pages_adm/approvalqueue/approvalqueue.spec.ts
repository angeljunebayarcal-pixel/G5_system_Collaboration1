import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Approvalqueue } from './approvalqueue';

describe('Approvalqueue', () => {
  let component: Approvalqueue;
  let fixture: ComponentFixture<Approvalqueue>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Approvalqueue]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Approvalqueue);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
