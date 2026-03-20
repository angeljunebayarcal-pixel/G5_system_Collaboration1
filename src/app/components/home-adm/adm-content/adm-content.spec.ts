import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdmContent } from './adm-content';

describe('AdmContent', () => {
  let component: AdmContent;
  let fixture: ComponentFixture<AdmContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdmContent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdmContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
