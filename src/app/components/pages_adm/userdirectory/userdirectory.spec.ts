import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Userdirectory } from './userdirectory';

describe('Userdirectory', () => {
  let component: Userdirectory;
  let fixture: ComponentFixture<Userdirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Userdirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Userdirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
