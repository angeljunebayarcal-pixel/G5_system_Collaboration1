import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmProfile } from './adm-profile';

describe('AdmProfile', () => {
  let component: AdmProfile;
  let fixture: ComponentFixture<AdmProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
