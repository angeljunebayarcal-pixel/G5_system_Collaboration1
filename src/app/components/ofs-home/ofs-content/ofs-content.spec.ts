import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsContent } from './ofs-content';

describe('OfsContent', () => {
  let component: OfsContent;
  let fixture: ComponentFixture<OfsContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsContent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
