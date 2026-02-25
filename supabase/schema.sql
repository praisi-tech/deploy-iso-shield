-- ============================================================
-- ISO 27001 Platform - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'auditor', 'auditee');
CREATE TYPE asset_type AS ENUM ('hardware', 'software', 'data', 'service', 'personnel', 'facility');
CREATE TYPE asset_criticality AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE risk_level AS ENUM ('critical', 'high', 'medium', 'low', 'negligible');
CREATE TYPE exposure_level AS ENUM ('internet_facing', 'internal', 'restricted', 'air_gapped');
CREATE TYPE business_sector AS ENUM (
  'financial', 'healthcare', 'government', 'education', 
  'retail', 'manufacturing', 'technology', 'telecommunications', 'other'
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'auditee',
  avatar_url TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sector business_sector NOT NULL DEFAULT 'other',
  employee_count INTEGER,
  website TEXT,
  address TEXT,
  country TEXT DEFAULT 'Indonesia',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  system_types TEXT[] DEFAULT '{}',  -- web, mobile, cloud, on-premise, hybrid
  exposure_level exposure_level NOT NULL DEFAULT 'internal',
  risk_appetite TEXT CHECK (risk_appetite IN ('low', 'medium', 'high')) DEFAULT 'medium',
  scope_description TEXT,
  audit_period_start DATE,
  audit_period_end DATE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key from profiles to organizations
ALTER TABLE profiles ADD CONSTRAINT fk_organization 
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- ============================================================
-- ASSETS
-- ============================================================

CREATE TABLE assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type asset_type NOT NULL,
  owner TEXT,
  location TEXT,
  ip_address TEXT,
  version TEXT,
  vendor TEXT,
  
  -- CIA Triad Values (1-5)
  confidentiality INTEGER NOT NULL DEFAULT 3 CHECK (confidentiality BETWEEN 1 AND 5),
  integrity INTEGER NOT NULL DEFAULT 3 CHECK (integrity BETWEEN 1 AND 5),
  availability INTEGER NOT NULL DEFAULT 3 CHECK (availability BETWEEN 1 AND 5),
  
  -- Computed criticality score (avg of CIA * weights)
  criticality_score NUMERIC(4,2) GENERATED ALWAYS AS (
    ROUND((confidentiality * 0.4 + integrity * 0.35 + availability * 0.25)::NUMERIC, 2)
  ) STORED,
  
  criticality asset_criticality GENERATED ALWAYS AS (
    CASE 
      WHEN (confidentiality * 0.4 + integrity * 0.35 + availability * 0.25) >= 4.0 THEN 'critical'::asset_criticality
      WHEN (confidentiality * 0.4 + integrity * 0.35 + availability * 0.25) >= 3.0 THEN 'high'::asset_criticality
      WHEN (confidentiality * 0.4 + integrity * 0.35 + availability * 0.25) >= 2.0 THEN 'medium'::asset_criticality
      ELSE 'low'::asset_criticality
    END
  ) STORED,
  
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VULNERABILITIES (OWASP-based)
-- ============================================================

CREATE TABLE vulnerabilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owasp_id TEXT NOT NULL,  -- e.g., A01:2021
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cwe_ids TEXT[],
  base_likelihood INTEGER NOT NULL DEFAULT 3 CHECK (base_likelihood BETWEEN 1 AND 5),
  base_impact INTEGER NOT NULL DEFAULT 3 CHECK (base_impact BETWEEN 1 AND 5),
  remediation_guidance TEXT,
  references TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ASSET VULNERABILITIES (Risk Assessment)
-- ============================================================

CREATE TABLE asset_vulnerabilities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  vulnerability_id UUID REFERENCES vulnerabilities(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  
  -- Risk calculation inputs
  likelihood INTEGER NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  
  -- Computed risk score
  risk_score NUMERIC(4,2) GENERATED ALWAYS AS (
    ROUND((likelihood * impact)::NUMERIC, 2)
  ) STORED,
  
  risk_level risk_level GENERATED ALWAYS AS (
    CASE 
      WHEN (likelihood * impact) >= 20 THEN 'critical'::risk_level
      WHEN (likelihood * impact) >= 12 THEN 'high'::risk_level
      WHEN (likelihood * impact) >= 6 THEN 'medium'::risk_level
      WHEN (likelihood * impact) >= 2 THEN 'low'::risk_level
      ELSE 'negligible'::risk_level
    END
  ) STORED,
  
  -- Treatment
  treatment_option TEXT CHECK (treatment_option IN ('mitigate', 'accept', 'transfer', 'avoid')),
  treatment_notes TEXT,
  is_accepted BOOLEAN DEFAULT false,
  
  assessed_by UUID REFERENCES profiles(id),
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(asset_id, vulnerability_id)
);

-- ============================================================
-- SEED OWASP VULNERABILITIES
-- ============================================================

INSERT INTO vulnerabilities (owasp_id, name, description, category, base_likelihood, base_impact, remediation_guidance) VALUES
('A01:2021', 'Broken Access Control', 'Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of all data.', 'Access Control', 4, 5, 'Implement proper access control checks on all resources. Use deny-by-default. Log access control failures.'),
('A02:2021', 'Cryptographic Failures', 'Previously known as Sensitive Data Exposure. Failures related to cryptography which often lead to sensitive data exposure or system compromise.', 'Cryptography', 3, 5, 'Classify data processed, stored, or transmitted. Apply controls as per classification. Do not store sensitive data unnecessarily.'),
('A03:2021', 'Injection', 'SQL, NoSQL, OS, LDAP injection flaws occur when untrusted data is sent to an interpreter as part of a command or query.', 'Injection', 4, 5, 'Use parameterized queries. Validate and sanitize all inputs. Use stored procedures. Apply least privilege to database accounts.'),
('A04:2021', 'Insecure Design', 'A broad category representing different weaknesses expressed as missing or ineffective control design.', 'Design', 3, 4, 'Establish and use a secure development lifecycle. Use threat modeling. Integrate security requirements into user stories.'),
('A05:2021', 'Security Misconfiguration', 'The most commonly seen issue. Results from insecure default configurations, incomplete configs, open cloud storage, misconfigured HTTP headers.', 'Configuration', 4, 3, 'Implement a repeatable hardening process. Remove unused features. Review and update configurations. Use automated scanner.'),
('A06:2021', 'Vulnerable and Outdated Components', 'Components such as libraries, frameworks run with the same privileges as the application. Using vulnerable components can undermine defenses.', 'Components', 3, 4, 'Remove unused dependencies. Continuously inventory component versions. Monitor CVE databases. Subscribe to security bulletins.'),
('A07:2021', 'Identification and Authentication Failures', 'Confirmation of user identity, authentication, and session management is critical to protect against auth-related attacks.', 'Authentication', 3, 4, 'Implement MFA. Use strong password policies. Implement secure session management. Prevent credential stuffing.'),
('A08:2021', 'Software and Data Integrity Failures', 'Relates to code and infrastructure that does not protect against integrity violations. Including insecure deserialization.', 'Integrity', 2, 4, 'Use digital signatures to verify software. Ensure libraries and dependencies from trusted repositories. Use CI/CD pipeline with security checks.'),
('A09:2021', 'Security Logging and Monitoring Failures', 'Without logging and monitoring, breaches cannot be detected. Insufficient logging and monitoring allows attackers to further attack systems.', 'Monitoring', 3, 3, 'Ensure all login, access control, and input validation failures are logged. Establish monitoring and alerting. Create incident response plan.'),
('A10:2021', 'Server-Side Request Forgery (SSRF)', 'SSRF flaws occur whenever a web application is fetching a remote resource without validating the user-supplied URL.', 'Request Forgery', 3, 4, 'Sanitize and validate all client-supplied input data. Enforce URL schema, port, and destination with allowlist. Disable HTTP redirections.');

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Vulnerabilities: public read
CREATE POLICY "vulnerabilities_select" ON vulnerabilities FOR SELECT USING (true);

-- Organizations: members can read, admins can write
CREATE POLICY "org_select" ON organizations FOR SELECT 
  USING (id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_insert" ON organizations FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_update" ON organizations FOR UPDATE 
  USING (id IN (
    SELECT o.id FROM organizations o 
    JOIN profiles p ON p.organization_id = o.id 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

-- Assets: org members can CRUD
CREATE POLICY "assets_select" ON assets FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "assets_insert" ON assets FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "assets_update" ON assets FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "assets_delete" ON assets FOR DELETE 
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Asset vulnerabilities
CREATE POLICY "asset_vuln_select" ON asset_vulnerabilities FOR SELECT 
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "asset_vuln_insert" ON asset_vulnerabilities FOR INSERT 
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "asset_vuln_update" ON asset_vulnerabilities FOR UPDATE 
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "asset_vuln_delete" ON asset_vulnerabilities FOR DELETE 
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_asset_vuln_updated_at BEFORE UPDATE ON asset_vulnerabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_assets_org ON assets(organization_id);
CREATE INDEX idx_assets_criticality ON assets(criticality);
CREATE INDEX idx_asset_vuln_asset ON asset_vulnerabilities(asset_id);
CREATE INDEX idx_asset_vuln_org ON asset_vulnerabilities(organization_id);
CREATE INDEX idx_asset_vuln_risk ON asset_vulnerabilities(risk_level);
CREATE INDEX idx_profiles_org ON profiles(organization_id);
