import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsSettings } from './ofs-settings';

describe('OfsSettings', () => {
  let component: OfsSettings;
  let fixture: ComponentFixture<OfsSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
