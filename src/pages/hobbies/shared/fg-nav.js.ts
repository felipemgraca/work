import nav from '../../../data/nav.json';
import template from '../../../data/fg-nav.template.js?raw';

// Generated from src/data/nav.json so the dashboard pages share the site navbar.
export function GET() {
  return new Response(template.replace('__NAV__', JSON.stringify(nav)), {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
  });
}
