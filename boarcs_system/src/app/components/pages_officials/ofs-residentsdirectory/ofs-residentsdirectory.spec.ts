import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsResidentsdirectory } from './ofs-residentsdirectory';

describe('OfsResidentsdirectory', () => {
  let component: OfsResidentsdirectory;
  let fixture: ComponentFixture<OfsResidentsdirectory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsResidentsdirectory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsResidentsdirectory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
