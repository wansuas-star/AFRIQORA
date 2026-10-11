/**
 * AFRIQORA Government Investigative Intelligence Platform
 * Stage 1: Core Type Definitions & Role Enumerations
 */

export type GovernmentRole =
  | 'GOV_ADMIN'
  | 'SENIOR_INVESTIGATOR'
  | 'INVESTIGATOR'
  | 'EVIDENCE_REVIEWER'
  | 'FORENSICS_OFFICER'
  | 'MUNICIPALITY_ADMIN'
  | 'CAMERA_NETWORK_ADMIN'
  | 'AUDITOR';

export type ClearanceLevel =
  | 'STANDARD'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'SECRET';

export type CaseClassification =
  | 'STANDARD'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'HIGHLY_RESTRICTED';

export type CaseStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'EVIDENCE_PENDING'
  | 'COURT_SUBMITTED'
  | 'CLOSED'
  | 'ARCHIVED';

export type InvestigationType =
  | 'serious_crime'
  | 'corruption'
  | 'missing_persons'
  | 'public_safety'
  | 'organized_crime'
  | 'fraud'
  | 'environmental';

export type IntegrationCategory =
  | 'CCTV'
  | 'DIGITAL_FORENSICS'
  | 'MOBILE_FORENSICS'
  | 'SATELLITE'
  | 'GOV_DATABASE'
  | 'TELECOM_LOCATION';

export type IntegrationStatus =
  | 'DISABLED'
  | 'CONFIGURED'
  | 'AUTHORIZED'
  | 'ACTIVE'
  | 'SUSPENDED';

export type EvidenceSourceType =
  | 'CCTV_FOOTAGE'
  | 'MOBILE_FORENSICS'
  | 'COMPUTER_FORENSICS'
  | 'SATELLITE_EO'
  | 'GOV_DATABASE';

export type ChainOfCustodyAction =
  | 'INGESTED'
  | 'VIEWED'
  | 'EXPORTED'
  | 'ANALYZED'
  | 'DERIVED_COPY'
  | 'SEALED';

export type GovernmentAuditAction =
  | 'CASE_CREATED'
  | 'CONNECTOR_QUERIED'
  | 'EVIDENCE_ACCESSED'
  | 'EXPORTED'
  | 'EMERGENCY_OVERRIDE'
  | 'PERMISSIONS_MODIFIED';

export interface EpistemicInvestigationDossier {
  caseId: string;
  caseNumber: string;
  title: string;
  classification: CaseClassification;
  leadOfficerBadge: string;
  observedFacts: string[];
  detectedFindings: string[];
  inferredConclusions: string[];
  uncertainties: string[];
  evidenceReferences: string[];
  isSealed: boolean;
  generatedAt: Date;
}
