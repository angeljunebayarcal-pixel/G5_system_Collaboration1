import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmTopbar } from './adm-topbar';

describe('AdmTopbar', () => {
  let component: AdmTopbar;
  let fixture: ComponentFixture<AdmTopbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmTopbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmTopbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
