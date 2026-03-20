import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeAdm } from './home-adm';

describe('HomeAdm', () => {
  let component: HomeAdm;
  let fixture: ComponentFixture<HomeAdm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeAdm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeAdm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
