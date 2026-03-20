import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmSettings } from './adm-settings';

describe('AdmSettings', () => {
  let component: AdmSettings;
  let fixture: ComponentFixture<AdmSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
