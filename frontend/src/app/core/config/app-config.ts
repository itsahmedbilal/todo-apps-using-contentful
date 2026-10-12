import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * The only way the app reads environment values. It exposes the read-only Contentful Delivery token
 * and nothing more: a Management token must never reach the browser.
 */
@Injectable({ providedIn: 'root' })
export class AppConfig {
  readonly contentfulSpaceId: string = environment.contentfulSpaceId;
  readonly contentfulEnvironmentId: string = environment.contentfulEnvironmentId;
  readonly contentfulDeliveryToken: string = environment.contentfulDeliveryToken;
  readonly apiBaseUrl: string = environment.apiBaseUrl;
}
