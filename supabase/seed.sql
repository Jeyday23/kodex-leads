-- Seed data for local development / Playwright testing
-- All leads start unclaimed. The test worker creates a partner and claims some.

-- Qualified leads with various signals
insert into leads (id, company, email, source, score, status, uses_ai, team_size, funding_stage)
values
  ('10000000-0000-0000-0000-000000000001', 'NeuralForge GmbH', 'info@neuralforge.de', 'scraper_ai', 87, 'qualified', true, '51-200', 'series-a'),
  ('10000000-0000-0000-0000-000000000002', 'DataShield AG', 'info@datashield.eu', 'scraper_startups', 72, 'qualified', true, '11-50', 'seed'),
  ('10000000-0000-0000-0000-000000000003', 'CompliBot UG', 'info@complibot.io', 'scraper_jobs', 65, 'qualified', false, '1-10', 'pre-seed'),
  ('10000000-0000-0000-0000-000000000004', 'LegalTech Solutions', 'kontakt@legaltech-sol.de', 'assessment_eu_ai_act', 91, 'qualified', true, '200+', 'series-b'),
  ('10000000-0000-0000-0000-000000000005', 'CloudGuard Systems', 'hello@cloudguard.com', 'organic', 58, 'qualified', false, '11-50', 'unknown'),
  ('20000000-0000-0000-0000-000000000001', 'AIvidence Labs', 'team@aividence.io', 'scraper_ai', 82, 'qualified', true, '11-50', 'seed'),
  ('20000000-0000-0000-0000-000000000002', 'PrivacyFirst GmbH', 'info@privacyfirst.de', 'scraper_startups', 76, 'qualified', false, '51-200', 'unknown'),
  ('20000000-0000-0000-0000-000000000003', 'RiskRadar OHG', 'hello@riskradar.eu', 'scraper_jobs', 69, 'qualified', true, '1-10', 'pre-seed'),
  ('20000000-0000-0000-0000-000000000004', 'TrustLayer AG', 'contact@trustlayer.com', 'assessment_gdpr', 94, 'qualified', true, '200+', 'series-b'),
  ('20000000-0000-0000-0000-000000000005', 'SafeAI Consulting', 'info@safeai.consulting', 'assessment_frameworks', 55, 'qualified', false, '11-50', 'unknown');

-- Contacts for some leads (decision makers)
insert into contacts (lead_id, name, title, email, linkedin_url, enrichment_source)
values
  ('20000000-0000-0000-0000-000000000001', 'Dr. Anna Weber', 'Chief Technology Officer', 'a.weber@aividence.io', 'https://linkedin.com/in/anna-weber', 'apollo'),
  ('20000000-0000-0000-0000-000000000001', 'Jonas Richter', 'Data Protection Officer', 'j.richter@aividence.io', 'https://linkedin.com/in/jonas-richter', 'apollo'),
  ('20000000-0000-0000-0000-000000000002', 'Maria Hoffmann', 'Head of Legal', 'm.hoffmann@privacyfirst.de', null, 'hunter'),
  ('20000000-0000-0000-0000-000000000003', 'Thomas Braun', 'CEO & Founder', 't.braun@riskradar.eu', 'https://linkedin.com/in/thomas-braun', 'apollo'),
  ('20000000-0000-0000-0000-000000000004', 'Sabine Keller', 'VP Engineering', 's.keller@trustlayer.com', 'https://linkedin.com/in/sabine-keller', 'apollo'),
  ('20000000-0000-0000-0000-000000000004', 'Markus Stein', 'General Counsel', 'm.stein@trustlayer.com', null, 'hunter'),
  ('20000000-0000-0000-0000-000000000004', 'Prof. Klaus Zimmermann', 'Data Protection Officer', 'k.zimmermann@trustlayer.com', 'https://linkedin.com/in/klaus-zimmermann', 'apollo'),
  ('10000000-0000-0000-0000-000000000001', 'Lisa Neumann', 'CTO', 'l.neumann@neuralforge.de', 'https://linkedin.com/in/lisa-neumann', 'apollo'),
  ('10000000-0000-0000-0000-000000000001', 'Michael Frey', 'Data Protection Officer', 'm.frey@neuralforge.de', null, 'hunter'),
  ('10000000-0000-0000-0000-000000000002', 'Sarah Berger', 'Founder & CEO', 's.berger@datashield.eu', 'https://linkedin.com/in/sarah-berger', 'apollo'),
  ('10000000-0000-0000-0000-000000000004', 'Dr. Peter Lange', 'Head of Legal', 'p.lange@legaltech-sol.de', 'https://linkedin.com/in/peter-lange', 'apollo');
