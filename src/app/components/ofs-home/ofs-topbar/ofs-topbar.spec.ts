import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsTopbar } from './ofs-topbar';

describe('OfsTopbar', () => {
  let component: OfsTopbar;
  let fixture: ComponentFixture<OfsTopbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsTopbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsTopbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
