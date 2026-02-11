import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsHome } from './ofs-home';

describe('OfsHome', () => {
  let component: OfsHome;
  let fixture: ComponentFixture<OfsHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
