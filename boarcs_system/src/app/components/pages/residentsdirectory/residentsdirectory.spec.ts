import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Residentsdirectory } from './residentsdirectory';

describe('Residentsdirectory', () => {
  let component: Residentsdirectory;
  let fixture: ComponentFixture<Residentsdirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Residentsdirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Residentsdirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
