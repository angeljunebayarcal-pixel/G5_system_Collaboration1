import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsProfile } from './ofs-profile';

describe('OfsProfile', () => {
  let component: OfsProfile;
  let fixture: ComponentFixture<OfsProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsProfile]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
