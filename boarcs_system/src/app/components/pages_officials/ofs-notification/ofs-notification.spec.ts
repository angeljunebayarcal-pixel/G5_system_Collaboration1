import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfsNotification } from './ofs-notification';

describe('OfsNotification', () => {
  let component: OfsNotification;
  let fixture: ComponentFixture<OfsNotification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfsNotification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfsNotification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
