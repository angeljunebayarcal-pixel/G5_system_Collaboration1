import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsSidenav } from './ofs-sidenav';

describe('OfsSidenav', () => {
  let component: OfsSidenav;
  let fixture: ComponentFixture<OfsSidenav>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsSidenav]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsSidenav);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
