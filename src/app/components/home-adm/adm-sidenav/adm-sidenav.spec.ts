import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmSidenav } from './adm-sidenav';

describe('AdmSidenav', () => {
  let component: AdmSidenav;
  let fixture: ComponentFixture<AdmSidenav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmSidenav]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmSidenav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
