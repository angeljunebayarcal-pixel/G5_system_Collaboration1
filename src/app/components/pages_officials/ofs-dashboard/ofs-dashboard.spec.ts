import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsDashboard } from './ofs-dashboard';

describe('OfsDashboard', () => {
  let component: OfsDashboard;
  let fixture: ComponentFixture<OfsDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
