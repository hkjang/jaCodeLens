/**
 * Self-Analysis Module
 * 
 * 서비스가 스스로를 분석하고 개선하는 기능을 제공합니다.
 */

export { selfProjectService, SelfProjectService } from './self-project-service';
export { triggerService, TriggerService } from './trigger-service';
export { policyService, PolicyService, type PolicyValidationResult, type PolicyViolation, type PolicyWarning } from './policy-service';
export { baselineService, BaselineService, type ComparisonResult } from './baseline-service';
export { automationService, AutomationService, type ReleaseDecision } from './automation-service';
export { feedbackLoop, FeedbackLoop, type FeedbackResult } from './feedback-loop';
