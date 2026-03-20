import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Controlcenter } from './controlcenter';

describe('Controlcenter', () => {
  let component: Controlcenter;
  let fixture: ComponentFixture<Controlcenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Controlcenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Controlcenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
