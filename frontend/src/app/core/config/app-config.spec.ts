import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { AppConfig } from './app-config';

describe('AppConfig', () => {
  let config: AppConfig;

  beforeEach(() => {
    config = TestBed.inject(AppConfig);
  });

  it('exposes the environment values', () => {
    expect(config.contentfulSpaceId).toBe(environment.contentfulSpaceId);
    expect(config.contentfulEnvironmentId).toBe(environment.contentfulEnvironmentId);
    expect(config.contentfulDeliveryToken).toBe(environment.contentfulDeliveryToken);
    expect(config.apiBaseUrl).toBe(environment.apiBaseUrl);
  });

  it('exposes only the four expected values, so no other credential can reach the browser', () => {
    expect(Object.keys(config).sort()).toEqual([
      'apiBaseUrl',
      'contentfulDeliveryToken',
      'contentfulEnvironmentId',
      'contentfulSpaceId',
    ]);
    expect(Object.keys(config).some((key) => /management/i.test(key))).toBe(false);
  });

  it('is a single shared instance', () => {
    expect(TestBed.inject(AppConfig)).toBe(config);
  });
});
