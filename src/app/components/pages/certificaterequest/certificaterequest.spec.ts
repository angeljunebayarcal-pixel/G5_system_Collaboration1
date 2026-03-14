import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Certificaterequest } from './certificaterequest';

describe('Certificaterequest', () => {
  let component: Certificaterequest;
  let fixture: ComponentFixture<Certificaterequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Certificaterequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Certificaterequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
