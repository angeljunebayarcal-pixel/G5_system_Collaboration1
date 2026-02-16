import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsCreateResidentsProfile } from './ofs-create-residents-profile';

describe('OfsCreateResidentsProfile', () => {
  let component: OfsCreateResidentsProfile;
  let fixture: ComponentFixture<OfsCreateResidentsProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsCreateResidentsProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsCreateResidentsProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
